import { Result, ok, err } from 'neverthrow';
import { Toolkit } from '../../src/core/toolkit.js';
import { Tool, Param } from '../../src/decorators/index.js';

export class StringToolkit extends Toolkit {
  @Tool('Concatenate two strings')
  concat(
    @Param('First string') a: string,
    @Param('Second string') b: string
  ): Result<string, string> {
    return ok(a + b);
  }

  @Tool('reverse', 'Reverse a string')
  reverse(@Param('String to reverse') str: string): Result<string, string> {
    return ok(str.split('').reverse().join(''));
  }

  @Tool('Convert string to uppercase')
  toUpperCase(@Param('Input string') str: string): Result<string, string> {
    return ok(str.toUpperCase());
  }

  @Tool('Convert string to lowercase')
  toLowerCase(@Param('Input string') str: string): Result<string, string> {
    return ok(str.toLowerCase());
  }

  @Tool('Capitalize first letter of string')
  capitalize(@Param('Input string') str: string): Result<string, string> {
    return str.length === 0
      ? ok('')
      : ok(str.charAt(0).toUpperCase() + str.slice(1).toLowerCase());
  }

  @Tool('Trim whitespace from string')
  trim(@Param('String to trim') str: string): Result<string, string> {
    return ok(str.trim());
  }

  @Tool('Get length of string')
  length(@Param('Input string') str: string): Result<number, string> {
    return ok(str.length);
  }

  @Tool('Count words in text')
  wordCount(@Param('Text to analyze') text: string): Result<number, string> {
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    return ok(words.length);
  }

  @Tool('Check if string contains substring')
  contains(
    @Param('String to search in') str: string,
    @Param('Substring to find') substring: string
  ): Result<boolean, string> {
    return ok(str.includes(substring));
  }

  @Tool('Replace all occurrences of a substring')
  replaceAll(
    @Param('Original string') str: string,
    @Param('String to find') find: string,
    @Param('String to replace with') replace: string
  ): Result<string, string> {
    return ok(str.replaceAll(find, replace));
  }

  @Tool('Get substring from string')
  substring(
    @Param('Original string') str: string,
    @Param('Start index') start: number,
    @Param('End index (optional)') end?: number
  ): Result<string, string> {
    return start < 0 || start > str.length
      ? err('Invalid start index')
      : ok(end !== undefined ? str.substring(start, end) : str.substring(start));
  }

  @Tool('Split string by delimiter')
  split(
    @Param('String to split') str: string,
    @Param('Delimiter') delimiter: string
  ): Result<string[], string> {
    return ok(str.split(delimiter));
  }

  @Tool('Join array of strings')
  join(
    @Param('Array of strings') strings: string[],
    @Param('Separator') separator: string = ''
  ): Result<string, string> {
    return ok(strings.join(separator));
  }

  @Tool('Check if string starts with prefix')
  startsWith(
    @Param('String to check') str: string,
    @Param('Prefix') prefix: string
  ): Result<boolean, string> {
    return ok(str.startsWith(prefix));
  }

  @Tool('Check if string ends with suffix')
  endsWith(
    @Param('String to check') str: string,
    @Param('Suffix') suffix: string
  ): Result<boolean, string> {
    return ok(str.endsWith(suffix));
  }

  @Tool('Repeat string n times')
  repeat(
    @Param('String to repeat') str: string,
    @Param('Number of times') times: number
  ): Result<string, string> {
    return times < 0
      ? err('Cannot repeat negative times')
      : ok(str.repeat(times));
  }

  @Tool('Convert string to camelCase')
  toCamelCase(@Param('Input string') str: string): Result<string, string> {
    const words = str.split(/[\s_-]+/);
    const camelCase = words
      .map((word, index) => 
        index === 0 
          ? word.toLowerCase()
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join('');
    return ok(camelCase);
  }

  @Tool('Convert string to snake_case')
  toSnakeCase(@Param('Input string') str: string): Result<string, string> {
    const snakeCase = str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
      .replace(/[\s-]+/g, '_');
    return ok(snakeCase);
  }
}