import { describe, it, expect } from 'vitest';
import { parsePositiveInt } from '../src/cli-helpers.js';

describe('parsePositiveInt', () => {
  it('parses valid integers in range', () => {
    expect(parsePositiveInt('8', 3, 1, 10)).toBe(8);
    expect(parsePositiveInt('1', 99, 1, 100)).toBe(1);
  });

  it('clamps to max', () => {
    expect(parsePositiveInt('500', 10, 1, 100)).toBe(100);
  });

  it('returns fallback for NaN and values below min', () => {
    expect(parsePositiveInt('abc', 10, 1, 100)).toBe(10);
    expect(parsePositiveInt('', 7, 1, 100)).toBe(7);
    expect(parsePositiveInt('0', 5, 1, 100)).toBe(5);
  });
});
