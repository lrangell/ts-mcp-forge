import { Result, ok, err, ResultAsync } from 'neverthrow';
import { match } from 'ts-pattern';
import { MCPServer } from './server.js';
import { JsonRpcError, ErrorCodes, MessageHandler } from './jsonrpc.js';
import { Logger } from '../utils/logger.js';
import { createRequiredFieldValidator, createValidator } from './validation-factory.js';

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

const validateToolCall = createRequiredFieldValidator<ToolCallParams>(
  'name',
  'Tool name is required'
);
const validateResourceRead = createRequiredFieldValidator<ResourceReadParams>(
  'uri',
  'Resource URI is required'
);
const validatePromptGet = createRequiredFieldValidator<PromptGetParams>(
  'name',
  'Prompt name is required'
);
const validateResourceSubscribe = createRequiredFieldValidator<ResourceSubscribeParams>(
  'uri',
  'Resource URI is required'
);
const validateResourceUnsubscribe = createRequiredFieldValidator<ResourceUnsubscribeParams>(
  'uri',
  'Resource URI is required'
);

const validateCompletionComplete = createValidator<CompletionCompleteParams>([
  { field: 'ref', errorMessage: 'Ref is required' },
  { field: 'argument', errorMessage: 'Argument is required' },
]);

export const createMCPRouter = (server: MCPServer): MessageHandler => {
  const logger = new Logger('Router');

  return async (
    method: string,
    params: unknown,
    id: string | number
  ): Promise<Result<unknown, JsonRpcError>> => {
    logger.debug(`[${id}] Handling method: ${method}`);

    const clientId = String((params as Record<string, unknown>)?.clientId || `client_${id}`);

    return match(method as MCPMethod)
      .with(MCPMethod.INITIALIZE, async () => ok(server.handleInitialize()))
      .with(MCPMethod.TOOLS_LIST, async () => ok({ tools: server.listTools() }))
      .with(MCPMethod.RESOURCES_LIST, async () => ok({ resources: server.listResources() }))
      .with(MCPMethod.RESOURCES_TEMPLATES_LIST, async () =>
        ok({ resourceTemplates: server.listResourceTemplates() })
      )
      .with(MCPMethod.RESOURCES_SUBSCRIBE, () =>
        validateResourceSubscribe(params).asyncAndThen((subscribeParams) =>
          ResultAsync.fromSafePromise(server.subscribeToResource(clientId, subscribeParams.uri))
        )
      )
      .with(MCPMethod.RESOURCES_UNSUBSCRIBE, () =>
        validateResourceUnsubscribe(params).asyncAndThen((unsubscribeParams) =>
          ResultAsync.fromSafePromise(
            server.unsubscribeFromResource(clientId, unsubscribeParams.uri)
          )
        )
      )
      .with(MCPMethod.PROMPTS_LIST, async () => ok({ prompts: server.listPrompts() }))
      .with(MCPMethod.TOOLS_CALL, () =>
        validateToolCall(params).asyncAndThen((toolParams) =>
          ResultAsync.fromSafePromise(server.callTool(toolParams.name, toolParams.arguments))
        )
      )
      .with(MCPMethod.RESOURCES_READ, () =>
        validateResourceRead(params).asyncAndThen((resourceParams) =>
          ResultAsync.fromSafePromise(server.readResource(resourceParams.uri))
        )
      )
      .with(MCPMethod.PROMPTS_GET, () =>
        validatePromptGet(params).asyncAndThen((promptParams) =>
          ResultAsync.fromSafePromise(server.getPrompt(promptParams.name, promptParams.arguments))
        )
      )
      .with(MCPMethod.COMPLETION_COMPLETE, () =>
        validateCompletionComplete(params).asyncAndThen((completionParams) =>
          ResultAsync.fromSafePromise(
            server.getCompletion(completionParams.ref, completionParams.argument)
          )
        )
      )
      .otherwise(async () =>
        err(new JsonRpcError(ErrorCodes.METHOD_NOT_FOUND, `Method '${method}' not found`))
      );
  };
};
