import { z } from 'zod';

export const MCPVersionSchema = z.literal('2025-06-18');
export type MCPVersion = z.infer<typeof MCPVersionSchema>;

export const RequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  method: z.string(),
  params: z.any().optional(),
});
export type Request = z.infer<typeof RequestSchema>;

export const ResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  result: z.any().optional(),
  error: z
    .object({
      code: z.number(),
      message: z.string(),
      data: z.any().optional(),
    })
    .optional(),
});
export type Response = z.infer<typeof ResponseSchema>;

export const NotificationSchema = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.string(),
  params: z.any().optional(),
});
export type Notification = z.infer<typeof NotificationSchema>;

export const ToolSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  inputSchema: z.record(z.any()),
});
export type Tool = z.infer<typeof ToolSchema>;

export const ResourceSchema = z.object({
  uri: z.string(),
  name: z.string(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
});
export type Resource = z.infer<typeof ResourceSchema>;

export const PromptSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  arguments: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        required: z.boolean().optional(),
      })
    )
    .optional(),
});
export type Prompt = z.infer<typeof PromptSchema>;

export const InitializeRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  method: z.literal('initialize'),
  params: z.object({
    protocolVersion: MCPVersionSchema,
    capabilities: z.object({
      roots: z
        .object({
          listChanged: z.boolean().optional(),
        })
        .optional(),
      sampling: z.object({}).optional(),
    }),
    clientInfo: z.object({
      name: z.string(),
      version: z.string().optional(),
    }),
  }),
});
export type InitializeRequest = z.infer<typeof InitializeRequestSchema>;

export const InitializeResponseSchema = z.object({
  protocolVersion: MCPVersionSchema,
  capabilities: z.object({
    tools: z.object({}).optional(),
    resources: z
      .object({
        subscribe: z.boolean().optional(),
        listChanged: z.boolean().optional(),
      })
      .optional(),
    prompts: z
      .object({
        listChanged: z.boolean().optional(),
      })
      .optional(),
    logging: z.object({}).optional(),
  }),
  serverInfo: z.object({
    name: z.string(),
    version: z.string().optional(),
  }),
});
export type InitializeResponse = z.infer<typeof InitializeResponseSchema>;

export const ToolCallRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  method: z.literal('tools/call'),
  params: z.object({
    name: z.string(),
    arguments: z.any().optional(),
  }),
});
export type ToolCallRequest = z.infer<typeof ToolCallRequestSchema>;

export const ToolCallResponseSchema = z.object({
  content: z.array(
    z.object({
      type: z.enum(['text', 'image', 'resource']),
      text: z.string().optional(),
      data: z.string().optional(),
      mimeType: z.string().optional(),
      uri: z.string().optional(),
    })
  ),
});
export type ToolCallResponse = z.infer<typeof ToolCallResponseSchema>;

export const ListToolsRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  method: z.literal('tools/list'),
  params: z.object({}).optional(),
});
export type ListToolsRequest = z.infer<typeof ListToolsRequestSchema>;

export const ListResourcesRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  method: z.literal('resources/list'),
  params: z.object({}).optional(),
});
export type ListResourcesRequest = z.infer<typeof ListResourcesRequestSchema>;

export const ListPromptsRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  method: z.literal('prompts/list'),
  params: z.object({}).optional(),
});
export type ListPromptsRequest = z.infer<typeof ListPromptsRequestSchema>;
