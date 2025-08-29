import 'reflect-metadata';
import { createMetadataCollector } from './metadata-collector.js';

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
  description?: string;
  type?: unknown;
  required?: boolean;
}

export interface ToolMetadata {
  name: string;
  description: string;
  method: string;
  paramTypes?: unknown[];
  returnType?: unknown;
  params?: ParamMetadata[];
  instance?: unknown;
}

export interface ResourceMetadata {
  uri: string;
  description?: string;
  method: string;
  subscribable?: boolean;
  mimeType?: string;
  instance?: unknown;
}

export interface ResourceTemplateMetadata {
  uriTemplate: string;
  name?: string;
  description?: string;
  mimeType?: string;
  method: string;
  instance?: unknown;
}

export interface PromptMetadata {
  name: string;
  description: string;
  method: string;
  params?: ParamMetadata[];
  instance?: unknown;
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
  instance?: unknown;
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

export const getAllToolsMetadata = createMetadataCollector(getToolMetadata);

export const getAllResourcesMetadata = createMetadataCollector(getResourceMetadata);

export const getAllPromptsMetadata = createMetadataCollector(getPromptMetadata);

export const getAllResourceTemplatesMetadata = createMetadataCollector(getResourceTemplateMetadata);

export const getAllDynamicResourcesMetadata = createMetadataCollector(getDynamicResourceMetadata);

export const getAllDynamicPromptsMetadata = createMetadataCollector(getDynamicPromptMetadata);

export const getAllPromptTemplatesMetadata = createMetadataCollector(getPromptTemplateMetadata);
