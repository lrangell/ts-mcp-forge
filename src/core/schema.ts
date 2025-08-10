import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { sortBy } from 'remeda';
import { ParamMetadata } from '../decorators/metadata.js';

const typeToZod = (type: any): z.ZodTypeAny => {
  if (!type) return z.any();

  if (type instanceof z.ZodType) {
    return type;
  }

  switch (type) {
    case String:
      return z.string();
    case Number:
      return z.number();
    case Boolean:
      return z.boolean();
    case Array:
      return z.array(z.any());
    case Object:
      return z.record(z.any());
    case Date:
      return z.date();
    default:
      return z.any();
  }
};

export const generateParamsSchema = (params: ParamMetadata[] = []) => {
  if (params.length === 0) {
    return {
      type: 'object',
      properties: {},
      required: [],
    };
  }

  const sortedParams = sortBy(params, (p) => p.index);

  const properties: Record<string, any> = {};
  const required: string[] = [];

  sortedParams.forEach((param) => {
    const zodSchema = typeToZod(param.type);
    const jsonSchema = zodToJsonSchema(zodSchema, { $refStrategy: 'none' });

    const { $schema: _$schema, ...schemaWithoutMeta } = jsonSchema as any;

    properties[param.name] = {
      ...schemaWithoutMeta,
      description: param.description,
    };

    required.push(param.name);
  });

  return {
    type: 'object',
    properties,
    required,
  };
};

export const generateToolSchema = (
  name: string,
  description: string,
  params: ParamMetadata[] = []
) => {
  return {
    name,
    description,
    inputSchema: generateParamsSchema(params),
  };
};

export const generatePromptSchema = (
  name: string,
  description: string,
  params: ParamMetadata[] = []
) => {
  const sortedParams = sortBy(params, (p) => p.index);

  return {
    name,
    description,
    arguments: sortedParams.map((param) => ({
      name: param.name,
      description: param.description,
      required: true, // Could be enhanced
    })),
  };
};

export const validateParams = (
  params: ParamMetadata[],
  input: any
): z.SafeParseReturnType<any, any> => {
  if (!input || typeof input !== 'object') {
    return { success: false, error: new z.ZodError([]) };
  }

  const schema: Record<string, z.ZodTypeAny> = {};

  params.forEach((param) => {
    schema[param.name] = typeToZod(param.type);
  });

  const zodSchema = z.object(schema);
  return zodSchema.safeParse(input);
};
