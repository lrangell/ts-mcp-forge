/**
 * Test fixtures for MCP protocol compliance testing
 * Based on the MCP specification 2025-06-18
 */

export const PROTOCOL_VERSION = '2025-06-18';

// JSON-RPC 2.0 base structures
export const validJsonRpcRequest = {
  jsonrpc: '2.0' as const,
  id: 1,
  method: 'test/method',
  params: {},
};

export const validJsonRpcResponse = {
  jsonrpc: '2.0' as const,
  id: 1,
  result: { success: true },
};

export const validJsonRpcError = {
  jsonrpc: '2.0' as const,
  id: 1,
  error: {
    code: -32600,
    message: 'Invalid Request',
    data: { details: 'Additional error information' },
  },
};

export const validJsonRpcNotification = {
  jsonrpc: '2.0' as const,
  method: 'notification/test',
  params: { data: 'test' },
};

// MCP Error Codes (from JSON-RPC spec + MCP extensions)
export const MCP_ERROR_CODES = {
  // Standard JSON-RPC errors
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,

  // MCP-specific errors
  RESOURCE_NOT_FOUND: -32002, // Resource-specific not found code per MCP spec
  TOOL_NOT_FOUND: -32601, // Tools use METHOD_NOT_FOUND
  PROMPT_NOT_FOUND: -32601, // Prompts use METHOD_NOT_FOUND

  // Additional MCP error scenarios
  RESOURCE_UNAVAILABLE: -32603,
  TOOL_EXECUTION_ERROR: -32603,
  PROMPT_GENERATION_ERROR: -32603,
  VALIDATION_ERROR: -32602,
  PERMISSION_DENIED: -32603,
  TIMEOUT_ERROR: -32603,
} as const;

// Initialize request/response
export const validInitializeRequest = {
  jsonrpc: '2.0' as const,
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {
      roots: {
        listChanged: true,
      },
      sampling: {},
    },
    clientInfo: {
      name: 'Test Client',
      version: '1.0.0',
    },
  },
};

export const validInitializeResponse = {
  protocolVersion: PROTOCOL_VERSION,
  capabilities: {
    tools: {},
    resources: {
      subscribe: true,
      listChanged: true,
    },
    prompts: {
      listChanged: true,
    },
    completion: {},
    logging: {},
  },
  serverInfo: {
    name: 'Test Server',
    version: '1.0.0',
  },
};

// Tools fixtures
export const validToolsListRequest = {
  jsonrpc: '2.0' as const,
  id: 2,
  method: 'tools/list',
  params: {
    cursor: 'optional-cursor',
  },
};

export const validToolsListResponse = {
  tools: [
    {
      name: 'calculator',
      title: 'Basic Calculator',
      description: 'Performs arithmetic operations',
      inputSchema: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['add', 'subtract', 'multiply', 'divide'],
            description: 'The arithmetic operation to perform',
          },
          a: {
            type: 'number',
            description: 'First operand',
          },
          b: {
            type: 'number',
            description: 'Second operand',
          },
        },
        required: ['operation', 'a', 'b'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          result: {
            type: 'number',
            description: 'The calculation result',
          },
        },
      },
    },
    {
      name: 'file_reader',
      title: 'File Reader',
      description: 'Reads file contents',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to read',
          },
        },
        required: ['path'],
      },
    },
  ],
  nextCursor: 'next-page-token',
};

export const validToolCallRequest = {
  jsonrpc: '2.0' as const,
  id: 3,
  method: 'tools/call',
  params: {
    name: 'calculator',
    arguments: {
      operation: 'add',
      a: 5,
      b: 3,
    },
  },
};

export const validToolCallResponse = {
  content: [
    {
      type: 'text' as const,
      text: 'The result of 5 + 3 is 8',
    },
    {
      type: 'image' as const,
      data: 'base64-encoded-image-data',
      mimeType: 'image/png',
    },
    {
      type: 'resource' as const,
      uri: 'file:///tmp/calculation_result.json',
    },
  ],
  isError: false,
};

export const validToolErrorResponse = {
  content: [
    {
      type: 'text' as const,
      text: 'Error: Division by zero is not allowed',
    },
  ],
  isError: true,
};

// Resources fixtures
export const validResourcesListRequest = {
  jsonrpc: '2.0' as const,
  id: 4,
  method: 'resources/list',
  params: {
    cursor: 'resource-cursor',
  },
};

export const validResourcesListResponse = {
  resources: [
    {
      uri: 'file:///project/README.md',
      name: 'Project README',
      description: 'Main project documentation',
      mimeType: 'text/markdown',
    },
    {
      uri: 'https://api.example.com/data',
      name: 'API Data',
      description: 'Live API endpoint data',
      annotations: {
        audience: ['user'],
        priority: 1,
      },
    },
    {
      uri: 'git://repo/commit/abc123',
      name: 'Git Commit',
      description: 'Specific git commit data',
    },
  ],
  nextCursor: 'next-resource-page',
};

export const validResourceReadRequest = {
  jsonrpc: '2.0' as const,
  id: 5,
  method: 'resources/read',
  params: {
    uri: 'file:///project/README.md',
  },
};

export const validResourceReadResponse = {
  contents: [
    {
      uri: 'file:///project/README.md',
      mimeType: 'text/markdown',
      text: '# Project Title\n\nThis is a test project.',
    },
  ],
};

export const validResourceReadResponseBinary = {
  contents: [
    {
      uri: 'file:///project/image.png',
      mimeType: 'image/png',
      blob: 'base64-encoded-binary-data',
    },
  ],
};

export const validResourceSubscribeRequest = {
  jsonrpc: '2.0' as const,
  id: 6,
  method: 'resources/subscribe',
  params: {
    uri: 'file:///project/live-data.json',
  },
};

export const validResourceUnsubscribeRequest = {
  jsonrpc: '2.0' as const,
  id: 7,
  method: 'resources/unsubscribe',
  params: {
    uri: 'file:///project/live-data.json',
  },
};

export const validResourceTemplatesListRequest = {
  jsonrpc: '2.0' as const,
  id: 8,
  method: 'resources/templates/list',
  params: {},
};

export const validResourceTemplatesListResponse = {
  resourceTemplates: [
    {
      uriTemplate: 'file:///logs/{date}',
      name: 'Daily Logs',
      description: 'Daily log files by date',
      mimeType: 'text/plain',
    },
    {
      uriTemplate: 'https://api.example.com/users/{userId}',
      name: 'User Profile',
      description: 'User profile data by ID',
      mimeType: 'application/json',
    },
  ],
};

// Prompts fixtures
export const validPromptsListRequest = {
  jsonrpc: '2.0' as const,
  id: 9,
  method: 'prompts/list',
  params: {
    cursor: 'prompt-cursor',
  },
};

export const validPromptsListResponse = {
  prompts: [
    {
      name: 'code_review',
      title: 'Code Review Assistant',
      description: 'Helps review code for best practices',
      arguments: [
        {
          name: 'language',
          description: 'Programming language',
          required: true,
        },
        {
          name: 'focus',
          description: 'What to focus on (security, performance, style)',
          required: false,
        },
      ],
    },
    {
      name: 'summarize',
      title: 'Text Summarizer',
      description: 'Summarizes long text content',
      arguments: [
        {
          name: 'text',
          description: 'Text to summarize',
          required: true,
        },
        {
          name: 'length',
          description: 'Desired summary length (short, medium, long)',
          required: false,
        },
      ],
    },
  ],
  nextCursor: 'next-prompt-page',
};

export const validPromptGetRequest = {
  jsonrpc: '2.0' as const,
  id: 10,
  method: 'prompts/get',
  params: {
    name: 'code_review',
    arguments: {
      language: 'typescript',
      focus: 'security',
    },
  },
};

export const validPromptGetResponse = {
  description: 'Code review prompt for TypeScript with security focus',
  messages: [
    {
      role: 'user' as const,
      content: {
        type: 'text' as const,
        text: 'Please review this TypeScript code with a focus on security issues.',
      },
    },
    {
      role: 'assistant' as const,
      content: {
        type: 'text' as const,
        text: "I'll review your TypeScript code for security vulnerabilities.",
      },
    },
  ],
};

// Completion fixtures
export const validCompletionRequest = {
  jsonrpc: '2.0' as const,
  id: 11,
  method: 'completion/complete',
  params: {
    ref: {
      type: 'ref/prompt' as const,
      name: 'code_review',
    },
    argument: {
      name: 'language',
      value: 'py',
    },
  },
};

export const validCompletionResponse = {
  completion: {
    values: ['python', 'python3', 'pytorch'],
    total: 3,
    hasMore: false,
  },
};

export const validResourceCompletionRequest = {
  jsonrpc: '2.0' as const,
  id: 12,
  method: 'completion/complete',
  params: {
    ref: {
      type: 'ref/resource' as const,
      uri: 'file:///logs/',
    },
    argument: {
      name: 'date',
      value: '2025',
    },
  },
};

// Notification fixtures
export const validResourceListChangedNotification = {
  jsonrpc: '2.0' as const,
  method: 'notifications/resources/list_changed',
  params: {},
};

export const validResourceUpdatedNotification = {
  jsonrpc: '2.0' as const,
  method: 'notifications/resources/updated',
  params: {
    uri: 'file:///project/data.json',
  },
};

export const validToolListChangedNotification = {
  jsonrpc: '2.0' as const,
  method: 'notifications/tools/list_changed',
  params: {},
};

export const validPromptListChangedNotification = {
  jsonrpc: '2.0' as const,
  method: 'notifications/prompts/list_changed',
  params: {},
};

// Logging fixtures (if supported)
export const validLoggingMessageNotification = {
  jsonrpc: '2.0' as const,
  method: 'notifications/message',
  params: {
    level: 'info' as const,
    data: 'Server initialized successfully',
    logger: 'mcp-server',
  },
};

// Sampling fixtures (if supported)
export const validSamplingCreateMessageRequest = {
  jsonrpc: '2.0' as const,
  id: 13,
  method: 'sampling/createMessage',
  params: {
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: 'What is the weather like?',
        },
      },
    ],
    modelPreferences: {
      hints: [
        {
          name: 'claude-3-5-sonnet-20241022',
        },
      ],
      costPriority: 0.5,
      speedPriority: 0.8,
      intelligencePriority: 0.9,
    },
    systemPrompt: 'You are a helpful weather assistant.',
    includeContext: 'thisServer',
    temperature: 0.7,
    maxTokens: 1000,
    metadata: {
      requestId: 'weather-query-001',
    },
  },
};

// Edge cases and error scenarios
export const invalidRequests = {
  malformedJson: '{"jsonrpc": "2.0", "id": 1, "method": "test",}', // trailing comma
  missingJsonRpc: {
    id: 1,
    method: 'test',
  },
  wrongJsonRpcVersion: {
    jsonrpc: '1.0',
    id: 1,
    method: 'test',
  },
  missingId: {
    jsonrpc: '2.0',
    method: 'test',
  },
  missingMethod: {
    jsonrpc: '2.0',
    id: 1,
  },
  nullId: {
    jsonrpc: '2.0',
    id: null,
    method: 'test',
  },
  invalidIdType: {
    jsonrpc: '2.0',
    id: {},
    method: 'test',
  },
};

// Large response test data (for pagination testing)
export const largeResourcesList = {
  resources: Array.from({ length: 1000 }, (_, i) => ({
    uri: `file:///data/file-${i.toString().padStart(4, '0')}.json`,
    name: `Data File ${i}`,
    description: `Test data file number ${i}`,
    mimeType: 'application/json',
  })),
};

export const largeToolsList = {
  tools: Array.from({ length: 500 }, (_, i) => ({
    name: `tool_${i}`,
    title: `Tool ${i}`,
    description: `Test tool number ${i}`,
    inputSchema: {
      type: 'object',
      properties: {
        input: {
          type: 'string',
          description: `Input for tool ${i}`,
        },
      },
    },
  })),
};

// Security test fixtures
export const securityTestCases = {
  sqlInjection: {
    toolCall: {
      name: 'database_query',
      arguments: {
        query: "'; DROP TABLE users; --",
      },
    },
  },
  pathTraversal: {
    resourceRead: {
      uri: 'file:///../../../etc/passwd',
    },
  },
  xss: {
    promptArgs: {
      content: '<script>alert("xss")</script>',
    },
  },
  longInput: {
    toolCall: {
      name: 'test_tool',
      arguments: {
        data: 'A'.repeat(10000000), // 10MB string
      },
    },
  },
};
