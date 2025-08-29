import 'reflect-metadata';
import { setPromptMetadata, getParamMetadata } from './metadata.js';
import {
  extractParametersFromFunction,
  mergeParameterMetadata,
} from '../utils/parameter-parser.js';

export function Prompt(name: string, description: string = '') {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey) || [];
    const method = descriptor.value;
    const parsedParams = extractParametersFromFunction(method);
    const existingParams = getParamMetadata(target, propertyKey);
    const params = mergeParameterMetadata(parsedParams, paramTypes, existingParams);

    setPromptMetadata(target, propertyKey, {
      name,
      description,
      method: propertyKey,
      params,
    });

    return descriptor;
  };
}
