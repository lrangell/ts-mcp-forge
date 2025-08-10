import { describe, it, expect, beforeEach } from 'vitest';
import { CalculatorServer } from '../../../examples/calculator/index.js';

describe('CalculatorServer', () => {
  let calculator: CalculatorServer;

  beforeEach(() => {
    calculator = new CalculatorServer();
  });

  describe('Arithmetic operations', () => {
    it('should add two numbers', async () => {
      const result = await calculator.callTool('add', { a: 5, b: 3 });
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toBe('8');
      }
    });

    it('should subtract two numbers', async () => {
      const result = await calculator.callTool('subtract', { a: 10, b: 4 });
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toBe('6');
      }
    });

    it('should multiply two numbers', async () => {
      const result = await calculator.callTool('multiply', { a: 6, b: 7 });
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toBe('42');
      }
    });

    it('should divide two numbers', async () => {
      const result = await calculator.callTool('divide', {
        dividend: 20,
        divisor: 4,
      });
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toBe('5');
      }
    });

    it('should handle division by zero', async () => {
      const result = await calculator.callTool('divide', {
        dividend: 10,
        divisor: 0,
      });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Cannot divide by zero');
      }
    });

    it('should calculate power', async () => {
      const result = await calculator.callTool('power', {
        base: 2,
        exponent: 3,
      });
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toBe('8');
      }
    });

    it('should calculate square root', async () => {
      const result = await calculator.callTool('sqrt', { n: 16 });
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toBe('4');
      }
    });

    it('should handle negative square root', async () => {
      const result = await calculator.callTool('sqrt', { n: -4 });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Cannot calculate square root of negative number');
      }
    });
  });

  describe('Server metadata', () => {
    it('should have correct server info', () => {
      const initResponse = calculator.handleInitialize();
      expect(initResponse.serverInfo.name).toBe('Calculator Server');
      expect(initResponse.serverInfo.version).toBe('1.0.0');
    });

    it('should list all calculator tools', () => {
      const tools = calculator.listTools();
      const toolNames = tools.map((t) => t.name);

      expect(toolNames).toHaveLength(6);
      expect(toolNames).toContain('add');
      expect(toolNames).toContain('subtract');
      expect(toolNames).toContain('multiply');
      expect(toolNames).toContain('divide');
      expect(toolNames).toContain('power');
      expect(toolNames).toContain('sqrt');
    });

    it('should have no resources', () => {
      const resources = calculator.listResources();
      expect(resources).toHaveLength(0);
    });

    it('should have no prompts', () => {
      const prompts = calculator.listPrompts();
      expect(prompts).toHaveLength(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle very large numbers', async () => {
      const result = await calculator.callTool('multiply', {
        a: 1e10,
        b: 1e10,
      });
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const value = parseFloat(result.value.content[0].text!);
        expect(value).toBe(1e20);
      }
    });

    it('should handle negative numbers', async () => {
      const result = await calculator.callTool('add', {
        a: -5,
        b: -3,
      });
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toBe('-8');
      }
    });

    it('should handle decimal numbers', async () => {
      const result = await calculator.callTool('divide', {
        dividend: 10,
        divisor: 3,
      });
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const value = parseFloat(result.value.content[0].text!);
        expect(value).toBeCloseTo(3.333, 2);
      }
    });
  });
});
