import { Result, ok, err } from 'neverthrow';
import { match } from 'ts-pattern';
import { MCPServer } from './server.js';
import { JsonRpcError, ErrorCodes, MessageHandler } from './jsonrpc.js';

export enum MCPMethod {
  INITIALIZE = 'initialize',
  TOOLS_LIST = 'tools/list',
  RESOURCES_LIST = 'resources/list',
  PROMPTS_LIST = 'prompts/list',
  TOOLS_CALL = 'tools/call',
  RESOURCES_READ = 'resources/read',
  PROMPTS_GET = 'prompts/get',
}

interface ToolCallParams {
  name: string;
  arguments?: any;
}

interface ResourceReadParams {
  uri: string;
}

interface PromptGetParams {
  name: string;
  arguments?: any;
}

const validateToolCall = (params: unknown): Result<ToolCallParams, JsonRpcError> => {
  const toolParams = params as ToolCallParams;
  if (!toolParams.name) {
    return err(new JsonRpcError(ErrorCodes.INVALID_PARAMS, 'Tool name is required'));
  }
  return ok(toolParams);
};

const validateResourceRead = (params: unknown): Result<ResourceReadParams, JsonRpcError> => {
  const resourceParams = params as ResourceReadParams;
  if (!resourceParams.uri) {
    return err(new JsonRpcError(ErrorCodes.INVALID_PARAMS, 'Resource URI is required'));
  }
  return ok(resourceParams);
};

const validatePromptGet = (params: unknown): Result<PromptGetParams, JsonRpcError> => {
  const promptParams = params as PromptGetParams;
  if (!promptParams.name) {
    return err(new JsonRpcError(ErrorCodes.INVALID_PARAMS, 'Prompt name is required'));
  }
  return ok(promptParams);
};

export const createMCPRouter = (server: MCPServer): MessageHandler => {
  return async (
    method: string,
    params: unknown,
    id: string | number
  ): Promise<Result<unknown, JsonRpcError>> => {
    if (process.env.LOG_LEVEL === 'debug') {
      console.debug(`[${id}] Handling method: ${method}`);
    }

    return match(method as MCPMethod)
      .with(MCPMethod.INITIALIZE, () => ok(server.handleInitialize()))
      .with(MCPMethod.TOOLS_LIST, () => ok({ tools: server.listTools() }))
      .with(MCPMethod.RESOURCES_LIST, () => ok({ resources: server.listResources() }))
      .with(MCPMethod.PROMPTS_LIST, () => ok({ prompts: server.listPrompts() }))
      .with(MCPMethod.TOOLS_CALL, () => {
        const validationResult = validateToolCall(params);
        if (validationResult.isErr()) {
          return validationResult;
        }
        const toolParams = validationResult.value;
        return server.callTool(toolParams.name, toolParams.arguments);
      })
      .with(MCPMethod.RESOURCES_READ, () => {
        const validationResult = validateResourceRead(params);
        if (validationResult.isErr()) {
          return validationResult;
        }
        const resourceParams = validationResult.value;
        return server.readResource(resourceParams.uri);
      })
      .with(MCPMethod.PROMPTS_GET, () => {
        const validationResult = validatePromptGet(params);
        if (validationResult.isErr()) {
          return validationResult;
        }
        const promptParams = validationResult.value;
        return server.getPrompt(promptParams.name, promptParams.arguments);
      })
      .otherwise(() =>
        err(new JsonRpcError(ErrorCodes.METHOD_NOT_FOUND, `Method '${method}' not found`))
      );
  };
};
