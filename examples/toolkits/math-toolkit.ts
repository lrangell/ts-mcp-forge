import { Result, ok, err } from 'neverthrow';
import { Toolkit } from '../../src/core/toolkit.js';
import { Tool, Param } from '../../src/decorators/index.js';

export class MathToolkit extends Toolkit {
  @Tool('Add two numbers together')
  add(
    @Param('First number') a: number,
    @Param('Second number') b: number
  ): Result<number, string> {
    return ok(a + b);
  }

  @Tool('Subtract the second number from the first')
  subtract(
    @Param('Number to subtract from') a: number,
    @Param('Number to subtract') b: number
  ): Result<number, string> {
    return ok(a - b);
  }

  @Tool('Multiply two numbers')
  multiply(
    @Param('First number') a: number,
    @Param('Second number') b: number
  ): Result<number, string> {
    return ok(a * b);
  }

  @Tool('divide', 'Divide the first number by the second')
  divide(
    @Param('Dividend') dividend: number,
    @Param('Divisor') divisor: number
  ): Result<number, string> {
    return divisor === 0 
      ? err('Cannot divide by zero')
      : ok(dividend / divisor);
  }

  @Tool('Calculate the power of a number')
  power(
    @Param('Base number') base: number,
    @Param('Exponent') exponent: number
  ): Result<number, string> {
    return ok(Math.pow(base, exponent));
  }

  @Tool('Calculate the square root of a number')
  sqrt(@Param('Number') n: number): Result<number, string> {
    return n < 0
      ? err('Cannot calculate square root of negative number')
      : ok(Math.sqrt(n));
  }

  @Tool('Calculate factorial of a number')
  factorial(@Param('Number') n: number): Result<number, string> {
    if (n < 0) return err('Factorial not defined for negative numbers');
    if (n === 0 || n === 1) return ok(1);
    
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return ok(result);
  }

  @Tool('Calculate the absolute value')
  abs(@Param('Number') n: number): Result<number, string> {
    return ok(Math.abs(n));
  }

  @Tool('Round a number to specified decimal places')
  round(
    @Param('Number to round') n: number,
    @Param('Decimal places') decimals: number = 0
  ): Result<number, string> {
    const factor = Math.pow(10, decimals);
    return ok(Math.round(n * factor) / factor);
  }

  @Tool('Get the maximum of two numbers')
  max(
    @Param('First number') a: number,
    @Param('Second number') b: number
  ): Result<number, string> {
    return ok(Math.max(a, b));
  }

  @Tool('Get the minimum of two numbers')
  min(
    @Param('First number') a: number,
    @Param('Second number') b: number
  ): Result<number, string> {
    return ok(Math.min(a, b));
  }

  @Tool('Calculate the modulo (remainder) of division')
  modulo(
    @Param('Dividend') a: number,
    @Param('Divisor') b: number
  ): Result<number, string> {
    return b === 0
      ? err('Cannot calculate modulo with divisor zero')
      : ok(a % b);
  }
}