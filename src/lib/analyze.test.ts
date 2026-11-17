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


describe('nested CSS and at-rule context', () => {
  it('keeps nested declarations attached to their own selector', () => {
    const result = analyzeCss('.card { color: red; & .title { color: blue; } }');
    expect(result.ruleCount).toBe(2);
    expect(result.declarationCount).toBe(2);
    expect(result.selectors.find(item => item.selector === '.card')?.declarations.map(item => item.value)).toEqual(['red']);
    expect(result.selectors.find(item => item.selector === '& .title')?.declarations.map(item => item.value)).toEqual(['blue']);
    expect(result.warnings.some(warning => warning.includes('Nested selectors'))).toBe(true);
  });

  it('retains media and layer context with source order', () => {
    const result = analyzeCss('@layer components { @media (min-width: 40rem) { .card { color: red; } } }');
    expect(result.selectors[0].declarations[0].atRule).toEqual([
      '@layer components',
      '@media (min-width: 40rem)'
    ]);
    expect(result.selectors[0].declarations[0].order).toBe(1);
    expect(result.warnings.some(warning => warning.includes('Cascade layer context'))).toBe(true);
  });

  it('excludes keyframe steps from element selector matching', () => {
    const result = analyzeCss('@keyframes pulse { from { opacity: 0; } to { opacity: 1; } } .card { color: red; }');
    expect(result.ruleCount).toBe(1);
    expect(result.declarationCount).toBe(1);
    expect(result.selectors.map(item => item.selector)).toEqual(['.card']);
    expect(result.warnings.some(warning => warning.includes('Keyframe steps'))).toBe(true);
  });
});
