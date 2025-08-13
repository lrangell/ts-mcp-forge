import { Result, ok, err } from 'neverthrow';
import { map, find } from 'remeda';
import { match } from 'ts-pattern';
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
import { JsonRpcError, ErrorCodes } from './jsonrpc.js';
import { SubscriptionManager } from './subscription-manager.js';
import { NotificationManager, NotificationSender } from './notifications.js';
import { wrapSync } from '../utils/error-handling.js';
import { toTextContent } from '../utils/string-conversion.js';

const ErrorMessages = {
  TOOL_NOT_FOUND: (name: string) => `Tool '${name}' not found`,
  RESOURCE_NOT_FOUND: (uri: string) => `Resource '${uri}' not found`,
  PROMPT_NOT_FOUND: (name: string) => `Prompt '${name}' not found`,
  METHOD_NOT_FOUND: (method: string) => `Method '${method}' not found`,
  EXECUTION_FAILED: 'Execution failed',
} as const;

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

    // Initialize dynamic resources
    this.initializeDynamicResources();

    // Initialize dynamic prompts
    this.initializeDynamicPrompts();
  }

  handleInitialize(): InitializeResponse {
    const hasResources =
      this.resources.size > 0 || this.dynamicResources.size > 0 || this.resourceTemplates.size > 0;
    const hasSubscribableResources = [
      ...this.resources.values(),
      ...this.dynamicResources.values(),
    ].some((r: ResourceMetadata) => r.subscribable === true);
    const hasPrompts =
      this.prompts.size > 0 || this.dynamicPrompts.size > 0 || this.promptTemplates.size > 0;

    return {
      protocolVersion: '2025-06-18',
      capabilities: {
        tools: this.tools.size > 0 ? {} : undefined,
        resources: hasResources
          ? {
              subscribe: hasSubscribableResources || undefined,
              listChanged: true,
            }
          : undefined,
        prompts: hasPrompts ? {} : undefined,
      },
      serverInfo: {
        name: this.serverName,
        version: this.serverVersion,
      },
    };
  }

  listTools(): Tool[] {
    return map(Array.from(this.tools.values()), (meta) =>
      generateToolSchema(meta.name, meta.description, meta.params)
    );
  }

  listResources(): Resource[] {
    const staticResources = map(Array.from(this.resources.values()), (meta) => ({
      uri: meta.uri,
      name: meta.method,
      description: meta.description,
    }));

    const dynamicResourcesList = map(Array.from(this.dynamicResources.values()), (meta) => ({
      uri: meta.uri,
      name: meta.method,
      description: meta.description,
    }));

    return [...staticResources, ...dynamicResourcesList];
  }

  listResourceTemplates(): ResourceTemplate[] {
    return map(Array.from(this.resourceTemplates.values()), (meta) => ({
      uriTemplate: meta.uriTemplate,
      name: meta.name || meta.method,
      description: meta.description,
      mimeType: meta.mimeType,
    }));
  }

  listPrompts(): Prompt[] {
    const staticPrompts = map(Array.from(this.prompts.values()), (meta) =>
      generatePromptSchema(meta.name, meta.description, meta.params)
    );

    const dynamicPromptsList = map(Array.from(this.dynamicPrompts.values()), (meta) =>
      generatePromptSchema(meta.name, meta.description, meta.params)
    );

    return [...staticPrompts, ...dynamicPromptsList];
  }

  async callTool(name: string, args?: unknown): Promise<Result<ToolCallResponse, JsonRpcError>> {
    const toolMeta = find(Array.from(this.tools.values()), (t) => t.name === name);

    if (!toolMeta) {
      return err(new JsonRpcError(ErrorCodes.METHOD_NOT_FOUND, ErrorMessages.TOOL_NOT_FOUND(name)));
    }

    const method = (this as any)[toolMeta.method];
    if (typeof method !== 'function') {
      return err(
        new JsonRpcError(ErrorCodes.INTERNAL_ERROR, ErrorMessages.METHOD_NOT_FOUND(toolMeta.method))
      );
    }

    if (toolMeta.params && toolMeta.params.length > 0) {
      const validation = validateParams(toolMeta.params, args);
      if (!validation.success) {
        return err(
          new JsonRpcError(ErrorCodes.INVALID_PARAMS, 'Invalid parameters', validation.error.errors)
        );
      }
    }

    const argsObject = args as Record<string, unknown> | undefined;
    const argsArray = toolMeta.params ? toolMeta.params.map((p) => argsObject?.[p.name]) : [];
    const result = await method.apply(this, argsArray);

    if (result && typeof result === 'object' && 'isOk' in result) {
      return result
        .map((value: any) => ({
          content: [
            {
              type: 'text',
              text: toTextContent(value),
            },
          ],
        }))
        .mapErr((error: any) => {
          const errorMessage =
            typeof error === 'string' ? error : error.message || ErrorMessages.EXECUTION_FAILED;
          return new JsonRpcError(ErrorCodes.INTERNAL_ERROR, errorMessage);
        });
    }

    return ok({
      content: [
        {
          type: 'text',
          text: toTextContent(result),
        },
      ],
    });
  }

  async readResource(uri: string): Promise<Result<any, JsonRpcError>> {
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
      return err(
        new JsonRpcError(ErrorCodes.METHOD_NOT_FOUND, ErrorMessages.RESOURCE_NOT_FOUND(uri))
      );
    }

    const method = (this as any)[resourceMeta.method];
    if (typeof method !== 'function') {
      return err(
        new JsonRpcError(
          ErrorCodes.INTERNAL_ERROR,
          ErrorMessages.METHOD_NOT_FOUND(resourceMeta.method)
        )
      );
    }

    const result = await method.call(this);

    if (result && typeof result === 'object' && 'isOk' in result) {
      return result
        .map((resourceData: any) => ({
          contents: [
            {
              uri: uri,
              mimeType: 'application/json',
              text: toTextContent(resourceData),
            },
          ],
        }))
        .mapErr((error: any) => {
          const errorMessage =
            typeof error === 'string' ? error : error.message || ErrorMessages.EXECUTION_FAILED;
          return new JsonRpcError(ErrorCodes.INTERNAL_ERROR, errorMessage);
        });
    }

    return ok({
      contents: [
        {
          uri: uri,
          mimeType: 'application/json',
          text: toTextContent(result),
        },
      ],
    });
  }

  async getPrompt(name: string, args?: unknown): Promise<Result<unknown, JsonRpcError>> {
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
      return err(
        new JsonRpcError(ErrorCodes.METHOD_NOT_FOUND, ErrorMessages.PROMPT_NOT_FOUND(name))
      );
    }

    const method = (this as any)[promptMeta.method];
    if (typeof method !== 'function') {
      return err(
        new JsonRpcError(
          ErrorCodes.INTERNAL_ERROR,
          ErrorMessages.METHOD_NOT_FOUND(promptMeta.method)
        )
      );
    }

    if (promptMeta.params && promptMeta.params.length > 0) {
      const validation = validateParams(promptMeta.params, args);
      if (!validation.success) {
        return err(
          new JsonRpcError(ErrorCodes.INVALID_PARAMS, 'Invalid parameters', validation.error.errors)
        );
      }
    }

    const argsObject = args as Record<string, unknown> | undefined;
    const argsArray = promptMeta.params ? promptMeta.params.map((p) => argsObject?.[p.name]) : [];
    const result = await method.apply(this, argsArray);

    if (result && typeof result === 'object' && 'isOk' in result) {
      return result.mapErr((error: any) => {
        const errorMessage =
          typeof error === 'string' ? error : error.message || ErrorMessages.EXECUTION_FAILED;
        return new JsonRpcError(ErrorCodes.INTERNAL_ERROR, errorMessage);
      });
    }

    return ok(result);
  }

  async subscribeToResource(clientId: string, uri: string): Promise<Result<void, JsonRpcError>> {
    const resourceMeta = find(
      [...this.resources.values(), ...this.dynamicResources.values()],
      (r) => r.uri === uri
    );

    if (!resourceMeta) {
      return err(
        new JsonRpcError(ErrorCodes.METHOD_NOT_FOUND, ErrorMessages.RESOURCE_NOT_FOUND(uri))
      );
    }

    if (!resourceMeta.subscribable) {
      return err(
        new JsonRpcError(ErrorCodes.INVALID_REQUEST, `Resource '${uri}' is not subscribable`)
      );
    }

    return this.subscriptionManager
      .subscribe(clientId, uri)
      .map(() => undefined)
      .mapErr((error) => new JsonRpcError(ErrorCodes.INTERNAL_ERROR, error.message));
  }

  async unsubscribeFromResource(
    clientId: string,
    uri: string
  ): Promise<Result<void, JsonRpcError>> {
    return this.subscriptionManager
      .unsubscribe(clientId, uri)
      .map(() => undefined)
      .mapErr((error) => new JsonRpcError(ErrorCodes.INTERNAL_ERROR, error.message));
  }

  registerResource(
    uri: string,
    handler: () => Promise<Result<unknown, string>>,
    description?: string,
    subscribable?: boolean
  ): Result<void, Error> {
    return wrapSync(
      () => {
        const methodName = `dynamic_${uri.replace(/[^a-zA-Z0-9]/g, '_')}`;
        this.dynamicResources.set(uri, {
          uri,
          description,
          method: methodName,
          subscribable,
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
    handler: (...args: any[]) => Promise<Result<unknown, string>>,
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
      if (uri.includes(template.uriTemplate.split('{')[0])) {
        return template;
      }
    }
    return null;
  }

  private async readResourceFromTemplate(
    uri: string,
    template: ResourceTemplateMetadata
  ): Promise<Result<any, JsonRpcError>> {
    const method = (this as any)[template.method];
    if (typeof method !== 'function') {
      return err(
        new JsonRpcError(ErrorCodes.INTERNAL_ERROR, ErrorMessages.METHOD_NOT_FOUND(template.method))
      );
    }

    const params = { path: uri.split('/').pop() };

    const result = await method.call(this, params);

    if (result && typeof result === 'object' && 'isOk' in result) {
      return result
        .map((resourceData: any) => ({
          contents: [
            {
              uri: uri,
              mimeType: template.mimeType || 'application/json',
              text: toTextContent(resourceData),
            },
          ],
        }))
        .mapErr((error: any) => {
          const errorMessage =
            typeof error === 'string' ? error : error.message || ErrorMessages.EXECUTION_FAILED;
          return new JsonRpcError(ErrorCodes.INTERNAL_ERROR, errorMessage);
        });
    }

    return ok({
      contents: [
        {
          uri: uri,
          mimeType: template.mimeType || 'application/json',
          text: toTextContent(result),
        },
      ],
    });
  }

  async getCompletion(
    ref: unknown,
    argument: unknown
  ): Promise<Result<CompletionResponse, JsonRpcError>> {
    const completionRef = ref as { type: string; uri?: string; name?: string };
    const completionArg = argument as { name: string; value: string };

    if (!completionRef?.type) {
      return err(new JsonRpcError(ErrorCodes.INVALID_PARAMS, 'Invalid completion reference'));
    }

    return match(completionRef.type)
      .with('ref/resource', () =>
        this.getResourceCompletion(completionRef.uri || '', completionArg)
      )
      .with('ref/prompt', () => this.getPromptCompletion(completionRef.name || '', completionArg))
      .otherwise(() =>
        err(new JsonRpcError(ErrorCodes.INVALID_PARAMS, 'Unknown completion reference type'))
      );
  }

  private async getResourceCompletion(
    uri: string,
    argument: { name: string; value: string }
  ): Promise<Result<CompletionResponse, JsonRpcError>> {
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
  ): Promise<Result<CompletionResponse, JsonRpcError>> {
    const prompt = find(
      [...Array.from(this.prompts.values()), ...Array.from(this.dynamicPrompts.values())],
      (p) => p.name === name
    );

    if (!prompt) {
      return err(
        new JsonRpcError(ErrorCodes.METHOD_NOT_FOUND, ErrorMessages.PROMPT_NOT_FOUND(name))
      );
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

  private initializeDynamicResources(): void {
    const dynamicResourceMethods = getAllDynamicResourcesMetadata(this.constructor);

    dynamicResourceMethods.forEach((meta) => {
      const method = (this as any)[meta.method];
      if (typeof method === 'function') {
        // Call the method to initialize dynamic resources
        method.call(this);
      }
    });
  }

  private initializeDynamicPrompts(): void {
    const dynamicPromptMethods = getAllDynamicPromptsMetadata(this.constructor);

    dynamicPromptMethods.forEach((meta) => {
      const method = (this as any)[meta.method];
      if (typeof method === 'function') {
        // Call the method to initialize dynamic prompts
        method.call(this);
      }
    });
  }

  private findPromptTemplateMatch(name: string): PromptTemplateMetadata | null {
    for (const template of this.promptTemplates.values()) {
      // Simple pattern matching - check if name matches template pattern
      const pattern = template.nameTemplate.replace(/{[^}]+}/g, '([^/]+)');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(name)) {
        return template;
      }
    }
    return null;
  }

  private async getPromptFromTemplate(
    name: string,
    template: PromptTemplateMetadata,
    args?: unknown
  ): Promise<Result<any, JsonRpcError>> {
    const method = (this as any)[template.method];
    if (typeof method !== 'function') {
      return err(
        new JsonRpcError(ErrorCodes.INTERNAL_ERROR, ErrorMessages.METHOD_NOT_FOUND(template.method))
      );
    }

    // Extract parameters from the name based on the template
    const pattern = template.nameTemplate.replace(/{([^}]+)}/g, '(?<$1>[^/]+)');
    const regex = new RegExp(`^${pattern}$`);
    const match = name.match(regex);

    const params = match?.groups || {};
    const combinedArgs = { ...params, ...(args as object) };

    const result = await method.call(this, combinedArgs);

    if (result && typeof result === 'object' && 'isOk' in result) {
      return result.mapErr((error: any) => {
        const errorMessage =
          typeof error === 'string' ? error : error.message || ErrorMessages.EXECUTION_FAILED;
        return new JsonRpcError(ErrorCodes.INTERNAL_ERROR, errorMessage);
      });
    }

    return ok(result);
  }
}
