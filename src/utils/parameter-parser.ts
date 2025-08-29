import * as ts from 'typescript';
import { ParamMetadata } from '../decorators/metadata.js';

export interface ParsedParameter {
  name: string;
  isOptional: boolean;
  hasDefault: boolean;
  isRest: boolean;
}

export const extractParametersFromFunction = (func: Function): ParsedParameter[] => {
  const funcStr = func.toString();

  let sourceText: string;
  if (funcStr.startsWith('function ')) {
    const methodStr = funcStr.substring('function '.length);
    sourceText = `class Temp { ${methodStr} }`;
  } else {
    sourceText = `class Temp { ${funcStr} }`;
  }

  const sourceFile = ts.createSourceFile('temp.ts', sourceText, ts.ScriptTarget.Latest, true);

  let parameters: ParsedParameter[] = [];

  const visit = (node: ts.Node, depth: number = 0): void => {
    if (ts.isMethodDeclaration(node) && depth === 2) {
      node.parameters.forEach((param) => {
        const name = getParameterName(param);
        const hasDefault = !!param.initializer;
        const isRest = !!param.dotDotDotToken;
        const isOptional = !!param.questionToken || hasDefault || isRest;

        parameters.push({
          name,
          isOptional,
          hasDefault,
          isRest,
        });
      });
      return;
    }

    ts.forEachChild(node, (child) => visit(child, depth + 1));
  };

  visit(sourceFile);

  return parameters;
};

const getParameterName = (param: ts.ParameterDeclaration): string => {
  if (ts.isIdentifier(param.name)) {
    return param.name.text;
  }

  if (ts.isObjectBindingPattern(param.name)) {
    const names = param.name.elements
      .map((element) => {
        if (ts.isBindingElement(element) && ts.isIdentifier(element.name)) {
          return element.name.text;
        }
        return null;
      })
      .filter(Boolean);

    return names.length > 0 ? names.join('_') : 'destructured';
  }

  if (ts.isArrayBindingPattern(param.name)) {
    const names = param.name.elements
      .map((element) => {
        if (ts.isBindingElement(element) && ts.isIdentifier(element.name)) {
          return element.name.text;
        }
        return null;
      })
      .filter(Boolean);

    return names.length > 0 ? names.join('_') : 'destructured';
  }

  return 'unknown';
};

export const mergeParameterMetadata = (
  parsedParams: ParsedParameter[],
  paramTypes: unknown[],
  existingParams?: ParamMetadata[]
): ParamMetadata[] => {
  const maxIndex = Math.max(
    parsedParams.length,
    paramTypes.length,
    existingParams && existingParams.length > 0
      ? Math.max(...existingParams.filter((p) => p != null).map((p) => (p.index ?? -1) + 1))
      : 0
  );

  const result: ParamMetadata[] = [];

  for (let index = 0; index < maxIndex; index++) {
    const parsed = parsedParams[index];
    const existing = existingParams?.find((p) => p && p.index === index);
    const paramType = paramTypes[index];

    const name =
      existing?.name && existing.name !== '' ? existing.name : parsed?.name || `param${index}`;
    const isRequired =
      existing?.required !== undefined
        ? existing.required
        : parsed
          ? !parsed.hasDefault && !parsed.isRest
          : true;

    result.push({
      index,
      name,
      description: existing?.description,
      type: paramType,
      required: isRequired,
    });
  }

  return result;
};
