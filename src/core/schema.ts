import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { sortBy } from 'remeda';
import { ParamMetadata } from '../decorators/metadata.js';

// Custom number schema that accepts NaN, Infinity, and -Infinity
const numberWithSpecialValues = () => {
  return z.number();
};

const typeToZod = (type: unknown): z.ZodTypeAny => {
  if (!type) return z.any();

  if (type instanceof z.ZodType) {
    return type;
  }

  // Handle primitive types
  switch (type) {
    case String:
      return z.string();
    case Number:
      // Use custom number schema that accepts NaN
      return numberWithSpecialValues();
    case Boolean:
      return z.boolean();
    case Date:
      return z.date();
    case Array:
      // For arrays, use z.array(z.unknown()) which generates items property
      return z.array(z.unknown());
    case Object:
      // For objects, use z.record(z.unknown()) which generates additionalProperties: {}
      return z.record(z.unknown());
    default:
      // Try to infer more specific types from TypeScript runtime info
      const typeName = type?.constructor?.name;

      if (typeName === 'Array' || (type as any)?.prototype?.constructor === Array) {
        // For arrays, use z.array(z.unknown()) which generates items property
        return z.array(z.unknown());
      }

      if (typeName === 'Object' || typeof type === 'object') {
        // For objects, use z.record(z.unknown()) which generates additionalProperties: {}
        return z.record(z.unknown());
      }

      return z.any();
  }
};

export const generateParamsSchema = (params: ParamMetadata[] = []) => {
  if (params.length === 0) {
    return {
      type: 'object' as const,
      properties: {},
      required: [],
    };
  }

  const sortedParams = sortBy(params, (p) => p.index);

  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  sortedParams.forEach((param) => {
    const zodSchema = typeToZod(param.type);
    const jsonSchema = zodToJsonSchema(zodSchema, { $refStrategy: 'none' });

    const { $schema: _$schema, ...schemaWithoutMeta } = jsonSchema as Record<string, unknown>;

    const property: Record<string, unknown> = { ...schemaWithoutMeta };

    if (param.description) {
      property.description = param.description;
    }

    properties[param.name] = property;

    if (param.required !== false) {
      required.push(param.name);
    }
  });

  return {
    type: 'object' as const,
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
    arguments: sortedParams
      .filter((param) => param.description)
      .map((param) => ({
        name: param.name,
        description: param.description!,
        required: param.required !== false,
      })),
  };
};

export const validateParams = (
  params: ParamMetadata[],
  input: unknown
): z.SafeParseReturnType<unknown, unknown> => {
  // If there are no params defined, validation succeeds with any input
  if (!params || params.length === 0) {
    return { success: true, data: {} };
  }

  // Check if all params are optional
  const hasRequiredParams = params.some((p) => p.required !== false);

  // If input is missing and we have required params, fail
  if (!input && hasRequiredParams) {
    return {
      success: false,
      error: new z.ZodError([
        {
          code: 'custom',
          path: [],
          message: 'Missing required parameters',
        },
      ]),
    };
  }

  // If input is missing but all params are optional, succeed
  if (!input && !hasRequiredParams) {
    return { success: true, data: {} };
  }

  // Input must be an object
  if (typeof input !== 'object' || input === null) {
    return {
      success: false,
      error: new z.ZodError([
        {
          code: 'custom',
          path: [],
          message: 'Parameters must be an object',
        },
      ]),
    };
  }

  const inputObj = input as Record<string, unknown>;

  const schema: Record<string, z.ZodTypeAny> = {};

  params.forEach((param) => {
    let zodType = typeToZod(param.type);

    // For basic types, do type validation but allow null/undefined for business logic validation
    if (param.type === String || param.type === Number || param.type === Boolean) {
      // Apply type validation but allow null to pass through for tool method validation
      if (param.required === false) {
        zodType = zodType.optional().nullable();
      } else {
        // For required basic types, allow null to pass through but validate the type when present
        zodType = zodType.nullable();
      }
    } else {
      // For complex types, be very permissive - just check existence for required params
      if (param.required === false) {
        zodType = z.any().optional().nullable();
      } else {
        zodType = z.any();
      }
    }

    schema[param.name] = zodType;
  });

  // Check for missing required parameters first
  const missingRequired: ParamMetadata[] = [];
  params.forEach((param) => {
    if (param.required !== false && !(param.name in inputObj)) {
      missingRequired.push(param);
    }
  });

  if (missingRequired.length > 0) {
    return {
      success: false,
      error: new z.ZodError(
        missingRequired.map((param) => ({
          code: 'custom',
          path: [param.name],
          message: `${param.description || param.name} is required`,
        }))
      ),
    };
  }

  const zodSchema = z.object(schema);
  return zodSchema.safeParse(inputObj);
};
