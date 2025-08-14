import { Result, ok, err } from 'neverthrow';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import { wrapError, isMcpError, GeneralErrors } from '../core/mcp-errors.js';
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
  ): Promise<Result<unknown, McpError>> {
    const method = (target as Record<string, unknown>)[methodName];

    if (typeof method !== 'function') {
      return err(
        GeneralErrors.internalError(`Method '${methodName}' not found or is not a function`)
      );
    }

    try {
      const result = await method.apply(target, args);

      // If the result is already a Result type, preserve McpError or wrap other errors
      if (result && typeof result === 'object' && 'isOk' in result && 'isErr' in result) {
        return (result as Result<unknown, unknown>).mapErr((error) => {
          // If it's already an McpError, preserve it
          if (isMcpError(error)) {
            return error;
          }
          // Otherwise, wrap it
          return wrapError(error);
        });
      }

      // Otherwise, wrap the plain value in ok()
      return ok(result);
    } catch (error) {
      return err(wrapError(error));
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

  static createToolResponse(value: unknown): {
    content: Array<{ type: 'text'; text: string }>;
    isError: boolean;
  } {
    return {
      content: [
        {
          type: 'text' as const,
          text: toTextContent(value),
        },
      ],
      isError: false,
    };
  }

  static createResourceResponse(
    uri: string,
    value: unknown,
    mimeType?: string
  ): { contents: Array<{ uri: string; mimeType: string; text?: string; blob?: string }> } {
    // Ensure mimeType is a string, defaulting to application/json
    const actualMimeType = typeof mimeType === 'string' ? mimeType : 'application/json';

    // Determine if this is binary content based on MIME type
    const isBinaryContent =
      actualMimeType.startsWith('image/') ||
      actualMimeType === 'application/octet-stream' ||
      actualMimeType.startsWith('audio/') ||
      actualMimeType.startsWith('video/') ||
      actualMimeType === 'application/pdf';

    const content: { uri: string; mimeType: string; text?: string; blob?: string } = {
      uri,
      mimeType: actualMimeType,
    };

    if (isBinaryContent) {
      // For binary content, assume the value is already base64 encoded
      content.blob = typeof value === 'string' ? value : toTextContent(value);
    } else {
      // For text content, use the text field
      content.text = toTextContent(value);
    }

    return {
      contents: [content],
    };
  }
}
