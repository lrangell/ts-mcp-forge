import 'reflect-metadata';
import { setResourceTemplateMetadata } from './metadata.js';

export interface ResourceTemplateOptions {
  name?: string;
  description?: string;
  mimeType?: string;
}

export function ResourceTemplate(
  uriTemplate: string,
  options?: ResourceTemplateOptions | string
): MethodDecorator {
  return function (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    if (typeof propertyKey === 'symbol') {
      throw new Error('ResourceTemplate decorator cannot be used on symbol properties');
    }

    // Handle both string (description) and options object
    const opts = typeof options === 'string' ? { description: options } : options;

    setResourceTemplateMetadata(target, propertyKey, {
      uriTemplate,
      name: opts?.name,
      description: opts?.description,
      mimeType: opts?.mimeType,
      method: propertyKey,
    });

    return descriptor;
  };
}
