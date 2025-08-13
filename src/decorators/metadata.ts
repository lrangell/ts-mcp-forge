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
  type?: any;
}

export interface ToolMetadata {
  name: string;
  description: string;
  method: string;
  paramTypes?: any[];
  returnType?: any;
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

export const setToolMetadata = (target: any, propertyKey: string, metadata: ToolMetadata): void => {
  Reflect.defineMetadata(TOOL_METADATA, metadata, target, propertyKey);
};

export const getToolMetadata = (target: any, propertyKey: string): ToolMetadata | undefined => {
  return Reflect.getMetadata(TOOL_METADATA, target, propertyKey);
};

export const setResourceMetadata = (
  target: any,
  propertyKey: string,
  metadata: ResourceMetadata
): void => {
  Reflect.defineMetadata(RESOURCE_METADATA, metadata, target, propertyKey);
};

export const getResourceMetadata = (
  target: any,
  propertyKey: string
): ResourceMetadata | undefined => {
  return Reflect.getMetadata(RESOURCE_METADATA, target, propertyKey);
};

export const setResourceTemplateMetadata = (
  target: any,
  propertyKey: string,
  metadata: ResourceTemplateMetadata
): void => {
  Reflect.defineMetadata(RESOURCE_TEMPLATE_METADATA, metadata, target, propertyKey);
};

export const getResourceTemplateMetadata = (
  target: any,
  propertyKey: string
): ResourceTemplateMetadata | undefined => {
  return Reflect.getMetadata(RESOURCE_TEMPLATE_METADATA, target, propertyKey);
};

export const setPromptMetadata = (
  target: any,
  propertyKey: string,
  metadata: PromptMetadata
): void => {
  Reflect.defineMetadata(PROMPT_METADATA, metadata, target, propertyKey);
};

export const getPromptMetadata = (target: any, propertyKey: string): PromptMetadata | undefined => {
  return Reflect.getMetadata(PROMPT_METADATA, target, propertyKey);
};

export const setParamMetadata = (
  target: any,
  propertyKey: string,
  index: number,
  metadata: Omit<ParamMetadata, 'index'>
): void => {
  const existing = Reflect.getMetadata(PARAM_METADATA, target, propertyKey) || [];
  existing[index] = { ...metadata, index };
  Reflect.defineMetadata(PARAM_METADATA, existing, target, propertyKey);
};

export const getParamMetadata = (target: any, propertyKey: string): ParamMetadata[] | undefined => {
  return Reflect.getMetadata(PARAM_METADATA, target, propertyKey);
};

export const setDynamicResourceMetadata = (
  target: any,
  propertyKey: string,
  metadata: DynamicResourceMetadata
): void => {
  Reflect.defineMetadata(DYNAMIC_RESOURCE_METADATA, metadata, target, propertyKey);
};

export const getDynamicResourceMetadata = (
  target: any,
  propertyKey: string
): DynamicResourceMetadata | undefined => {
  return Reflect.getMetadata(DYNAMIC_RESOURCE_METADATA, target, propertyKey);
};

export const setDynamicPromptMetadata = (
  target: any,
  propertyKey: string,
  metadata: DynamicPromptMetadata
): void => {
  Reflect.defineMetadata(DYNAMIC_PROMPT_METADATA, metadata, target, propertyKey);
};

export const getDynamicPromptMetadata = (
  target: any,
  propertyKey: string
): DynamicPromptMetadata | undefined => {
  return Reflect.getMetadata(DYNAMIC_PROMPT_METADATA, target, propertyKey);
};

export const setPromptTemplateMetadata = (
  target: any,
  propertyKey: string,
  metadata: PromptTemplateMetadata
): void => {
  Reflect.defineMetadata(PROMPT_TEMPLATE_METADATA, metadata, target, propertyKey);
};

export const getPromptTemplateMetadata = (
  target: any,
  propertyKey: string
): PromptTemplateMetadata | undefined => {
  return Reflect.getMetadata(PROMPT_TEMPLATE_METADATA, target, propertyKey);
};

export const getAllToolsMetadata = (target: any): Map<string, ToolMetadata> => {
  const metadata = new Map<string, ToolMetadata>();
  const prototype = target.prototype || target;

  Object.getOwnPropertyNames(prototype).forEach((propertyKey) => {
    if (propertyKey === 'constructor') return;

    const toolMeta = getToolMetadata(prototype, propertyKey);
    if (toolMeta) {
      metadata.set(propertyKey, toolMeta);
    }
  });

  return metadata;
};

export const getAllResourcesMetadata = (target: any): Map<string, ResourceMetadata> => {
  const metadata = new Map<string, ResourceMetadata>();
  const prototype = target.prototype || target;

  Object.getOwnPropertyNames(prototype).forEach((propertyKey) => {
    if (propertyKey === 'constructor') return;

    const resourceMeta = getResourceMetadata(prototype, propertyKey);
    if (resourceMeta) {
      metadata.set(propertyKey, resourceMeta);
    }
  });

  return metadata;
};

export const getAllPromptsMetadata = (target: any): Map<string, PromptMetadata> => {
  const metadata = new Map<string, PromptMetadata>();
  const prototype = target.prototype || target;

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
  target: any
): Map<string, ResourceTemplateMetadata> => {
  const metadata = new Map<string, ResourceTemplateMetadata>();
  const prototype = target.prototype || target;

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
  target: any
): Map<string, DynamicResourceMetadata> => {
  const metadata = new Map<string, DynamicResourceMetadata>();
  const prototype = target.prototype || target;

  Object.getOwnPropertyNames(prototype).forEach((propertyKey) => {
    if (propertyKey === 'constructor') return;

    const dynamicResourceMeta = getDynamicResourceMetadata(prototype, propertyKey);
    if (dynamicResourceMeta) {
      metadata.set(propertyKey, dynamicResourceMeta);
    }
  });

  return metadata;
};

export const getAllDynamicPromptsMetadata = (target: any): Map<string, DynamicPromptMetadata> => {
  const metadata = new Map<string, DynamicPromptMetadata>();
  const prototype = target.prototype || target;

  Object.getOwnPropertyNames(prototype).forEach((propertyKey) => {
    if (propertyKey === 'constructor') return;

    const dynamicPromptMeta = getDynamicPromptMetadata(prototype, propertyKey);
    if (dynamicPromptMeta) {
      metadata.set(propertyKey, dynamicPromptMeta);
    }
  });

  return metadata;
};

export const getAllPromptTemplatesMetadata = (target: any): Map<string, PromptTemplateMetadata> => {
  const metadata = new Map<string, PromptTemplateMetadata>();
  const prototype = target.prototype || target;

  Object.getOwnPropertyNames(prototype).forEach((propertyKey) => {
    if (propertyKey === 'constructor') return;

    const promptTemplateMeta = getPromptTemplateMetadata(prototype, propertyKey);
    if (promptTemplateMeta) {
      metadata.set(propertyKey, promptTemplateMeta);
    }
  });

  return metadata;
};
