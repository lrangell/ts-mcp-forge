import { Result } from 'neverthrow';

export function toTextContent(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return 'undefined';
  }
  const stringified = safeJsonStringify(value);
  return stringified.unwrapOr(String(value));
}

export function normalizeRequestBody(body: string | object | unknown): string {
  return toTextContent(body);
}

export function tryParseJson<T = unknown>(text: string): Result<T, Error> {
  return Result.fromThrowable(
    () => JSON.parse(text) as T,
    (error) =>
      new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`)
  )();
}

export function tryParseJsonLegacy<T = unknown>(text: string): T | null {
  const result = tryParseJson<T>(text);
  return result.unwrapOr(null);
}

export function safeJsonStringify(value: unknown): Result<string, Error> {
  return Result.fromThrowable(
    () => JSON.stringify(value),
    (error) =>
      new Error(
        `Failed to stringify JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
  )();
}

export function safeStringify(value: unknown, fallback = ''): string {
  const result = safeJsonStringify(value);
  return result.unwrapOr(fallback);
}
