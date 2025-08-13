import 'reflect-metadata';
import { setResourceMetadata } from './metadata.js';

export interface ResourceOptions {
  description?: string;
  subscribable?: boolean;
}

export function Resource(uri: string, descriptionOrOptions?: string | ResourceOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const options =
      typeof descriptionOrOptions === 'string'
        ? { description: descriptionOrOptions }
        : descriptionOrOptions || {};

    setResourceMetadata(target, propertyKey, {
      uri,
      description: options.description,
      method: propertyKey,
      subscribable: options.subscribable,
    });

    return descriptor;
  };
}
