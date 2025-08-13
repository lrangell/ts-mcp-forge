import 'reflect-metadata';
import { setPromptTemplateMetadata } from './metadata.js';

export interface PromptTemplateOptions {
  description?: string;
}

export function PromptTemplate(
  nameTemplate: string,
  options?: PromptTemplateOptions
): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    if (typeof propertyKey === 'symbol') {
      throw new Error('PromptTemplate decorator cannot be used on symbol properties');
    }

    setPromptTemplateMetadata(target, propertyKey, {
      nameTemplate,
      description: options?.description,
      method: propertyKey,
    });

    return descriptor;
  };
}
