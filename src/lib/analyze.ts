import postcss, { type Rule } from 'postcss';
import selectorParser from 'postcss-selector-parser';

export type Specificity = [number, number, number];
export interface SelectorMatch {
  selector: string;
  specificity: Specificity;
  declarations: Array<{ property: string; value: string; important: boolean; order: number; atRule: string[] }>;
  matched: boolean;
}
export interface Analysis {
  selectors: SelectorMatch[];
  errors: string[];
  warnings: string[];
  ruleCount: number;
  declarationCount: number;
}

function maxSpecificity(items: Specificity[]): Specificity {
  return items.reduce((best, item) => compareSpecificity(item, best) > 0 ? item : best, [0, 0, 0] as Specificity);
}
export function compareSpecificity(a: Specificity, b: Specificity): number {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}
function add(a: Specificity, b: Specificity): Specificity {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function nodeSpecificity(node: selectorParser.Node): Specificity {
  if (node.type === 'id') return [1, 0, 0];
  if (node.type === 'class' || node.type === 'attribute') return [0, 1, 0];
  if (node.type === 'tag') return node.value === '*' ? [0, 0, 0] : [0, 0, 1];
  if (node.type === 'pseudo') {
    const name = node.value.toLowerCase();
    if (name.startsWith('::')) return [0, 0, 1];
    if ([':where'].includes(name)) return [0, 0, 0];
    const selectorArgumentPseudos = [':is', ':not', ':has'];
    if (selectorArgumentPseudos.includes(name) && node.nodes) {
      const args = node.nodes.flatMap(n => n.type === 'selector' ? [n.nodes.reduce((s, child) => add(s, nodeSpecificity(child)), [0, 0, 0] as Specificity)] : []);
      return maxSpecificity(args);
    }
    if (name === ':nth-child' || name === ':nth-last-child') {
      const text = node.toString();
      const ofIndex = text.toLowerCase().indexOf(' of ');
      if (ofIndex >= 0 && node.nodes) {
        const selectors = node.nodes.flatMap(n => n.type === 'selector' ? [n.nodes.reduce((s, child) => add(s, nodeSpecificity(child)), [0, 0, 0] as Specificity)] : []);
        return add([0, 1, 0], maxSpecificity(selectors));
      }
    }
    return [0, 1, 0];
  }
  return [0, 0, 0];
}
export function calculateSpecificity(selector: string): Specificity {
  let result: Specificity = [0, 0, 0];
  selectorParser(root => {
    const first = root.nodes[0];
    if (first) result = first.nodes.reduce((sum, node) => add(sum, nodeSpecificity(node)), [0, 0, 0] as Specificity);
  }).processSync(selector);
  return result;
}
export function formatSpecificity(value: Specificity): string {
  return value.join(' · ');
}
export function analyzeCss(css: string, selected?: { matches(selector: string): boolean }): Analysis {
  const selectors: SelectorMatch[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let order = 0;
  let ruleCount = 0;
  let declarationCount = 0;
  try {
    const root = postcss.parse(css || '');
    root.walkRules((rule: Rule) => {
      ruleCount++;
      const atRule: string[] = [];
      let parent = rule.parent;
      while (parent && parent.type !== 'root') {
        if (parent.type === 'atrule') atRule.unshift('@' + parent.name + (parent.params ? ' ' + parent.params : ''));
        parent = parent.parent;
      }
      let parsed: string[] = [];
      try {
        selectorParser(list => { parsed = list.nodes.map(n => n.toString().trim()).filter(Boolean); }).processSync(rule.selector);
      } catch {
        warnings.push('A selector could not be parsed: ' + rule.selector);
      }
      const declarations: SelectorMatch['declarations'] = [];
      rule.walkDecls(decl => {
        declarationCount++;
        order++;
        declarations.push({
          property: decl.prop,
          value: decl.value,
          important: Boolean(decl.important),
          order,
          atRule
        });
      });
      for (const selector of parsed) {
        let matched = false;
        if (selected) {
          try { matched = selected.matches(selector); } catch { matched = false; }
        }
        selectors.push({ selector, specificity: calculateSpecificity(selector), declarations, matched });
      }
    });
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unable to parse CSS.');
  }
  if (css.includes('@import')) warnings.push('@import rules may not load in the isolated preview.');
  if (css.includes('::')) warnings.push('Pseudo-element styles are listed when parseable but cannot be selected directly in the preview.');
  return { selectors, errors, warnings, ruleCount, declarationCount };
}