import 'reflect-metadata';
import { setParamMetadata } from './metadata.js';

export function Param(description: string): ParameterDecorator;
export function Param(description: string, required: boolean): ParameterDecorator;

export function Param(description: string, required?: boolean): ParameterDecorator {
  return function (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number
  ) {
    if (!propertyKey) return;

    const propertyKeyStr = typeof propertyKey === 'symbol' ? propertyKey.toString() : propertyKey;
    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey) || [];
    const paramType = paramTypes[parameterIndex];

    setParamMetadata(target, propertyKeyStr, parameterIndex, {
      name: '',
      description,
      type: paramType,
      required,
    });
  };
}
