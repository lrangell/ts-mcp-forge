import 'reflect-metadata';
import { setDynamicResourceMetadata } from './metadata.js';

export interface DynamicResourceOptions {
  description?: string;
}

export function DynamicResource(descriptionOrOptions?: string | DynamicResourceOptions) {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    const options =
      typeof descriptionOrOptions === 'string'
        ? { description: descriptionOrOptions }
        : descriptionOrOptions || {};

    setDynamicResourceMetadata(target, propertyKey, {
      method: propertyKey,
      description: options.description,
    });

    return descriptor;
  };
}
