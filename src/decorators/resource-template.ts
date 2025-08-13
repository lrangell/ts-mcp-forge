import 'reflect-metadata';
import { setResourceTemplateMetadata } from './metadata.js';

export interface ResourceTemplateOptions {
  name?: string;
  description?: string;
  mimeType?: string;
}

export function ResourceTemplate(
  uriTemplate: string,
  options?: ResourceTemplateOptions
): MethodDecorator {
  return function (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    if (typeof propertyKey === 'symbol') {
      throw new Error('ResourceTemplate decorator cannot be used on symbol properties');
    }

    setResourceTemplateMetadata(target, propertyKey, {
      uriTemplate,
      name: options?.name || propertyKey,
      description: options?.description,
      mimeType: options?.mimeType,
      method: propertyKey,
    });

    return descriptor;
  };
}
