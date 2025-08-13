import 'reflect-metadata';
import { setDynamicPromptMetadata } from './metadata.js';

export interface DynamicPromptOptions {
  description?: string;
}

export function DynamicPrompt(descriptionOrOptions?: string | DynamicPromptOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const options =
      typeof descriptionOrOptions === 'string'
        ? { description: descriptionOrOptions }
        : descriptionOrOptions || {};

    setDynamicPromptMetadata(target, propertyKey, {
      method: propertyKey,
      description: options.description,
    });

    return descriptor;
  };
}
