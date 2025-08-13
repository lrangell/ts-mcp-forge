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
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function normalizeRequestBody(body: string | object | unknown): string {
  return toTextContent(body);
}

export function tryParseJson<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function safeStringify(value: unknown, fallback = ''): string {
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}
