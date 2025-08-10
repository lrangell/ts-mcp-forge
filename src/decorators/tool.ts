import 'reflect-metadata';
import { setToolMetadata, getParamMetadata } from './metadata.js';

export function Tool(name: string, description: string = '') {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey) || [];
    const returnType = Reflect.getMetadata('design:returntype', target, propertyKey);

    const params = getParamMetadata(target, propertyKey) || [];

    setToolMetadata(target, propertyKey, {
      name,
      description,
      method: propertyKey,
      paramTypes,
      returnType,
      params,
    });

    return descriptor;
  };
}
