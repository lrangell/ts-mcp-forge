import { Result, ok, err } from 'neverthrow';
import { JsonRpcError, ErrorCodes } from '../core/jsonrpc.js';
import { toTextContent } from './string-conversion.js';

export interface MethodMetadata {
  method: string;
  params?: Array<{ name: string; index: number }>;
}

/**
 * Safely invokes methods with validation
 */
export class MethodInvoker {
  static async invokeMethod(
    target: unknown,
    methodName: string,
    args: unknown[] = []
  ): Promise<Result<unknown, JsonRpcError>> {
    const method = (target as Record<string, unknown>)[methodName];

    if (typeof method !== 'function') {
      return err(
        new JsonRpcError(
          ErrorCodes.INTERNAL_ERROR,
          `Method '${methodName}' not found or is not a function`
        )
      );
    }

    try {
      const result = await method.apply(target, args);

      // If the result is already a Result type, convert any errors to JsonRpcError
      if (result && typeof result === 'object' && 'isOk' in result && 'isErr' in result) {
        return (result as Result<unknown, unknown>).mapErr((error) => {
          const message = error instanceof Error ? error.message : String(error);
          return new JsonRpcError(ErrorCodes.INTERNAL_ERROR, message);
        });
      }

      // Otherwise, wrap the plain value in ok()
      return ok(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new JsonRpcError(ErrorCodes.INTERNAL_ERROR, message));
    }
  }

  static prepareArguments(
    params: Array<{ name: string; index: number }> | undefined,
    argsObject: Record<string, unknown> | undefined
  ): unknown[] {
    if (!params || params.length === 0) {
      return [];
    }

    return params.map((p) => argsObject?.[p.name]);
  }

  static createToolResponse(value: unknown): { content: Array<{ type: 'text'; text: string }> } {
    return {
      content: [
        {
          type: 'text' as const,
          text: toTextContent(value),
        },
      ],
    };
  }

  static createResourceResponse(
    uri: string,
    value: unknown,
    mimeType: string = 'application/json'
  ): { contents: Array<{ uri: string; mimeType: string; text: string }> } {
    return {
      contents: [
        {
          uri,
          mimeType,
          text: toTextContent(value),
        },
      ],
    };
  }
}
