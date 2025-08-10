import { describe, it, expect } from 'vitest';
import {
  generateParamsSchema,
  generateToolSchema,
  generatePromptSchema,
} from '../../src/core/schema.js';
import { ParamMetadata } from '../../src/decorators/metadata.js';

describe('Schema Generation', () => {
  describe('generateParamsSchema', () => {
    it('should generate empty schema for no parameters', () => {
      const schema = generateParamsSchema([]);

      expect(schema).toEqual({
        type: 'object',
        properties: {},
        required: [],
      });
    });

    it('should generate schema with string type', () => {
      const params: ParamMetadata[] = [
        {
          name: 'text',
          description: 'Input text',
          type: String,
          index: 0,
        },
      ];

      const schema = generateParamsSchema(params);

      expect(schema.type).toBe('object');
      expect(schema.properties.text).toEqual({
        type: 'string',
        description: 'Input text',
      });
      expect(schema.required).toContain('text');
    });

    it('should generate schema with number type', () => {
      const params: ParamMetadata[] = [
        {
          name: 'count',
          description: 'Number of items',
          type: Number,
          index: 0,
        },
      ];

      const schema = generateParamsSchema(params);

      expect(schema.properties.count).toEqual({
        type: 'number',
        description: 'Number of items',
      });
    });

    it('should generate schema with boolean type', () => {
      const params: ParamMetadata[] = [
        {
          name: 'enabled',
          description: 'Is enabled',
          type: Boolean,
          index: 0,
        },
      ];

      const schema = generateParamsSchema(params);

      expect(schema.properties.enabled).toEqual({
        type: 'boolean',
        description: 'Is enabled',
      });
    });

    it('should generate schema with multiple parameters in correct order', () => {
      const params: ParamMetadata[] = [
        {
          name: 'b',
          description: 'Second param',
          type: Number,
          index: 1,
        },
        {
          name: 'a',
          description: 'First param',
          type: String,
          index: 0,
        },
      ];

      const schema = generateParamsSchema(params);

      const keys = Object.keys(schema.properties);
      expect(keys[0]).toBe('a');
      expect(keys[1]).toBe('b');

      expect(schema.properties.a.type).toBe('string');
      expect(schema.properties.b.type).toBe('number');
      expect(schema.required).toEqual(['a', 'b']);
    });

    it('should handle array type', () => {
      const params: ParamMetadata[] = [
        {
          name: 'items',
          description: 'List of items',
          type: Array,
          index: 0,
        },
      ];

      const schema = generateParamsSchema(params);

      expect(schema.properties.items.type).toBe('array');
      expect(schema.properties.items.description).toBe('List of items');
    });

    it('should handle object type', () => {
      const params: ParamMetadata[] = [
        {
          name: 'config',
          description: 'Configuration object',
          type: Object,
          index: 0,
        },
      ];

      const schema = generateParamsSchema(params);

      expect(schema.properties.config.type).toBe('object');
      expect(schema.properties.config.additionalProperties).toEqual({});
      expect(schema.properties.config.description).toBe('Configuration object');
    });

    it('should handle undefined type as any', () => {
      const params: ParamMetadata[] = [
        {
          name: 'data',
          description: 'Any data',
          type: undefined,
          index: 0,
        },
      ];

      const schema = generateParamsSchema(params);

      expect(schema.properties.data.description).toBe('Any data');
      expect(schema.properties.data.type).toBeUndefined();
    });

    it('should not include $schema field in generated schemas', () => {
      const params: ParamMetadata[] = [
        {
          name: 'value',
          description: 'A value',
          type: String,
          index: 0,
        },
      ];

      const schema = generateParamsSchema(params);

      expect(schema.properties.value).not.toHaveProperty('$schema');
      expect(schema).not.toHaveProperty('$schema');
    });
  });

  describe('generateToolSchema', () => {
    it('should generate complete tool schema', () => {
      const params: ParamMetadata[] = [
        {
          name: 'a',
          description: 'First number',
          type: Number,
          index: 0,
        },
        {
          name: 'b',
          description: 'Second number',
          type: Number,
          index: 1,
        },
      ];

      const schema = generateToolSchema('add', 'Adds two numbers', params);

      expect(schema.name).toBe('add');
      expect(schema.description).toBe('Adds two numbers');
      expect(schema.inputSchema.type).toBe('object');
      expect(schema.inputSchema.properties.a.type).toBe('number');
      expect(schema.inputSchema.properties.b.type).toBe('number');
      expect(schema.inputSchema.required).toEqual(['a', 'b']);
    });

    it('should handle tools with no parameters', () => {
      const schema = generateToolSchema('ping', 'Ping the server', []);

      expect(schema.name).toBe('ping');
      expect(schema.inputSchema.properties).toEqual({});
      expect(schema.inputSchema.required).toEqual([]);
    });
  });

  describe('generatePromptSchema', () => {
    it('should generate prompt schema with arguments', () => {
      const params: ParamMetadata[] = [
        {
          name: 'subject',
          description: 'The subject to analyze',
          type: String,
          index: 0,
        },
        {
          name: 'depth',
          description: 'Analysis depth',
          type: Number,
          index: 1,
        },
      ];

      const schema = generatePromptSchema('analyze', 'Analyze a subject', params);

      expect(schema.name).toBe('analyze');
      expect(schema.description).toBe('Analyze a subject');
      expect(schema.arguments).toHaveLength(2);
      expect(schema.arguments[0]).toEqual({
        name: 'subject',
        description: 'The subject to analyze',
        required: true,
      });
      expect(schema.arguments[1]).toEqual({
        name: 'depth',
        description: 'Analysis depth',
        required: true,
      });
    });

    it('should sort arguments by parameter index', () => {
      const params: ParamMetadata[] = [
        {
          name: 'second',
          description: 'Second param',
          type: String,
          index: 1,
        },
        {
          name: 'first',
          description: 'First param',
          type: String,
          index: 0,
        },
      ];

      const schema = generatePromptSchema('test', 'Test prompt', params);

      expect(schema.arguments[0].name).toBe('first');
      expect(schema.arguments[1].name).toBe('second');
    });
  });
});
