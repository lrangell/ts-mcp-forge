import 'reflect-metadata';
import { setPromptMetadata, getParamMetadata } from './metadata.js';

export function Prompt(name: string, description: string = '') {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const params = getParamMetadata(target, propertyKey) || [];

    setPromptMetadata(target, propertyKey, {
      name,
      description,
      method: propertyKey,
      params,
    });

    return descriptor;
  };
}
