import { Result, ok, err } from 'neverthrow';
import { Request, Response, RequestSchema } from './protocol.js';

export class JsonRpcError extends Error {
  constructor(
    public code: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'JsonRpcError';
  }
}

export const ErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SERVER_ERROR: -32000,
} as const;

export type MessageHandler = (
  method: string,
  params: unknown,
  id: string | number
) => Promise<Result<unknown, JsonRpcError>>;

export const parseJsonRpcMessage = (message: string): Result<Request, JsonRpcError> => {
  try {
    const parsed = JSON.parse(message);
    const validated = RequestSchema.safeParse(parsed);

    if (!validated.success) {
      return err(
        new JsonRpcError(
          ErrorCodes.INVALID_REQUEST,
          'Invalid request format',
          validated.error.errors
        )
      );
    }

    return ok(validated.data);
  } catch (error) {
    return err(new JsonRpcError(ErrorCodes.PARSE_ERROR, 'Parse error', error));
  }
};

export const createSuccessResponse = (id: string | number, result: unknown): Response => ({
  jsonrpc: '2.0',
  id,
  result,
});

export const createErrorResponse = (id: string | number, error: JsonRpcError): Response => ({
  jsonrpc: '2.0',
  id,
  error: {
    code: error.code,
    message: error.message,
    data: error.data,
  },
});

export const handleJsonRpcMessage = async (
  message: string,
  handler: MessageHandler
): Promise<string> => {
  const parseResult = parseJsonRpcMessage(message);

  if (parseResult.isErr()) {
    const response = createErrorResponse(0, parseResult.error);
    return JSON.stringify(response);
  }

  const request = parseResult.value;
  const result = await handler(request.method, request.params, request.id);

  const response = result.isOk()
    ? createSuccessResponse(request.id, result.value)
    : createErrorResponse(request.id, result.error);

  return JSON.stringify(response);
};

export const handleJsonRpcBatch = async (
  messages: string[],
  handler: MessageHandler
): Promise<string[]> => {
  const responses = await Promise.all(messages.map((msg) => handleJsonRpcMessage(msg, handler)));
  return responses;
};
