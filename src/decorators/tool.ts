import 'reflect-metadata';
import { setToolMetadata, getParamMetadata } from './metadata.js';

export function Tool(description: string): MethodDecorator;
export function Tool(name: string, description: string): MethodDecorator;

export function Tool(nameOrDescription: string, description?: string): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const methodName = typeof propertyKey === 'symbol' ? propertyKey.toString() : propertyKey;
    const hasExplicitName = description !== undefined;
    const toolName = hasExplicitName ? nameOrDescription : methodName;
    const toolDescription = hasExplicitName ? description : nameOrDescription;

    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey) || [];
    const returnType = Reflect.getMetadata('design:returntype', target, propertyKey);

    const params = getParamMetadata(target, methodName) || [];

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
