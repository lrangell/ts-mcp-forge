import { Result, ok, err } from 'neverthrow';
import { McpError } from './mcp-errors.js';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { Request, Response, RequestSchema } from './protocol.js';

export type MessageHandler = (
  method: string,
  params: unknown,
  id: string | number
) => Promise<Result<unknown, McpError>>;

export const parseJsonRpcMessage = (message: string): Result<Request, McpError> => {
  try {
    const parsed = JSON.parse(message);
    const validated = RequestSchema.safeParse(parsed);

    if (!validated.success) {
      return err(
        new McpError(ErrorCode.InvalidRequest, 'Invalid request format', validated.error.errors)
      );
    }

    return ok(validated.data);
  } catch (error) {
    return err(new McpError(ErrorCode.ParseError, 'Parse error', error));
  }
};

export const createSuccessResponse = (id: string | number, result: unknown): Response =>
  ({
    jsonrpc: '2.0',
    id,
    result: result as any, // SDK's result type is more specific, cast for compatibility
  }) as Response;

export const createErrorResponse = (id: string | number, error: McpError): Response =>
  ({
    jsonrpc: '2.0',
    id,
    error: {
      code: error.code,
      message: error.message,
      data: error.data,
    },
  }) as any as Response; // Need double cast because SDK types are stricter

export const handleJsonRpcMessage = async (
  message: string,
  handler: MessageHandler
): Promise<string> => {
  const parseResult = parseJsonRpcMessage(message);

  return parseResult.match(
    async (request) => {
      const result = await handler(request.method, request.params, request.id);

      const response = result.match(
        (value) => createSuccessResponse(request.id, value),
        (error) => createErrorResponse(request.id, error)
      );

      return JSON.stringify(response);
    },
    (error) => {
      const response = createErrorResponse(0, error);
      return JSON.stringify(response);
    }
  );
};

export const handleJsonRpcBatch = async (
  messages: string[],
  handler: MessageHandler
): Promise<string[]> => {
  const responses = await Promise.all(messages.map((msg) => handleJsonRpcMessage(msg, handler)));
  return responses;
};
