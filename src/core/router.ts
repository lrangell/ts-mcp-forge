import { Result, ok, err } from 'neverthrow';
import { match } from 'ts-pattern';
import { MCPServer } from './server.js';
import { MessageHandler } from './jsonrpc.js';
import { GeneralErrors, McpError } from './mcp-errors.js';
import { Logger } from '../utils/logger.js';
import { createValidator } from './validation-factory.js';

export enum MCPMethod {
  INITIALIZE = 'initialize',
  TOOLS_LIST = 'tools/list',
  RESOURCES_LIST = 'resources/list',
  RESOURCES_TEMPLATES_LIST = 'resources/templates/list',
  RESOURCES_SUBSCRIBE = 'resources/subscribe',
  RESOURCES_UNSUBSCRIBE = 'resources/unsubscribe',
  PROMPTS_LIST = 'prompts/list',
  TOOLS_CALL = 'tools/call',
  RESOURCES_READ = 'resources/read',
  PROMPTS_GET = 'prompts/get',
  COMPLETION_COMPLETE = 'completion/complete',
}

interface ToolCallParams {
  name: string;
  arguments?: unknown;
}

interface ResourceReadParams {
  uri: string;
}

interface PromptGetParams {
  name: string;
  arguments?: unknown;
}

interface ResourceSubscribeParams {
  uri: string;
}

interface ResourceUnsubscribeParams {
  uri: string;
}

interface ListParams {
  cursor?: string;
}

interface CompletionCompleteParams {
  ref: {
    type: 'ref/resource' | 'ref/prompt';
    uri?: string;
    name?: string;
  };
  argument: {
    name: string;
    value: string;
  };
}

const validateToolCall = createValidator<ToolCallParams>([
  {
    fieldName: 'name',
    errorMessage: 'Tool name is required and must be a string',
    validator: (value: unknown) => typeof value === 'string',
  },
]);
const validateResourceRead = createValidator<ResourceReadParams>([
  {
    fieldName: 'uri',
    errorMessage: 'Resource URI is required and must be a string',
    validator: (value: unknown) => typeof value === 'string',
  },
]);
const validatePromptGet = createValidator<PromptGetParams>([
  {
    fieldName: 'name',
    errorMessage: 'Prompt name is required and must be a string',
    validator: (value: unknown) => typeof value === 'string',
  },
]);
const validateResourceSubscribe = createValidator<ResourceSubscribeParams>([
  {
    fieldName: 'uri',
    errorMessage: 'Resource URI is required and must be a string',
    validator: (value: unknown) => typeof value === 'string',
  },
]);
const validateResourceUnsubscribe = createValidator<ResourceUnsubscribeParams>([
  {
    fieldName: 'uri',
    errorMessage: 'Resource URI is required and must be a string',
    validator: (value: unknown) => typeof value === 'string',
  },
]);

const validateListParams = createValidator<ListParams>([
  {
    fieldName: 'cursor',
    optional: true,
    errorMessage: 'Cursor must be a string if provided',
    validator: (value: unknown) => value === undefined || typeof value === 'string',
  },
]);

const validateCompletionComplete = createValidator<CompletionCompleteParams>([
  { fieldName: 'ref', errorMessage: 'Ref is required' },
  { fieldName: 'argument', errorMessage: 'Argument is required' },
]);

export const createMCPRouter = (server: MCPServer): MessageHandler => {
  const logger = new Logger('Router');

  // Cache the server capabilities
  let capabilities: Record<string, any> | null = null;
  const getCapabilities = () => {
    if (!capabilities) {
      capabilities = server.handleInitialize().capabilities;
    }
    return capabilities;
  };

  const checkCapability = (capability: string): boolean => {
    const caps = getCapabilities();
    return caps.hasOwnProperty(capability);
  };

  return async (
    method: string,
    params: unknown,
    id: string | number
  ): Promise<Result<unknown, McpError>> => {
    logger.debug(`[${id}] Handling method: ${method}`);

    const clientId = String((params as Record<string, unknown>)?.clientId || `client_${id}`);

    return match(method as MCPMethod)
      .with(MCPMethod.INITIALIZE, async () => ok(server.handleInitialize()))
      .with(MCPMethod.TOOLS_LIST, async () => {
        if (!checkCapability('tools')) {
          return err(GeneralErrors.methodNotFound(`Method '${method}' not found`));
        }
        let cursor: string | undefined;
        if (params && typeof params === 'object' && params !== null) {
          const validationResult = await validateListParams(params);
          if (validationResult.isErr()) return validationResult;
          cursor = validationResult.value.cursor;
        }
        const result = server.listTools(cursor);
        // Handle both array and paginated response formats
        if (Array.isArray(result)) {
          return ok({ tools: result });
        } else {
          return ok(result);
        }
      })
      .with(MCPMethod.RESOURCES_LIST, async () => {
        if (!checkCapability('resources')) {
          return err(GeneralErrors.methodNotFound(`Method '${method}' not found`));
        }
        let cursor: string | undefined;
        if (params && typeof params === 'object' && params !== null) {
          const validationResult = await validateListParams(params);
          if (validationResult.isErr()) return validationResult;
          cursor = validationResult.value.cursor;
        }
        const result = server.listResources(cursor);
        // Handle both array and paginated response formats
        if (Array.isArray(result)) {
          return ok({ resources: result });
        } else {
          return ok(result);
        }
      })
      .with(MCPMethod.RESOURCES_TEMPLATES_LIST, async () => {
        if (!checkCapability('resources')) {
          return err(GeneralErrors.methodNotFound(`Method '${method}' not found`));
        }
        return ok({ resourceTemplates: server.listResourceTemplates() });
      })
      .with(MCPMethod.RESOURCES_SUBSCRIBE, async () => {
        if (!checkCapability('resources')) {
          return err(GeneralErrors.methodNotFound(`Method '${method}' not found`));
        }
        const validationResult = await validateResourceSubscribe(params);
        if (validationResult.isErr()) return validationResult;
        return server.subscribeToResource(clientId, validationResult.value.uri);
      })
      .with(MCPMethod.RESOURCES_UNSUBSCRIBE, async () => {
        if (!checkCapability('resources')) {
          return err(GeneralErrors.methodNotFound(`Method '${method}' not found`));
        }
        const validationResult = await validateResourceUnsubscribe(params);
        if (validationResult.isErr()) return validationResult;
        return server.unsubscribeFromResource(clientId, validationResult.value.uri);
      })
      .with(MCPMethod.PROMPTS_LIST, async () => {
        if (!checkCapability('prompts')) {
          return err(GeneralErrors.methodNotFound(`Method '${method}' not found`));
        }
        let cursor: string | undefined;
        if (params && typeof params === 'object' && params !== null) {
          const validationResult = await validateListParams(params);
          if (validationResult.isErr()) return validationResult;
          cursor = validationResult.value.cursor;
        }
        const result = server.listPrompts(cursor);
        // Handle both array and paginated response formats
        if (Array.isArray(result)) {
          return ok({ prompts: result });
        } else {
          return ok(result);
        }
      })
      .with(MCPMethod.TOOLS_CALL, async () => {
        if (!checkCapability('tools')) {
          return err(GeneralErrors.methodNotFound(`Method '${method}' not found`));
        }
        const validationResult = await validateToolCall(params);
        if (validationResult.isErr()) return validationResult;
        return server.callTool(validationResult.value.name, validationResult.value.arguments);
      })
      .with(MCPMethod.RESOURCES_READ, async () => {
        if (!checkCapability('resources')) {
          return err(GeneralErrors.methodNotFound(`Method '${method}' not found`));
        }
        const validationResult = await validateResourceRead(params);
        if (validationResult.isErr()) return validationResult;
        return server.readResource(validationResult.value.uri);
      })
      .with(MCPMethod.PROMPTS_GET, async () => {
        if (!checkCapability('prompts')) {
          return err(GeneralErrors.methodNotFound(`Method '${method}' not found`));
        }
        const validationResult = await validatePromptGet(params);
        if (validationResult.isErr()) return validationResult;
        return server.getPrompt(validationResult.value.name, validationResult.value.arguments);
      })
      .with(MCPMethod.COMPLETION_COMPLETE, async () => {
        const validationResult = await validateCompletionComplete(params);
        if (validationResult.isErr()) return validationResult;
        return server.getCompletion(validationResult.value.ref, validationResult.value.argument);
      })
      .otherwise(async () => err(GeneralErrors.methodNotFound(`Method '${method}' not found`)));
  };
};
