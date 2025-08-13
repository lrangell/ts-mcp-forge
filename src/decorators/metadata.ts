import 'reflect-metadata';

const TOOL_METADATA = Symbol('tool');
const RESOURCE_METADATA = Symbol('resource');
const RESOURCE_TEMPLATE_METADATA = Symbol('resourceTemplate');
const PROMPT_METADATA = Symbol('prompt');
const PARAM_METADATA = Symbol('param');
const DYNAMIC_RESOURCE_METADATA = Symbol('dynamicResource');
const DYNAMIC_PROMPT_METADATA = Symbol('dynamicPrompt');
const PROMPT_TEMPLATE_METADATA = Symbol('promptTemplate');

export interface ParamMetadata {
  index: number;
  name: string;
  description: string;
  type?: unknown;
}

export interface ToolMetadata {
  name: string;
  description: string;
  method: string;
  paramTypes?: unknown[];
  returnType?: unknown;
  params?: ParamMetadata[];
}

export interface ResourceMetadata {
  uri: string;
  description?: string;
  method: string;
  subscribable?: boolean;
}

export interface ResourceTemplateMetadata {
  uriTemplate: string;
  name?: string;
  description?: string;
  mimeType?: string;
  method: string;
}

export interface PromptMetadata {
  name: string;
  description: string;
  method: string;
  params?: ParamMetadata[];
}

export interface DynamicResourceMetadata {
  method: string;
  description?: string;
}

export interface DynamicPromptMetadata {
  method: string;
  description?: string;
}

export interface PromptTemplateMetadata {
  nameTemplate: string;
  description?: string;
  method: string;
}

export const setToolMetadata = (
  target: object,
  propertyKey: string,
  metadata: ToolMetadata
): void => {
  Reflect.defineMetadata(TOOL_METADATA, metadata, target, propertyKey);
};

export const getToolMetadata = (target: object, propertyKey: string): ToolMetadata | undefined => {
  return Reflect.getMetadata(TOOL_METADATA, target, propertyKey);
};

export const setResourceMetadata = (
  target: object,
  propertyKey: string,
  metadata: ResourceMetadata
): void => {
  Reflect.defineMetadata(RESOURCE_METADATA, metadata, target, propertyKey);
};

export const getResourceMetadata = (
  target: object,
  propertyKey: string
): ResourceMetadata | undefined => {
  return Reflect.getMetadata(RESOURCE_METADATA, target, propertyKey);
};

export const setResourceTemplateMetadata = (
  target: object,
  propertyKey: string,
  metadata: ResourceTemplateMetadata
): void => {
  Reflect.defineMetadata(RESOURCE_TEMPLATE_METADATA, metadata, target, propertyKey);
};

export const getResourceTemplateMetadata = (
  target: object,
  propertyKey: string
): ResourceTemplateMetadata | undefined => {
  return Reflect.getMetadata(RESOURCE_TEMPLATE_METADATA, target, propertyKey);
};

export const setPromptMetadata = (
  target: object,
  propertyKey: string,
  metadata: PromptMetadata
): void => {
  Reflect.defineMetadata(PROMPT_METADATA, metadata, target, propertyKey);
};

export const getPromptMetadata = (
  target: object,
  propertyKey: string
): PromptMetadata | undefined => {
  return Reflect.getMetadata(PROMPT_METADATA, target, propertyKey);
};

export const setParamMetadata = (
  target: object,
  propertyKey: string,
  index: number,
  metadata: Omit<ParamMetadata, 'index'>
): void => {
  const existing = Reflect.getMetadata(PARAM_METADATA, target, propertyKey) || [];
  existing[index] = { ...metadata, index };
  Reflect.defineMetadata(PARAM_METADATA, existing, target, propertyKey);
};

export const getParamMetadata = (
  target: object,
  propertyKey: string
): ParamMetadata[] | undefined => {
  return Reflect.getMetadata(PARAM_METADATA, target, propertyKey);
};

export const setDynamicResourceMetadata = (
  target: object,
  propertyKey: string,
  metadata: DynamicResourceMetadata
): void => {
  Reflect.defineMetadata(DYNAMIC_RESOURCE_METADATA, metadata, target, propertyKey);
};

export const getDynamicResourceMetadata = (
  target: object,
  propertyKey: string
): DynamicResourceMetadata | undefined => {
  return Reflect.getMetadata(DYNAMIC_RESOURCE_METADATA, target, propertyKey);
};

export const setDynamicPromptMetadata = (
  target: object,
  propertyKey: string,
  metadata: DynamicPromptMetadata
): void => {
  Reflect.defineMetadata(DYNAMIC_PROMPT_METADATA, metadata, target, propertyKey);
};

export const getDynamicPromptMetadata = (
  target: object,
  propertyKey: string
): DynamicPromptMetadata | undefined => {
  return Reflect.getMetadata(DYNAMIC_PROMPT_METADATA, target, propertyKey);
};

export const setPromptTemplateMetadata = (
  target: object,
  propertyKey: string,
  metadata: PromptTemplateMetadata
): void => {
  Reflect.defineMetadata(PROMPT_TEMPLATE_METADATA, metadata, target, propertyKey);
};

export const getPromptTemplateMetadata = (
  target: object,
  propertyKey: string
): PromptTemplateMetadata | undefined => {
  return Reflect.getMetadata(PROMPT_TEMPLATE_METADATA, target, propertyKey);
};

export const getAllToolsMetadata = (target: object | Function): Map<string, ToolMetadata> => {
  const metadata = new Map<string, ToolMetadata>();
  const prototype = typeof target === 'function' ? target.prototype : target;

  Object.getOwnPropertyNames(prototype).forEach((propertyKey) => {
    if (propertyKey === 'constructor') return;

    const toolMeta = getToolMetadata(prototype, propertyKey);
    if (toolMeta) {
      metadata.set(propertyKey, toolMeta);
    }
  });

  return metadata;
};

export const getAllResourcesMetadata = (
  target: object | Function
): Map<string, ResourceMetadata> => {
  const metadata = new Map<string, ResourceMetadata>();
  const prototype = typeof target === 'function' ? target.prototype : target;

  Object.getOwnPropertyNames(prototype).forEach((propertyKey) => {
    if (propertyKey === 'constructor') return;

    const resourceMeta = getResourceMetadata(prototype, propertyKey);
    if (resourceMeta) {
      metadata.set(propertyKey, resourceMeta);
    }
  });

  return metadata;
};

export const getAllPromptsMetadata = (target: object | Function): Map<string, PromptMetadata> => {
  const metadata = new Map<string, PromptMetadata>();
  const prototype = typeof target === 'function' ? target.prototype : target;

  Object.getOwnPropertyNames(prototype).forEach((propertyKey) => {
    if (propertyKey === 'constructor') return;

    const promptMeta = getPromptMetadata(prototype, propertyKey);
    if (promptMeta) {
      metadata.set(propertyKey, promptMeta);
    }
  });

  return metadata;
};

export const getAllResourceTemplatesMetadata = (
  target: object | Function
): Map<string, ResourceTemplateMetadata> => {
  const metadata = new Map<string, ResourceTemplateMetadata>();
  const prototype = typeof target === 'function' ? target.prototype : target;

  Object.getOwnPropertyNames(prototype).forEach((propertyKey) => {
    if (propertyKey === 'constructor') return;

    const resourceTemplateMeta = getResourceTemplateMetadata(prototype, propertyKey);
    if (resourceTemplateMeta) {
      metadata.set(propertyKey, resourceTemplateMeta);
    }
  });

  return metadata;
};

export const getAllDynamicResourcesMetadata = (
  target: object | Function
): Map<string, DynamicResourceMetadata> => {
  const metadata = new Map<string, DynamicResourceMetadata>();
  const prototype = typeof target === 'function' ? target.prototype : target;

  Object.getOwnPropertyNames(prototype).forEach((propertyKey) => {
    if (propertyKey === 'constructor') return;

    const dynamicResourceMeta = getDynamicResourceMetadata(prototype, propertyKey);
    if (dynamicResourceMeta) {
      metadata.set(propertyKey, dynamicResourceMeta);
    }
  });

  return metadata;
};

export const getAllDynamicPromptsMetadata = (
  target: object | Function
): Map<string, DynamicPromptMetadata> => {
  const metadata = new Map<string, DynamicPromptMetadata>();
  const prototype = typeof target === 'function' ? target.prototype : target;

  Object.getOwnPropertyNames(prototype).forEach((propertyKey) => {
    if (propertyKey === 'constructor') return;

    const dynamicPromptMeta = getDynamicPromptMetadata(prototype, propertyKey);
    if (dynamicPromptMeta) {
      metadata.set(propertyKey, dynamicPromptMeta);
    }
  });

  return metadata;
};

export const getAllPromptTemplatesMetadata = (
  target: object | Function
): Map<string, PromptTemplateMetadata> => {
  const metadata = new Map<string, PromptTemplateMetadata>();
  const prototype = typeof target === 'function' ? target.prototype : target;

  Object.getOwnPropertyNames(prototype).forEach((propertyKey) => {
    if (propertyKey === 'constructor') return;

    const promptTemplateMeta = getPromptTemplateMetadata(prototype, propertyKey);
    if (promptTemplateMeta) {
      metadata.set(propertyKey, promptTemplateMeta);
    }
  });

  return metadata;
};
