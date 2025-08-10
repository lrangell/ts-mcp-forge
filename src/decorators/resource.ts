import 'reflect-metadata';
import { setResourceMetadata } from './metadata.js';

export function Resource(uri: string, description?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    setResourceMetadata(target, propertyKey, {
      uri,
      description,
      method: propertyKey,
    });

    return descriptor;
  };
}
