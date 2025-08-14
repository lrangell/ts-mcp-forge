import 'reflect-metadata';
import { setParamMetadata } from './metadata.js';

export function Param(description: string): ParameterDecorator;
export function Param(description: string, options: { required?: boolean }): ParameterDecorator;
export function Param(description: string, required: boolean): ParameterDecorator;
export function Param(description: string, name: string): ParameterDecorator;
export function Param(
  description: string,
  name: string,
  options: { required?: boolean }
): ParameterDecorator;

export function Param(
  description: string,
  nameOrOptions?: string | boolean | { required?: boolean },
  options?: { required?: boolean }
): ParameterDecorator {
  return function (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number
  ) {
    if (!propertyKey) return;

    const propertyKeyStr = typeof propertyKey === 'symbol' ? propertyKey.toString() : propertyKey;
    const method = (target as Record<string, unknown>)[propertyKeyStr];
    const funcStr = typeof method === 'function' ? method.toString() : '';
    const match = funcStr.match(/\(([^)]*)\)/);
    const paramNames = match
      ? match[1].split(',').map((p: string) => p.trim().split(/[:\s?]/)[0])
      : [];

    let paramName: string;
    let required = true;

    if (typeof nameOrOptions === 'string') {
      // @Param('description', 'name') or @Param('description', 'name', options)
      paramName = nameOrOptions;
      required = options?.required ?? true;
    } else if (typeof nameOrOptions === 'boolean') {
      // @Param('description', false) - boolean for required
      paramName = paramNames[parameterIndex] || `param${parameterIndex}`;
      required = nameOrOptions;
    } else if (typeof nameOrOptions === 'object') {
      // @Param('description', { required: false })
      paramName = paramNames[parameterIndex] || `param${parameterIndex}`;
      required = nameOrOptions?.required ?? true;
    } else {
      // @Param('description')
      paramName = paramNames[parameterIndex] || `param${parameterIndex}`;
    }

    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey) || [];
    const paramType = paramTypes[parameterIndex];

    setParamMetadata(target, propertyKeyStr, parameterIndex, {
      name: paramName,
      description,
      type: paramType,
      required,
    });
  };
}
