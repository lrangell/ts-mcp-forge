import 'reflect-metadata';
import { setToolMetadata, getParamMetadata } from './metadata.js';
import {
  extractParametersFromFunction,
  mergeParameterMetadata,
} from '../utils/parameter-parser.js';

export function Tool(description: string): MethodDecorator;
export function Tool(name: string, description: string): MethodDecorator;

export function Tool(nameOrDescription: string, description?: string): MethodDecorator {
  return function (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const methodName = typeof propertyKey === 'symbol' ? propertyKey.toString() : propertyKey;
    const hasExplicitName = description !== undefined;
    const toolName = hasExplicitName ? nameOrDescription : methodName;
    const toolDescription = hasExplicitName ? description : nameOrDescription;

    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey) || [];
    const returnType = Reflect.getMetadata('design:returntype', target, propertyKey);

    const method = descriptor.value;
    const parsedParams = extractParametersFromFunction(method);
    const existingParams = getParamMetadata(target, methodName);
    const params = mergeParameterMetadata(parsedParams, paramTypes, existingParams);

    setToolMetadata(target, methodName, {
      name: toolName,
      description: toolDescription,
      method: methodName,
      paramTypes,
      returnType,
      params,
    });

    return descriptor;
  };
}
