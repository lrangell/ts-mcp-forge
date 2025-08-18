import { Result, ok, err } from 'neverthrow';
import { map, find } from 'remeda';
import { match } from 'ts-pattern';
import UriTemplate from 'uri-template-lite';
import {
  getAllToolsMetadata,
  getAllResourcesMetadata,
  getAllResourceTemplatesMetadata,
  getAllPromptsMetadata,
  getAllDynamicResourcesMetadata,
  getAllDynamicPromptsMetadata,
  getAllPromptTemplatesMetadata,
  ToolMetadata,
  ResourceMetadata,
  ResourceTemplateMetadata,
  PromptMetadata,
  PromptTemplateMetadata,
  ParamMetadata,
} from '../decorators/metadata.js';
import { generateToolSchema, generatePromptSchema, validateParams } from './schema.js';
import {
  InitializeResponse,
  Tool,
  Resource,
  ResourceTemplate,
  Prompt,
  ToolCallResponse,
  CompletionResponse,
} from './protocol.js';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import {
  PromptErrors,
  ResourceErrors,
  ToolErrors,
  CompletionErrors,
  ErrorCode,
} from './mcp-errors.js';
import { SubscriptionManager } from './subscription-manager.js';
import { NotificationManager, NotificationSender } from './notifications.js';
import { wrapSync } from '../utils/error-handling.js';
import { MethodInvoker } from '../utils/method-invoker.js';
import { resolveMimeType } from '../utils/mime-type.js';
import { Logger, createDefaultLogger, isValidLogger } from './logger.js';

// ErrorMessages removed - using domain-specific error builders from mcp-errors.ts

interface ExtendedInitializeResponse extends InitializeResponse {
  instructions?: string;
}

export abstract class MCPServer {
  private tools: Map<string, ToolMetadata>;
  private resources: Map<string, ResourceMetadata>;
  private resourceTemplates: Map<string, ResourceTemplateMetadata>;
  private prompts: Map<string, PromptMetadata>;
  private promptTemplates: Map<string, PromptTemplateMetadata>;
  private dynamicResources: Map<string, ResourceMetadata>;
  private dynamicPrompts: Map<string, PromptMetadata>;
  private subscriptionManager: SubscriptionManager;
  private notificationManager: NotificationManager;
  private dynamicResourcesInitialized: boolean = false;
  private dynamicPromptsInitialized: boolean = false;
  protected logger: Logger;
  private instructions?: string;

  constructor(
    private serverName: string = 'MCP Server',
    private serverVersion: string = '1.0.0'
  ) {
    this.tools = getAllToolsMetadata(this.constructor);
    this.resources = getAllResourcesMetadata(this.constructor);
    this.resourceTemplates = getAllResourceTemplatesMetadata(this.constructor);
    this.prompts = getAllPromptsMetadata(this.constructor);
    this.promptTemplates = getAllPromptTemplatesMetadata(this.constructor);
    this.dynamicResources = new Map();
    this.dynamicPrompts = new Map();
    this.subscriptionManager = new SubscriptionManager();
    this.notificationManager = new NotificationManager(null, this.subscriptionManager);
    this.logger = createDefaultLogger(this.serverName);
  }

  /**
   * Set a custom logger implementation
   * @param logger The logger to use (must implement Logger interface)
   * @returns This server instance for chaining
   */
  setLogger(logger: Logger): this {
    if (!isValidLogger(logger)) {
      throw new Error('Invalid logger: must implement debug, info, warn, and error methods');
    }
    this.logger = logger;
    return this;
  }

  /**
   * Set instructions for the server that will be included in the initialization response
   * @param instructions Instructions describing how to use the server and its features
   * @returns This server instance for chaining
   */
  setInstructions(instructions: string): this {
    this.instructions = instructions;
    return this;
  }

  handleInitialize(): ExtendedInitializeResponse {
    this.ensureDynamicResourcesInitialized();
    this.ensureDynamicPromptsInitialized();

    const hasTools = this.tools.size > 0;
    const hasResources =
      this.resources.size > 0 || this.dynamicResources.size > 0 || this.resourceTemplates.size > 0;
    const hasSubscribableResources = [
      ...this.resources.values(),
      ...this.dynamicResources.values(),
    ].some((r: ResourceMetadata) => r.subscribable === true);
    const hasPrompts =
      this.prompts.size > 0 || this.dynamicPrompts.size > 0 || this.promptTemplates.size > 0;

    // Build capabilities object dynamically to exclude undefined values
    const capabilities: Record<string, any> = {};

    if (hasTools) {
      capabilities.tools = {};
    }

    if (hasResources) {
      capabilities.resources = {
        listChanged: true,
      };
      if (hasSubscribableResources) {
        capabilities.resources.subscribe = true;
      }
    }

    if (hasPrompts) {
      capabilities.prompts = {};
    }

    const result: ExtendedInitializeResponse = {
      protocolVersion: '2025-06-18',
      capabilities,
      serverInfo: {
        name: this.serverName,
        version: this.serverVersion,
      },
    };

    if (this.instructions) {
      result.instructions = this.instructions;
    }

    return result;
  }

  listTools(_cursor?: string): Tool[] | { tools: Tool[]; nextCursor?: string } {
    return map(Array.from(this.tools.values()), (meta) =>
      generateToolSchema(meta.name, meta.description, meta.params)
    );
  }

  protected getAllResources(): Resource[] {
    this.ensureDynamicResourcesInitialized();

    const staticResources = map(Array.from(this.resources.values()), (meta) => ({
      uri: meta.uri,
      name: meta.method,
      description: meta.description,
      mimeType: resolveMimeType(meta.uri, meta.mimeType),
    }));

    const dynamicResourcesList = map(Array.from(this.dynamicResources.values()), (meta) => ({
      uri: meta.uri,
      name: meta.method,
      description: meta.description,
      mimeType: resolveMimeType(meta.uri, meta.mimeType),
    }));

    return [...staticResources, ...dynamicResourcesList];
  }

  listResources(cursor?: string): Resource[] | { resources: Resource[]; nextCursor?: string } {
    const allResources = this.getAllResources();

    // Implement pagination when there are many resources or cursor is provided
    const pageSize = 50;

    // If few resources and no cursor, return simple array for backward compatibility
    if (allResources.length <= pageSize && cursor === undefined) {
      return allResources;
    }

    // Parse cursor to get start index
    let startIndex = 0;
    if (cursor) {
      try {
        const cursorData = JSON.parse(Buffer.from(cursor, 'base64').toString());
        startIndex = cursorData.offset || 0;
      } catch {
        // Invalid cursor, start from beginning
        startIndex = 0;
      }
    }

    // Get the page of resources
    const endIndex = Math.min(startIndex + pageSize, allResources.length);
    const pageResources = allResources.slice(startIndex, endIndex);

    // Determine if there's a next page
    const hasMore = endIndex < allResources.length;
    const nextCursor = hasMore
      ? Buffer.from(JSON.stringify({ offset: endIndex })).toString('base64')
      : undefined;

    return {
      resources: pageResources,
      ...(nextCursor && { nextCursor }),
    };
  }

  listResourceTemplates(): ResourceTemplate[] {
    return map(Array.from(this.resourceTemplates.values()), (meta) => ({
      uriTemplate: meta.uriTemplate,
      name: meta.name || meta.method,
      description: meta.description,
      mimeType: resolveMimeType(meta.uriTemplate, meta.mimeType),
    }));
  }

  listPrompts(_cursor?: string): Prompt[] | { prompts: Prompt[]; nextCursor?: string } {
    this.ensureDynamicPromptsInitialized();

    const staticPrompts = map(Array.from(this.prompts.values()), (meta) =>
      generatePromptSchema(meta.name, meta.description, meta.params)
    );

    const dynamicPromptsList = map(Array.from(this.dynamicPrompts.values()), (meta) =>
      generatePromptSchema(meta.name, meta.description, meta.params)
    );

    return [...staticPrompts, ...dynamicPromptsList];
  }

  async callTool(name: string, args?: unknown): Promise<Result<ToolCallResponse, McpError>> {
    const toolMeta = find(Array.from(this.tools.values()), (t) => t.name === name);

    if (!toolMeta) {
      return err(ToolErrors.notFound(name));
    }

    if (toolMeta.params && toolMeta.params.length > 0) {
      const validation = validateParams(toolMeta.params, args);
      if (!validation.success) {
        // Extract the first validation error message for better UX
        const firstError = validation.error.errors[0];
        const errorMessage = firstError?.message || 'Invalid parameters';
        // Include validation errors in the data field
        return err(
          new McpError(ErrorCode.InvalidParams, `Invalid tool arguments: ${errorMessage}`, {
            validationErrors: validation.error.errors,
          })
        );
      }
    }

    const argsObject = args as Record<string, unknown> | undefined;
    const argsArray = MethodInvoker.prepareArguments(toolMeta.params, argsObject);

    return MethodInvoker.invokeMethod(this, toolMeta.method, argsArray).then((result) =>
      result.map((value) => MethodInvoker.createToolResponse(value)).mapErr((error) => error)
    );
  }

  async readResource(uri: string): Promise<Result<unknown, McpError>> {
    this.ensureDynamicResourcesInitialized();

    // Validate URI format
    if (!this.isValidUri(uri)) {
      return err(ResourceErrors.invalidUri(uri));
    }

    let resourceMeta = find(Array.from(this.resources.values()), (r) => r.uri === uri);

    if (!resourceMeta) {
      resourceMeta = this.dynamicResources.get(uri);
    }

    if (!resourceMeta) {
      const templateMatch = this.findTemplateMatch(uri);
      if (templateMatch) {
        return this.readResourceFromTemplate(uri, templateMatch);
      }
    }

    if (!resourceMeta) {
      return err(ResourceErrors.notFound(uri));
    }

    return MethodInvoker.invokeMethod(this, resourceMeta.method, []).then((result) =>
      result.map((value) =>
        MethodInvoker.createResourceResponse(
          uri,
          value,
          resolveMimeType(uri, resourceMeta.mimeType, 'application/json')
        )
      )
    );
  }

  async getPrompt(name: string, args?: unknown): Promise<Result<unknown, McpError>> {
    this.ensureDynamicPromptsInitialized();

    let promptMeta = find(Array.from(this.prompts.values()), (p) => p.name === name);

    if (!promptMeta) {
      promptMeta = this.dynamicPrompts.get(name);
    }

    if (!promptMeta) {
      const templateMatch = this.findPromptTemplateMatch(name);
      if (templateMatch) {
        return this.getPromptFromTemplate(name, templateMatch, args);
      }
    }

    if (!promptMeta) {
      return err(PromptErrors.notFound(name));
    }

    if (promptMeta.params && promptMeta.params.length > 0) {
      const validation = validateParams(promptMeta.params, args);
      if (!validation.success) {
        // Extract the first validation error message for better UX
        const firstError = validation.error.errors[0];
        const errorMessage = firstError?.message || 'Invalid parameters';
        return err(PromptErrors.invalidArguments(errorMessage));
      }
    }

    const argsObject = args as Record<string, unknown> | undefined;
    const argsArray = MethodInvoker.prepareArguments(promptMeta.params, argsObject);

    return MethodInvoker.invokeMethod(this, promptMeta.method, argsArray);
  }

  async subscribeToResource(clientId: string, uri: string): Promise<Result<void, McpError>> {
    const resourceMeta = find(
      [...this.resources.values(), ...this.dynamicResources.values()],
      (r) => r.uri === uri
    );

    if (!resourceMeta) {
      return err(ResourceErrors.notFound(uri));
    }

    if (!resourceMeta.subscribable) {
      return err(ResourceErrors.subscriptionNotSupported(uri));
    }

    return this.subscriptionManager
      .subscribe(clientId, uri)
      .map(() => undefined)
      .mapErr((error) => ResourceErrors.internalError(error.message));
  }

  async unsubscribeFromResource(clientId: string, uri: string): Promise<Result<void, McpError>> {
    return this.subscriptionManager
      .unsubscribe(clientId, uri)
      .map(() => undefined)
      .mapErr((error) => ResourceErrors.internalError(error.message));
  }

  registerResource(
    uri: string,
    handler: () => Promise<Result<unknown, string>>,
    description?: string,
    subscribable?: boolean,
    mimeType?: string
  ): Result<void, Error> {
    return wrapSync(
      () => {
        const methodName = `dynamic_${uri.replace(/[^a-zA-Z0-9]/g, '_')}`;
        this.dynamicResources.set(uri, {
          uri,
          description,
          method: methodName,
          subscribable,
          mimeType,
        });
        (this as Record<string, unknown>)[methodName] = handler;

        this.notificationManager.notifyListChanged();
      },
      (error) => new Error(`Failed to register resource: ${error}`)
    );
  }

  unregisterResource(uri: string): Result<void, Error> {
    return wrapSync(
      () => {
        const meta = this.dynamicResources.get(uri);
        if (meta) {
          delete (this as Record<string, unknown>)[meta.method];
          this.dynamicResources.delete(uri);

          const subscribers = this.subscriptionManager.getSubscribers(uri);
          subscribers.forEach((clientId) => {
            this.subscriptionManager.unsubscribe(clientId, uri);
          });

          this.notificationManager.notifyListChanged();
        }
      },
      (error) => new Error(`Failed to unregister resource: ${error}`)
    );
  }

  registerPrompt(
    name: string,
    handler: (...args: unknown[]) => Promise<Result<unknown, string>>,
    description?: string,
    params?: ParamMetadata[]
  ): Result<void, Error> {
    return wrapSync(
      () => {
        const methodName = `dynamic_prompt_${name.replace(/[^a-zA-Z0-9]/g, '_')}`;
        this.dynamicPrompts.set(name, {
          name,
          description: description || '',
          method: methodName,
          params,
        });
        (this as Record<string, unknown>)[methodName] = handler;
      },
      (error) => new Error(`Failed to register prompt: ${error}`)
    );
  }

  unregisterPrompt(name: string): Result<void, Error> {
    return wrapSync(
      () => {
        const meta = this.dynamicPrompts.get(name);
        if (meta) {
          delete (this as Record<string, unknown>)[meta.method];
          this.dynamicPrompts.delete(name);
        }
      },
      (error) => new Error(`Failed to unregister prompt: ${error}`)
    );
  }

  setNotificationSender(sender: NotificationSender): void {
    this.notificationManager.setSender(sender);
  }

  async notifyResourceUpdate(uri: string): Promise<Result<void, Error>> {
    return this.notificationManager.notifyResourceUpdate(uri);
  }

  async notifyListChanged(): Promise<Result<void, Error>> {
    return this.notificationManager.notifyListChanged();
  }

  private findTemplateMatch(uri: string): ResourceTemplateMetadata | null {
    for (const template of this.resourceTemplates.values()) {
      try {
        // Use uri-template-lite to match the URI against the template
        const parsedTemplate = new UriTemplate(template.uriTemplate);
        const params = parsedTemplate.match(uri);
        if (params) {
          return template;
        }
      } catch {
        // Skip invalid templates
        continue;
      }
    }
    return null;
  }

  private async readResourceFromTemplate(
    uri: string,
    template: ResourceTemplateMetadata
  ): Promise<Result<unknown, McpError>> {
    try {
      // Use uri-template-lite to extract parameters from the URI
      const parsedTemplate = new UriTemplate(template.uriTemplate);
      const params = parsedTemplate.match(uri);

      if (!params) {
        return err(ResourceErrors.templateMatchFailed(template.uriTemplate, uri));
      }

      return MethodInvoker.invokeMethod(this, template.method, [params]).then(
        (result) =>
          result.map((value) =>
            MethodInvoker.createResourceResponse(
              uri,
              value,
              resolveMimeType(uri, template.mimeType, 'application/json')
            )
          )
        // McpError will be preserved by MethodInvoker
      );
    } catch (error) {
      return err(ResourceErrors.internalError(`Failed to parse template: ${error}`));
    }
  }

  async getCompletion(
    ref: unknown,
    argument: unknown
  ): Promise<Result<CompletionResponse, McpError>> {
    const completionRef = ref as { type: string; uri?: string; name?: string };
    const completionArg = argument as { name: string; value: string };

    if (!completionRef?.type) {
      return err(CompletionErrors.invalidReference('Missing or invalid type'));
    }

    return match(completionRef.type)
      .with('ref/resource', () =>
        this.getResourceCompletion(completionRef.uri || '', completionArg)
      )
      .with('ref/prompt', () => this.getPromptCompletion(completionRef.name || '', completionArg))
      .otherwise(() => err(CompletionErrors.invalidReference('Unknown completion reference type')));
  }

  private async getResourceCompletion(
    uri: string,
    argument: { name: string; value: string }
  ): Promise<Result<CompletionResponse, McpError>> {
    const templateCompletions: string[] = [];

    for (const template of this.resourceTemplates.values()) {
      if (
        template.uriTemplate.includes('{') &&
        uri.startsWith(template.uriTemplate.split('{')[0])
      ) {
        const paramName = template.uriTemplate.match(/\{([^}]+)\}/)?.[1];
        if (paramName && argument.name === paramName) {
          const baseUri = template.uriTemplate.split('{')[0];
          const possibleValues = await this.getTemplateCompletions(template, argument.value);
          templateCompletions.push(...possibleValues.map((v) => `${baseUri}${v}`));
        }
      }
    }

    const staticCompletions = Array.from(this.resources.values())
      .filter((r) => r.uri.toLowerCase().includes(argument.value.toLowerCase()))
      .map((r) => r.uri);

    const dynamicCompletions = Array.from(this.dynamicResources.values())
      .filter((r) => r.uri.toLowerCase().includes(argument.value.toLowerCase()))
      .map((r) => r.uri);

    const allCompletions = [
      ...templateCompletions,
      ...staticCompletions,
      ...dynamicCompletions,
    ].slice(0, 100);

    return ok({
      completion: {
        values: allCompletions,
        total: allCompletions.length,
        hasMore: false,
      },
    });
  }

  private async getPromptCompletion(
    name: string,
    argument: { name: string; value: string }
  ): Promise<Result<CompletionResponse, McpError>> {
    const prompt = find(
      [...Array.from(this.prompts.values()), ...Array.from(this.dynamicPrompts.values())],
      (p) => p.name === name
    );

    if (!prompt) {
      return err(PromptErrors.notFound(name));
    }

    const param = prompt.params?.find((p) => p.name === argument.name);
    if (!param || !param.type) {
      return ok({
        completion: {
          values: [],
          total: 0,
          hasMore: false,
        },
      });
    }

    const suggestions = await this.getParamCompletions(
      param as { name: string; type: string; description?: string },
      argument.value
    );
    const values = suggestions.map((s) => (typeof s === 'string' ? s : s.value));

    return ok({
      completion: {
        values: values.slice(0, 100),
        total: values.length,
        hasMore: values.length > 100,
      },
    });
  }

  protected async getTemplateCompletions(
    _template: ResourceTemplateMetadata,
    _currentValue: string
  ): Promise<string[]> {
    return [];
  }

  protected async getParamCompletions(
    _param: { name: string; type: string; description?: string },
    _currentValue: string
  ): Promise<Array<{ value: string; description?: string }>> {
    return [];
  }

  private isValidUri(uri: string): boolean {
    // Basic URI validation - must have a scheme
    const uriPattern = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
    return uriPattern.test(uri);
  }

  private ensureDynamicResourcesInitialized(): void {
    if (this.dynamicResourcesInitialized) {
      return;
    }

    const dynamicResourceMethods = getAllDynamicResourcesMetadata(this.constructor);

    dynamicResourceMethods.forEach((meta) => {
      const method = (this as Record<string, unknown>)[meta.method];
      if (typeof method === 'function') {
        method.call(this);
      }
    });

    this.dynamicResourcesInitialized = true;
  }

  private ensureDynamicPromptsInitialized(): void {
    if (this.dynamicPromptsInitialized) {
      return;
    }

    const dynamicPromptMethods = getAllDynamicPromptsMetadata(this.constructor);

    dynamicPromptMethods.forEach((meta) => {
      const method = (this as Record<string, unknown>)[meta.method];
      if (typeof method === 'function') {
        method.call(this);
      }
    });

    this.dynamicPromptsInitialized = true;
  }

  private findPromptTemplateMatch(name: string): PromptTemplateMetadata | null {
    for (const template of this.promptTemplates.values()) {
      try {
        // Use uri-template-lite to match the prompt name against the template
        const parsedTemplate = new UriTemplate(template.nameTemplate);
        const params = parsedTemplate.match(name);
        if (params) {
          // Check that all parameters have non-empty values and don't contain path separators
          const allParamsValid = Object.values(params).every(
            (value) => value && value !== '' && !String(value).includes('/')
          );
          if (allParamsValid) {
            return template;
          }
        }
      } catch {
        // Skip invalid templates
        continue;
      }
    }
    return null;
  }

  private async getPromptFromTemplate(
    name: string,
    template: PromptTemplateMetadata,
    args?: unknown
  ): Promise<Result<unknown, McpError>> {
    try {
      // Use uri-template-lite to extract parameters from the prompt name
      const parsedTemplate = new UriTemplate(template.nameTemplate);
      const extractedParams = parsedTemplate.match(name);

      if (!extractedParams) {
        return err(PromptErrors.templateMatchFailed(template.nameTemplate, name));
      }

      // Validate that extracted parameters are not empty and don't contain path separators
      for (const value of Object.values(extractedParams)) {
        if (!value || value === '' || String(value).includes('/')) {
          return err(PromptErrors.notFound(name));
        }
      }

      // Get template parameter names
      const templateParams = Object.keys(extractedParams);

      // Check if method expects a second parameter for additional arguments
      const method = (this as Record<string, unknown>)[template.method] as Function;
      const methodLength = method.length;

      if (methodLength >= 2 && args && Object.keys(args as object).length > 0) {
        // Method accepts additional arguments as second parameter
        // Filter out template parameters from args to get only additional ones
        const additionalArgs = Object.entries(args as object).reduce(
          (acc, [key, value]) => {
            if (!templateParams.includes(key)) {
              acc[key] = value;
            }
            return acc;
          },
          {} as Record<string, unknown>
        );

        return MethodInvoker.invokeMethod(this, template.method, [extractedParams, additionalArgs]);
      } else {
        // Method only accepts template parameters, combine all arguments
        const combinedArgs = { ...extractedParams, ...(args as object) };
        return MethodInvoker.invokeMethod(this, template.method, [combinedArgs]);
      }
    } catch (error) {
      return err(PromptErrors.internalError(`Failed to parse template: ${error}`));
    }
  }
}
