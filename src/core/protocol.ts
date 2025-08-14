// Re-export all types from the SDK
export {
  // Protocol version
  LATEST_PROTOCOL_VERSION as MCPVersion,

  // Core JSON-RPC types
  JSONRPCRequest as Request,
  JSONRPCNotification as Notification,
  JSONRPCResponse as Response,

  // Request/Response schemas for validation
  JSONRPCRequestSchema as RequestSchema,
  JSONRPCNotificationSchema as NotificationSchema,
  JSONRPCResponseSchema as ResponseSchema,

  // Tool types
  Tool,
  ToolSchema,
  ListToolsRequest,
  ListToolsRequestSchema,
  ListToolsResult,
  CallToolRequest,
  CallToolRequest as ToolCallRequest,
  CallToolRequestSchema as ToolCallRequestSchema,
  CallToolResult as ToolCallResponse,
  CallToolResultSchema as ToolCallResponseSchema,
  ToolListChangedNotification,

  // Resource types
  Resource,
  ResourceSchema,
  ResourceTemplate,
  ResourceTemplateSchema,
  ListResourcesRequest,
  ListResourcesRequestSchema,
  ListResourcesResult,
  ListResourceTemplatesRequest,
  ListResourceTemplatesRequestSchema,
  ListResourceTemplatesResult as ListResourceTemplatesResponse,
  ListResourceTemplatesResultSchema as ListResourceTemplatesResponseSchema,
  ReadResourceRequest,
  ReadResourceRequestSchema as ResourceReadRequestSchema,
  ReadResourceResult as ResourceReadResponse,
  ReadResourceResultSchema as ResourceReadResponseSchema,
  SubscribeRequest as ResourceSubscribeRequest,
  SubscribeRequestSchema as ResourceSubscribeRequestSchema,
  UnsubscribeRequest as ResourceUnsubscribeRequest,
  UnsubscribeRequestSchema as ResourceUnsubscribeRequestSchema,
  ResourceListChangedNotification,
  ResourceListChangedNotificationSchema,
  ResourceUpdatedNotification,
  ResourceUpdatedNotificationSchema,

  // Prompt types
  Prompt,
  PromptSchema,
  ListPromptsRequest,
  ListPromptsRequestSchema,
  ListPromptsResult,
  GetPromptRequest,
  GetPromptRequestSchema,
  GetPromptResult,
  GetPromptResultSchema,
  PromptListChangedNotification,

  // Initialize types
  InitializeRequest,
  InitializeRequestSchema,
  InitializeResult as InitializeResponse,
  InitializeResultSchema as InitializeResponseSchema,

  // Completion types
  CompleteRequest as CompletionRequest,
  CompleteRequestSchema as CompletionRequestSchema,
  CompleteResult as CompletionResponse,
  CompleteResultSchema as CompletionResponseSchema,

  // Content types
  TextContent,
  ImageContent,
  ContentBlock,
  ResourceContents,

  // Other types
  ProgressToken,
  Cursor,
  ServerCapabilities,
  ClientCapabilities,
} from '@modelcontextprotocol/sdk/types.js';

// Type aliases for backward compatibility
