import { describe, expect, it } from 'vitest';
import { analyzeCss, calculateSpecificity, compareSpecificity, formatSpecificity } from './analyze';

describe('CSS specificity', () => {
  it('counts IDs, classes and types', () => {
    expect(calculateSpecificity('#app .card h2')).toEqual([1, 1, 1]);
  });
  it('ignores universal selectors and zeroes :where()', () => {
    expect(calculateSpecificity(':where(#app) .item *')).toEqual([0, 1, 0]);
  });
  it('uses the most specific argument for :is()', () => {
    expect(calculateSpecificity(':is(.item, #chosen) span')).toEqual([1, 0, 1]);
  });
  it('compares specificity lexicographically', () => {
    expect(compareSpecificity([1, 0, 0], [0, 9, 9])).toBeGreaterThan(0);
    expect(formatSpecificity([0, 2, 1])).toBe('0 · 2 · 1');
  });
});
describe('CSS parsing', () => {
  it('collects declarations and matching selectors', () => {
    const result = analyzeCss('.card { color: red; padding: 1rem !important; }', {
      matches: selector => selector === '.card'
    });
    expect(result.ruleCount).toBe(1);
    expect(result.declarationCount).toBe(2);
    expect(result.selectors[0].matched).toBe(true);
    expect(result.selectors[0].declarations[1].important).toBe(true);
  });
  it('reports malformed CSS', () => {
    expect(analyzeCss('.broken { color: red').errors.length).toBeGreaterThan(0);
  });
});