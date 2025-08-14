/**
 * Domain-specific error builders using official MCP SDK types
 *
 * This module provides type-safe error builders that ensure MCP specification
 * compliance while maintaining domain-specific constraints.
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { Result } from 'neverthrow';

// ============================================================================
// Resource-specific error code (per MCP spec)
// ============================================================================

export const RESOURCE_NOT_FOUND_CODE = -32002;

// ============================================================================
// Prompt Error Builders
// Per MCP spec: Only InvalidParams (-32602) and InternalError (-32603)
// ============================================================================

export const PromptErrors = {
  invalidName: (name: string) =>
    new McpError(ErrorCode.InvalidParams, `Invalid prompt name: ${name}`),

  missingArguments: (args: string[]) =>
    new McpError(ErrorCode.InvalidParams, `Missing required arguments: ${args.join(', ')}`),

  invalidArguments: (reason: string) =>
    new McpError(ErrorCode.InvalidParams, `Invalid arguments: ${reason}`),

  templateMatchFailed: (template: string, input: string) =>
    new McpError(
      ErrorCode.MethodNotFound,
      `Prompt template '${template}' does not match: ${input}`
    ),

  notFound: (name: string) => new McpError(ErrorCode.MethodNotFound, `Prompt not found: ${name}`),

  internalError: (reason?: string) =>
    new McpError(ErrorCode.InternalError, reason || 'Internal prompt error'),
} as const;

// ============================================================================
// Resource Error Builders
// Per MCP spec: NotFound (-32002), InvalidParams (-32602), InternalError (-32603)
// ============================================================================

export const ResourceErrors = {
  notFound: (uri: string) =>
    new McpError(RESOURCE_NOT_FOUND_CODE, `Resource not found: ${uri}`, { uri }),

  invalidUri: (uri: string) => new McpError(ErrorCode.InvalidParams, `Invalid URI format: ${uri}`),

  invalidParams: (reason: string) => new McpError(ErrorCode.InvalidParams, reason),

  templateMatchFailed: (template: string, uri: string) =>
    new McpError(RESOURCE_NOT_FOUND_CODE, `Resource template '${template}' does not match: ${uri}`),

  accessDenied: (uri: string) =>
    // For security, access denied maps to "not found"
    new McpError(RESOURCE_NOT_FOUND_CODE, `Resource not found: ${uri}`, { uri }),

  subscriptionNotSupported: (uri: string) =>
    new McpError(ErrorCode.InvalidRequest, `Resource does not support subscriptions: ${uri}`),

  internalError: (reason?: string) =>
    new McpError(ErrorCode.InternalError, reason || 'Internal resource error'),
} as const;

// ============================================================================
// Tool Error Builders
// Per MCP spec: MethodNotFound (-32601), InvalidParams (-32602), InternalError (-32603)
// ============================================================================

export const ToolErrors = {
  notFound: (name: string) => new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`),

  invalidArguments: (reason: string) =>
    new McpError(ErrorCode.InvalidParams, `Invalid tool arguments: ${reason}`),

  missingArguments: (args: string[]) =>
    new McpError(ErrorCode.InvalidParams, `Missing required arguments: ${args.join(', ')}`),

  executionFailed: (name: string, reason?: string) =>
    new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${name}${reason ? ` - ${reason}` : ''}`
    ),

  internalError: (reason?: string) =>
    new McpError(ErrorCode.InternalError, reason || 'Internal tool error'),
} as const;

// ============================================================================
// Completion Error Builders
// Per MCP spec: MethodNotFound (-32601), InvalidParams (-32602), InternalError (-32603)
// ============================================================================

export const CompletionErrors = {
  capabilityNotSupported: (capability: string) =>
    new McpError(ErrorCode.MethodNotFound, `Capability not supported: ${capability}`),

  invalidReference: (refType: string) =>
    new McpError(ErrorCode.InvalidParams, `Invalid completion reference type: ${refType}`),

  missingArguments: (args: string[]) =>
    new McpError(ErrorCode.InvalidParams, `Missing required arguments: ${args.join(', ')}`),

  internalError: (reason?: string) =>
    new McpError(ErrorCode.InternalError, reason || 'Internal completion error'),
} as const;

// ============================================================================
// General Error Builders (can be used by any domain)
// ============================================================================

export const GeneralErrors = {
  invalidRequest: (reason?: string) =>
    new McpError(ErrorCode.InvalidRequest, reason || 'Invalid request'),

  methodNotFound: (method: string) =>
    new McpError(ErrorCode.MethodNotFound, `Method not found: ${method}`),

  invalidParams: (reason: string) => new McpError(ErrorCode.InvalidParams, reason),

  internalError: (reason?: string) =>
    new McpError(ErrorCode.InternalError, reason || 'Internal server error'),

  parseError: (reason?: string) => new McpError(ErrorCode.ParseError, reason || 'Parse error'),
} as const;

// ============================================================================
// Type Constraint Unions
// These ensure compile-time enforcement of valid error types per domain
// ============================================================================

export type PromptError = ReturnType<(typeof PromptErrors)[keyof typeof PromptErrors]>;

export type ResourceError = ReturnType<(typeof ResourceErrors)[keyof typeof ResourceErrors]>;

export type ToolError = ReturnType<(typeof ToolErrors)[keyof typeof ToolErrors]>;

export type CompletionError = ReturnType<(typeof CompletionErrors)[keyof typeof CompletionErrors]>;

export type MCPError =
  | PromptError
  | ResourceError
  | ToolError
  | CompletionError
  | ReturnType<(typeof GeneralErrors)[keyof typeof GeneralErrors]>;

// ============================================================================
// Result Type Aliases for Convenience
// ============================================================================

export type PromptResult<T> = Result<T, PromptError>;
export type ResourceResult<T> = Result<T, ResourceError>;
export type ToolResult<T> = Result<T, ToolError>;
export type CompletionResult<T> = Result<T, CompletionError>;
export type MCPResult<T> = Result<T, MCPError>;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Type guard to check if an error is an McpError
 */
export function isMcpError(error: unknown): error is McpError {
  return error instanceof McpError;
}

/**
 * Wraps any error into an appropriate McpError
 */
export function wrapError(error: unknown, fallbackMessage?: string): McpError {
  if (isMcpError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return GeneralErrors.internalError(error.message);
  }

  const message = String(error) || fallbackMessage || 'Unknown error';
  return GeneralErrors.internalError(message);
}

/**
 * Re-export McpError and ErrorCode for convenience
 */
export { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
