import { Result, ok, err } from 'neverthrow';
import { map, find } from 'remeda';
import {
  getAllToolsMetadata,
  getAllResourcesMetadata,
  getAllPromptsMetadata,
  ToolMetadata,
  ResourceMetadata,
  PromptMetadata,
} from '../decorators/metadata.js';
import { generateToolSchema, generatePromptSchema, validateParams } from './schema.js';
import { InitializeResponse, Tool, Resource, Prompt, ToolCallResponse } from './protocol.js';
import { JsonRpcError, ErrorCodes } from './jsonrpc.js';

const ErrorMessages = {
  TOOL_NOT_FOUND: (name: string) => `Tool '${name}' not found`,
  RESOURCE_NOT_FOUND: (uri: string) => `Resource '${uri}' not found`,
  PROMPT_NOT_FOUND: (name: string) => `Prompt '${name}' not found`,
  METHOD_NOT_FOUND: (method: string) => `Method '${method}' not found`,
  EXECUTION_FAILED: 'Execution failed',
} as const;

export abstract class MCPServer {
  private tools: Map<string, ToolMetadata>;
  private resources: Map<string, ResourceMetadata>;
  private prompts: Map<string, PromptMetadata>;

  constructor(
    private serverName: string = 'MCP Server',
    private serverVersion: string = '1.0.0'
  ) {
    this.tools = getAllToolsMetadata(this.constructor);
    this.resources = getAllResourcesMetadata(this.constructor);
    this.prompts = getAllPromptsMetadata(this.constructor);
  }

  handleInitialize(): InitializeResponse {
    return {
      protocolVersion: '2025-06-18',
      capabilities: {
        tools: this.tools.size > 0 ? {} : undefined,
        resources: this.resources.size > 0 ? {} : undefined,
        prompts: this.prompts.size > 0 ? {} : undefined,
      },
      serverInfo: {
        name: this.serverName,
        version: this.serverVersion,
      },
    };
  }

  listTools(): Tool[] {
    return map(Array.from(this.tools.values()), (meta) =>
      generateToolSchema(meta.name, meta.description, meta.params)
    );
  }

  listResources(): Resource[] {
    return map(Array.from(this.resources.values()), (meta) => ({
      uri: meta.uri,
      name: meta.method,
      description: meta.description,
    }));
  }

  listPrompts(): Prompt[] {
    return map(Array.from(this.prompts.values()), (meta) =>
      generatePromptSchema(meta.name, meta.description, meta.params)
    );
  }

  async callTool(name: string, args?: any): Promise<Result<ToolCallResponse, JsonRpcError>> {
    const toolMeta = find(Array.from(this.tools.values()), (t) => t.name === name);

    if (!toolMeta) {
      return err(new JsonRpcError(ErrorCodes.METHOD_NOT_FOUND, ErrorMessages.TOOL_NOT_FOUND(name)));
    }

    const method = (this as any)[toolMeta.method];
    if (typeof method !== 'function') {
      return err(
        new JsonRpcError(ErrorCodes.INTERNAL_ERROR, ErrorMessages.METHOD_NOT_FOUND(toolMeta.method))
      );
    }

    // Validate parameters
    if (toolMeta.params && toolMeta.params.length > 0) {
      const validation = validateParams(toolMeta.params, args);
      if (!validation.success) {
        return err(
          new JsonRpcError(ErrorCodes.INVALID_PARAMS, 'Invalid parameters', validation.error.errors)
        );
      }
    }

    const argsArray = toolMeta.params ? toolMeta.params.map((p) => args?.[p.name]) : [];
    const result = await method.apply(this, argsArray);

    if (result && typeof result === 'object' && 'isOk' in result) {
      if (result.isErr()) {
        const errorMessage =
          typeof result.error === 'string'
            ? result.error
            : result.error.message || ErrorMessages.EXECUTION_FAILED;
        return err(new JsonRpcError(ErrorCodes.INTERNAL_ERROR, errorMessage));
      }
      const value = result.value;
      return ok({
        content: [
          {
            type: 'text',
            text: typeof value === 'string' ? value : JSON.stringify(value),
          },
        ],
      });
    }

    return ok({
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result),
        },
      ],
    });
  }

  async readResource(uri: string): Promise<Result<any, JsonRpcError>> {
    const resourceMeta = find(Array.from(this.resources.values()), (r) => r.uri === uri);

    if (!resourceMeta) {
      return err(
        new JsonRpcError(ErrorCodes.METHOD_NOT_FOUND, ErrorMessages.RESOURCE_NOT_FOUND(uri))
      );
    }

    const method = (this as any)[resourceMeta.method];
    if (typeof method !== 'function') {
      return err(
        new JsonRpcError(
          ErrorCodes.INTERNAL_ERROR,
          ErrorMessages.METHOD_NOT_FOUND(resourceMeta.method)
        )
      );
    }

    const result = await method.call(this);

    let resourceData: any;
    if (result && typeof result === 'object' && 'isOk' in result) {
      if (result.isErr()) {
        const errorMessage =
          typeof result.error === 'string'
            ? result.error
            : result.error.message || ErrorMessages.EXECUTION_FAILED;
        return err(new JsonRpcError(ErrorCodes.INTERNAL_ERROR, errorMessage));
      }
      resourceData = result.value;
    } else {
      resourceData = result;
    }

    return ok({
      contents: [
        {
          uri: uri,
          mimeType: 'application/json',
          text: typeof resourceData === 'string' ? resourceData : JSON.stringify(resourceData),
        },
      ],
    });
  }

  async getPrompt(name: string, args?: any): Promise<Result<any, JsonRpcError>> {
    const promptMeta = find(Array.from(this.prompts.values()), (p) => p.name === name);

    if (!promptMeta) {
      return err(
        new JsonRpcError(ErrorCodes.METHOD_NOT_FOUND, ErrorMessages.PROMPT_NOT_FOUND(name))
      );
    }

    const method = (this as any)[promptMeta.method];
    if (typeof method !== 'function') {
      return err(
        new JsonRpcError(
          ErrorCodes.INTERNAL_ERROR,
          ErrorMessages.METHOD_NOT_FOUND(promptMeta.method)
        )
      );
    }

    // Validate parameters
    if (promptMeta.params && promptMeta.params.length > 0) {
      const validation = validateParams(promptMeta.params, args);
      if (!validation.success) {
        return err(
          new JsonRpcError(ErrorCodes.INVALID_PARAMS, 'Invalid parameters', validation.error.errors)
        );
      }
    }

    const argsArray = promptMeta.params ? promptMeta.params.map((p) => args?.[p.name]) : [];
    const result = await method.apply(this, argsArray);

    if (result && typeof result === 'object' && 'isOk' in result) {
      if (result.isErr()) {
        const errorMessage =
          typeof result.error === 'string'
            ? result.error
            : result.error.message || ErrorMessages.EXECUTION_FAILED;
        return err(new JsonRpcError(ErrorCodes.INTERNAL_ERROR, errorMessage));
      }
      return ok(result.value);
    }

    return ok(result);
  }
}
