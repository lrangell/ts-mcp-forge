import 'reflect-metadata';
import { setResourceMetadata } from './metadata.js';

export interface ResourceOptions {
  description?: string;
  subscribable?: boolean;
  mimeType?: string;
}

export function Resource(uri: string, description?: string, mimeType?: string): PropertyDecorator;
export function Resource(uri: string, options?: ResourceOptions): PropertyDecorator;
export function Resource(
  uri: string,
  descriptionOrOptions?: string | ResourceOptions,
  mimeType?: string
): PropertyDecorator {
  return function (target: object, propertyKey: string | symbol, descriptor?: PropertyDescriptor) {
    const key = propertyKey.toString();
    let options: ResourceOptions;

    if (typeof descriptionOrOptions === 'string') {
      // Called with (uri, description, mimeType) format
      options = {
        description: descriptionOrOptions,
        mimeType: mimeType,
      };
    } else {
      // Called with (uri, options) format
      options = descriptionOrOptions || {};
    }

    setResourceMetadata(target, key, {
      uri,
      description: options.description,
      method: key,
      subscribable: options.subscribable,
      mimeType: options.mimeType,
    });

    return descriptor;
  };
}
