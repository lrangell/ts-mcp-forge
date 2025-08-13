import 'reflect-metadata';
import { setParamMetadata } from './metadata.js';

export function Param(description: string, name?: string) {
  return function (target: object, propertyKey: string, parameterIndex: number) {
    const method = (target as Record<string, unknown>)[propertyKey];
    const funcStr = typeof method === 'function' ? method.toString() : '';
    const match = funcStr.match(/\(([^)]*)\)/);
    const paramNames = match
      ? match[1].split(',').map((p: string) => p.trim().split(/[:\s]/)[0])
      : [];

    const paramName = name || paramNames[parameterIndex] || `param${parameterIndex}`;

    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey) || [];
    const paramType = paramTypes[parameterIndex];

    setParamMetadata(target, propertyKey, parameterIndex, {
      name: paramName,
      description,
      type: paramType,
    });
  };
}
