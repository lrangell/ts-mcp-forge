import { Result, ok, err } from 'neverthrow';
import { z } from 'zod';
import { GeneralErrors, McpError } from './mcp-errors.js';

// Import all SDK types and schemas
import {
  // Protocol version
  LATEST_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,

  // Core JSON-RPC types
  JSONRPCRequest,
  JSONRPCNotification,
  JSONRPCResponse,
  JSONRPCError,
  RequestId,
  ProgressToken,
  Cursor,

  // Initialize types
  InitializeRequest,
  InitializeResult,
  ClientCapabilities,
  ServerCapabilities,
  Implementation,

  // Tool types
  Tool,
  ListToolsRequest,
  ListToolsResult,
  CallToolRequest,
  CallToolResult,
  ToolListChangedNotification,

  // Resource types
  Resource,
  ResourceTemplate,
  ListResourcesRequest,
  ListResourcesResult,
  ListResourceTemplatesRequest,
  ListResourceTemplatesResult,
  ReadResourceRequest,
  ReadResourceResult,
  ResourceListChangedNotification,
  ResourceUpdatedNotification,
  SubscribeRequest,
  UnsubscribeRequest,

  // Prompt types
  Prompt,
  PromptArgument,
  ListPromptsRequest,
  ListPromptsResult,
  GetPromptRequest,
  GetPromptResult,
  PromptMessage,
  PromptListChangedNotification,

  // Content types
  TextContent,
  ImageContent,
  AudioContent,
  EmbeddedResource,
  ResourceLink,
  ContentBlock,
  ResourceContents,
  TextResourceContents,
  BlobResourceContents,

  // Completion types
  CompleteRequest,
  CompleteResult,

  // Root types
  Root,
  ListRootsRequest,
  ListRootsResult,
  RootsListChangedNotification,

  // Pagination
  PaginatedRequest,
  PaginatedResult,

  // Progress
  Progress,
  ProgressNotification,

  // Logging
  LoggingLevel,
  SetLevelRequest,
  LoggingMessageNotification,

  // Error codes
  ErrorCode,

  // Schemas for validation
  JSONRPCRequestSchema,
  JSONRPCNotificationSchema,
  InitializeRequestSchema,
  CallToolRequestSchema,
  ReadResourceRequestSchema,
  GetPromptRequestSchema,
  CompleteRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Re-export all imported SDK types
export {
  // Protocol version
  LATEST_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,

  // Core JSON-RPC types
  JSONRPCRequest,
  JSONRPCNotification,
  JSONRPCResponse,
  JSONRPCError,
  RequestId,
  ProgressToken,
  Cursor,

  // Initialize types
  InitializeRequest,
  InitializeResult,
  ClientCapabilities,
  ServerCapabilities,
  Implementation,

  // Tool types
  Tool,
  ListToolsRequest,
  ListToolsResult,
  CallToolRequest,
  CallToolResult,
  ToolListChangedNotification,

  // Resource types
  Resource,
  ResourceTemplate,
  ListResourcesRequest,
  ListResourcesResult,
  ListResourceTemplatesRequest,
  ListResourceTemplatesResult,
  ReadResourceRequest,
  ReadResourceResult,
  ResourceListChangedNotification,
  ResourceUpdatedNotification,
  SubscribeRequest,
  UnsubscribeRequest,

  // Prompt types
  Prompt,
  PromptArgument,
  ListPromptsRequest,
  ListPromptsResult,
  GetPromptRequest,
  GetPromptResult,
  PromptMessage,
  PromptListChangedNotification,

  // Content types
  TextContent,
  ImageContent,
  AudioContent,
  EmbeddedResource,
  ResourceLink,
  ContentBlock,
  ResourceContents,
  TextResourceContents,
  BlobResourceContents,

  // Completion types
  CompleteRequest,
  CompleteResult,

  // Root types
  Root,
  ListRootsRequest,
  ListRootsResult,
  RootsListChangedNotification,

  // Pagination
  PaginatedRequest,
  PaginatedResult,

  // Progress
  Progress,
  ProgressNotification,

  // Logging
  LoggingLevel,
  SetLevelRequest,
  LoggingMessageNotification,

  // Error codes
  ErrorCode,
};

// Type aliases for backward compatibility during migration
export type Request = JSONRPCRequest;
export type Notification = JSONRPCNotification;
export type Response = JSONRPCResponse;
export type ToolCallResponse = CallToolResult;
export type ToolCallRequest = CallToolRequest;
export type CompletionResponse = CompleteResult;
export type CompletionRequest = CompleteRequest;

// Backward compatibility for old names
export type InitializeResponse = InitializeResult;
export type ResourceReadRequest = ReadResourceRequest;
export type ResourceReadResponse = ReadResourceResult;
export type PromptGetRequest = GetPromptRequest;
export type PromptGetResponse = GetPromptResult;

// Safe parsing functions that return Results
export const parseRequest = (data: unknown): Result<JSONRPCRequest, McpError> => {
  try {
    const validated = JSONRPCRequestSchema.parse(data);
    return ok(validated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return err(GeneralErrors.invalidParams(`Invalid request: ${error.message}`));
    }
    return err(GeneralErrors.parseError(`Failed to parse request: ${error}`));
  }
};

export const parseNotification = (data: unknown): Result<JSONRPCNotification, McpError> => {
  try {
    const validated = JSONRPCNotificationSchema.parse(data);
    return ok(validated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return err(GeneralErrors.invalidParams(`Invalid notification: ${error.message}`));
    }
    return err(GeneralErrors.parseError(`Failed to parse notification: ${error}`));
  }
};

export const parseInitializeRequest = (data: unknown): Result<InitializeRequest, McpError> => {
  try {
    const validated = InitializeRequestSchema.parse(data);
    return ok(validated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return err(GeneralErrors.invalidParams(`Invalid initialize request: ${error.message}`));
    }
    return err(GeneralErrors.parseError(`Failed to parse initialize request: ${error}`));
  }
};

export const parseCallToolRequest = (data: unknown): Result<CallToolRequest, McpError> => {
  try {
    const validated = CallToolRequestSchema.parse(data);
    return ok(validated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return err(GeneralErrors.invalidParams(`Invalid tool call request: ${error.message}`));
    }
    return err(GeneralErrors.parseError(`Failed to parse tool call request: ${error}`));
  }
};

export const parseReadResourceRequest = (data: unknown): Result<ReadResourceRequest, McpError> => {
  try {
    const validated = ReadResourceRequestSchema.parse(data);
    return ok(validated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return err(GeneralErrors.invalidParams(`Invalid resource read request: ${error.message}`));
    }
    return err(GeneralErrors.parseError(`Failed to parse resource read request: ${error}`));
  }
};

export const parseGetPromptRequest = (data: unknown): Result<GetPromptRequest, McpError> => {
  try {
    const validated = GetPromptRequestSchema.parse(data);
    return ok(validated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return err(GeneralErrors.invalidParams(`Invalid prompt get request: ${error.message}`));
    }
    return err(GeneralErrors.parseError(`Failed to parse prompt get request: ${error}`));
  }
};

export const parseCompleteRequest = (data: unknown): Result<CompleteRequest, McpError> => {
  try {
    const validated = CompleteRequestSchema.parse(data);
    return ok(validated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return err(GeneralErrors.invalidParams(`Invalid completion request: ${error.message}`));
    }
    return err(GeneralErrors.parseError(`Failed to parse completion request: ${error}`));
  }
};

// Helper functions to create SDK-compliant responses
export const createTextContent = (text: string): TextContent => ({
  type: 'text',
  text,
});

export const createImageContent = (data: string, mimeType: string): ImageContent => ({
  type: 'image',
  data,
  mimeType,
});

export const createResourceContent = (
  uri: string,
  text?: string,
  mimeType?: string
): EmbeddedResource => {
  // SDK requires either text or blob, default to empty text if not provided
  const resource: { uri: string; text: string; mimeType?: string } = {
    uri,
    text: text || '',
  };

  if (mimeType !== undefined) {
    resource.mimeType = mimeType;
  }

  return {
    type: 'resource',
    resource,
  };
};

// Safe content creation with Result wrapping
export const createContent = (
  type: 'text' | 'image' | 'resource',
  data: unknown
): Result<ContentBlock, McpError> => {
  try {
    switch (type) {
      case 'text':
        if (typeof data !== 'string') {
          return err(GeneralErrors.invalidParams('Text content requires string data'));
        }
        return ok(createTextContent(data));

      case 'image': {
        const imageData = data as { data?: string; mimeType?: string };
        if (!imageData.data || !imageData.mimeType) {
          return err(GeneralErrors.invalidParams('Image content requires data and mimeType'));
        }
        return ok(createImageContent(imageData.data, imageData.mimeType));
      }

      case 'resource': {
        const resourceData = data as { uri?: string; text?: string; mimeType?: string };
        if (!resourceData.uri) {
          return err(GeneralErrors.invalidParams('Resource content requires uri'));
        }
        return ok(
          createResourceContent(resourceData.uri, resourceData.text, resourceData.mimeType)
        );
      }

      default:
        return err(GeneralErrors.invalidParams(`Unknown content type: ${type}`));
    }
  } catch (error) {
    return err(GeneralErrors.internalError(`Failed to create content: ${error}`));
  }
};

// Validation helper that returns Result
export const validateAgainstSchema = <T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  errorMessage: string
): Result<T, McpError> => {
  const result = schema.safeParse(data);
  if (!result.success) {
    return err(GeneralErrors.invalidParams(`${errorMessage}: ${result.error.message}`));
  }
  return ok(result.data);
};
