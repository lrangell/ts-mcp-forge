import 'reflect-metadata';
import { setToolMetadata, getParamMetadata } from './metadata.js';

export function Tool(description: string): MethodDecorator;
export function Tool(name: string, description: string): MethodDecorator;

export function Tool(nameOrDescription: string, description?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const hasExplicitName = description !== undefined;
    const toolName = hasExplicitName ? nameOrDescription : propertyKey;
    const toolDescription = hasExplicitName ? description : nameOrDescription;

    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey) || [];
    const returnType = Reflect.getMetadata('design:returntype', target, propertyKey);

    const params = getParamMetadata(target, propertyKey) || [];

    setToolMetadata(target, propertyKey, {
      name: toolName,
      description: toolDescription,
      method: propertyKey,
      paramTypes,
      returnType,
      params,
    });

    return descriptor;
  };
}
