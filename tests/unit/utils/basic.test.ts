/**
 * Basic utility tests to verify test infrastructure
 */

import { test, expect, describe } from 'bun:test';

describe('Basic Test Infrastructure', () => {
  test('should run basic assertions', () => {
    expect(1 + 1).toBe(2);
    expect('hello').toBe('hello');
    expect(true).toBe(true);
  });

  test('should handle arrays', () => {
    const arr = [1, 2, 3];
    expect(arr.length).toBe(3);
    expect(arr).toContain(2);
  });

  test('should handle objects', () => {
    const obj = { name: 'test', value: 42 };
    expect(obj).toHaveProperty('name');
    expect(obj.name).toBe('test');
    expect(obj.value).toBe(42);
  });

  test('should handle async operations', async () => {
    const promise = new Promise(resolve => setTimeout(() => resolve('done'), 10));
    const result = await promise;
    expect(result).toBe('done');
  });
});

describe('Math Utilities', () => {
  const add = (a: number, b: number) => a + b;
  const multiply = (a: number, b: number) => a * b;
  const divide = (a: number, b: number) => {
    if (b === 0) throw new Error('Division by zero');
    return a / b;
  };

  test('should add numbers correctly', () => {
    expect(add(2, 3)).toBe(5);
    expect(add(-1, 1)).toBe(0);
    expect(add(0, 0)).toBe(0);
  });

  test('should multiply numbers correctly', () => {
    expect(multiply(3, 4)).toBe(12);
    expect(multiply(-2, 5)).toBe(-10);
    expect(multiply(0, 10)).toBe(0);
  });

  test('should divide numbers correctly', () => {
    expect(divide(10, 2)).toBe(5);
    expect(divide(7, 2)).toBe(3.5);
    expect(divide(-6, 3)).toBe(-2);
  });

  test('should throw error on division by zero', () => {
    expect(() => divide(5, 0)).toThrow('Division by zero');
  });
});

describe('String Utilities', () => {
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
  const reverseString = (str: string) => str.split('').reverse().join('');
  const isPalindrome = (str: string) => {
    const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleaned === cleaned.split('').reverse().join('');
  };

  test('should capitalize strings', () => {
    expect(capitalize('hello')).toBe('Hello');
    expect(capitalize('WORLD')).toBe('WORLD');
    expect(capitalize('')).toBe('');
  });

  test('should reverse strings', () => {
    expect(reverseString('hello')).toBe('olleh');
    expect(reverseString('abc')).toBe('cba');
    expect(reverseString('')).toBe('');
  });

  test('should detect palindromes', () => {
    expect(isPalindrome('racecar')).toBe(true);
    expect(isPalindrome('A man a plan a canal Panama')).toBe(true);
    expect(isPalindrome('hello')).toBe(false);
    expect(isPalindrome('Madam')).toBe(true);
  });
}); 