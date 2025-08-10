import { Result, ok, err } from 'neverthrow';
import { MCPServer } from '../../src/core/server.js';
import { Tool, Param } from '../../src/decorators/index.js';

type CalculatorResult = Result<number, string>;

export class CalculatorServer extends MCPServer {
  constructor() {
    super('Calculator Server', '1.0.0');
  }

  @Tool('add', 'Adds two numbers together')
  add(
    @Param('First number to add') a: number,
    @Param('Second number to add') b: number
  ): CalculatorResult {
    return ok(a + b);
  }

  @Tool('subtract', 'Subtracts the second number from the first')
  subtract(
    @Param('Number to subtract from') a: number,
    @Param('Number to subtract') b: number
  ): CalculatorResult {
    return ok(a - b);
  }

  @Tool('multiply', 'Multiplies two numbers')
  multiply(@Param('First number') a: number, @Param('Second number') b: number): CalculatorResult {
    return ok(a * b);
  }

  @Tool('divide', 'Divides the first number by the second')
  divide(
    @Param('Dividend (number to be divided)') dividend: number,
    @Param('Divisor (number to divide by)') divisor: number
  ): CalculatorResult {
    if (divisor === 0) {
      return err('Cannot divide by zero');
    }
    const result = dividend / divisor;
    return ok(result);
  }

  @Tool('power', 'Raises a number to a power')
  power(@Param('Base number') base: number, @Param('Exponent') exponent: number): CalculatorResult {
    const result = Math.pow(base, exponent);
    return ok(result);
  }

  @Tool('sqrt', 'Calculates the square root of a number')
  sqrt(@Param('Number to find square root of') n: number): CalculatorResult {
    if (n < 0) {
      return err('Cannot calculate square root of negative number');
    }
    const result = Math.sqrt(n);
    return ok(result);
  }
}
