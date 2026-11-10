import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { analyzeCss, compareSpecificity, formatSpecificity, type Analysis } from './lib/analyze';

type Example = { name: string; html: string; css: string; note: string };
const examples: Example[] = [
  { name: 'Specificity clash', note: 'An ID selector outranks a class selector even when the class rule appears later.', html: '<main class="page"><article id="feature" class="card"><span class="eyebrow">INSPECT THIS</span><h1>Why is this blue?</h1><p>Click this card to inspect the matched rules.</p><button class="action">Explore cascade</button></article></main>', css: 'body { font-family: Inter, system-ui, sans-serif; background: #f3f5f8; color: #172033; }\n.page { min-height: 100vh; display: grid; place-items: center; padding: 32px; }\n.card { max-width: 440px; padding: 32px; border-radius: 20px; background: white; box-shadow: 0 18px 50px #17203318; color: #15803d; }\n#feature { color: #2563eb; }\n.card h1 { font-size: 30px; letter-spacing: -1px; }\n.eyebrow { color: #64748b; font-size: 11px; font-weight: 800; letter-spacing: 2px; }\n.action { border: 0; border-radius: 9px; background: #172033; color: white; padding: 12px 16px; }' },
  { name: 'Inheritance', note: 'The paragraph inherits its color and font from the parent unless overridden.', html: '<section class="panel"><h2>Inherited styles</h2><p class="muted">Select this paragraph, then compare inherited and directly declared properties.</p><a href="#">A simple link</a></section>', css: 'body { font-family: system-ui, sans-serif; background: #eef2f7; padding: 40px; }\n.panel { color: #334155; font-size: 18px; line-height: 1.7; background: white; padding: 28px; border-radius: 16px; }\n.panel p { margin-top: 8px; }\n.muted { color: #64748b; }\na { color: #7c3aed; }' },
  { name: '!important', note: 'Important declarations outrank normal author declarations; specificity still matters within the important layer.', html: '<div class="notice"><strong>Notice</strong><p>This text demonstrates an important declaration.</p></div>', css: 'body { font-family: system-ui; background: #f8fafc; padding: 40px; }\n.notice { padding: 24px; border-radius: 12px; background: #fff7ed; color: #9a3412; }\n.notice p { color: #16a34a !important; }\n.notice p { color: #dc2626; font-weight: 700; }' },
  { name: 'Media query', note: 'Resize the preview to see a media query change the card layout.', html: '<div class="layout"><div class="tile">01 · Strategy</div><div class="tile">02 · Design</div><div class="tile">03 · Build</div></div>', css: 'body { font-family: system-ui; background: #f1f5f9; padding: 24px; }\n.layout { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }\n.tile { background: #172554; color: white; border-radius: 12px; padding: 28px 16px; font-weight: 700; }\n@media (max-width: 600px) { .layout { grid-template-columns: 1fr; } .tile { padding: 18px; } }' },
  { name: 'Cascade layers', note: 'Layer order is context-sensitive; this example shows declarations inside named layers.', html: '<div class="badge">Layered button</div>', css: '@layer reset, components, overrides;\n@layer reset { .badge { color: #64748b; } }\n@layer components { .badge { color: #2563eb; padding: 18px; background: #eff6ff; border-radius: 12px; } }\n@layer overrides { .badge { color: #9333ea; } }' }
];
const initial = examples[0];
const previewScript = `(() => {
  const send = (payload) => parent.postMessage({ source: 'cascade-lens-preview', ...payload }, '*');
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    event.preventDefault();
    const style = getComputedStyle(target);
    const computed = {};
    for (let i = 0; i < style.length; i++) { const key = style[i]; computed[key] = style.getPropertyValue(key); }
    const path = [];
    let node = target;
    while (node && node !== document.body && path.length < 5) {
      let part = node.tagName.toLowerCase();
      if (node.id) part += '#' + node.id;
      if (node.classList.length) part += '.' + [...node.classList].slice(0, 2).join('.');
      path.unshift(part); node = node.parentElement;
    }
    const matchedSelectors = [];
    const splitSelectors = (text) => {
      const result = []; let start = 0, depth = 0, quote = '';
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (quote) { if (ch === quote && text[i - 1] !== '\\\\') quote = ''; continue; }
        if (ch === '"' || ch === "'") { quote = ch; continue; }
        if (ch === '(' || ch === '[') depth++;
        else if (ch === ')' || ch === ']') depth--;
        else if (ch === ',' && depth === 0) { result.push(text.slice(start, i).trim()); start = i + 1; }
      }
      result.push(text.slice(start).trim());
      return result.filter(Boolean);
    };
    const visitRules = (rules) => {
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSStyleRule) {
          for (const selector of splitSelectors(rule.selectorText)) {
            try { if (target.matches(selector)) matchedSelectors.push(selector); } catch {}
          }
        } else if (rule.cssRules) {
          if (rule instanceof CSSMediaRule && !matchMedia(rule.conditionText).matches) continue;
          if (typeof CSSSupportsRule !== 'undefined' && rule instanceof CSSSupportsRule && !CSS.supports(rule.conditionText)) continue;
          try { visitRules(rule.cssRules); } catch {}
        }
      }
    };
    for (const sheet of Array.from(document.styleSheets)) {
      try { visitRules(sheet.cssRules); } catch {}
    }
    send({ type: 'select', selector: path.join(' > '), tag: target.tagName.toLowerCase(), computed, matchedSelectors });
  }, true);
  send({ type: 'ready' });
})();`;
function makeSrcDoc(html: string, css: string) {
  const csp = "default-src 'none'; img-src data: blob:; style-src 'unsafe-inline' data:; font-src data:; script-src 'unsafe-inline'; connect-src 'none'; media-src data: blob:; form-action 'none'; base-uri 'none'";
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*,*::before,*::after{box-sizing:border-box}body{margin:0}${css.replace(/<\/style/gi, '<\\/style')}</style></head><body>${html.replace(/<script[\s\S]*?<\/script>/gi, '')}<script>${previewScript}</script></body></html>`;
}
function Icon({ children }: { children: string }) { return <span className="icon" aria-hidden="true">{children}</span>; }
function specificityLabel(s: [number, number, number]) { return <span className="specificity">{formatSpecificity(s)}</span>; }

export default function App() {
  const [html, setHtml] = useState(initial.html);
  const [css, setCss] = useState(initial.css);
  const [selected, setSelected] = useState<{ selector: string; tag: string; computed: Record<string, string>; matchedSelectors: string[] } | null>(null);
  const [viewport, setViewport] = useState('wide');
  const [activeTab, setActiveTab] = useState<'html' | 'css'>('css');
  const [rightTab, setRightTab] = useState<'styles' | 'rules' | 'diagnostics'>('styles');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const analysis: Analysis = useMemo(() => analyzeCss(css, selected ? { matches: selector => {
    return selected.matchedSelectors.includes(selector);
  } } : undefined), [css, selected]);
  const onMessage = useCallback((event: MessageEvent) => {
    if (event.source !== frame.current?.contentWindow) return;
    if (!event.data || event.data.source !== 'cascade-lens-preview') return;
    if (event.data.type === 'select') setSelected({ selector: event.data.selector, tag: event.data.tag, computed: event.data.computed || {}, matchedSelectors: event.data.matchedSelectors || [] });
  }, []);
  useEffect(() => { window.addEventListener('message', onMessage); return () => window.removeEventListener('message', onMessage); }, [onMessage]);
  const computedEntries = useMemo(() => Object.entries(selected?.computed || {}).filter(([key]) => !query || key.toLowerCase().includes(query.toLowerCase())).sort(([a], [b]) => a.localeCompare(b)), [selected, query]);
  const sortedRules = useMemo(() => [...analysis.selectors].sort((a, b) => Number(b.matched) - Number(a.matched) || compareSpecificity(b.specificity, a.specificity)), [analysis]);
  const loadExample = (example: Example) => { setHtml(example.html); setCss(example.css); setSelected(null); };
  const report = useMemo(() => ({
    product: 'CascadeLens',
    generatedAt: new Date().toISOString(),
    selectedElement: selected ? { selector: selected.selector, tag: selected.tag } : null,
    analysis: { ruleCount: analysis.ruleCount, declarationCount: analysis.declarationCount, errors: analysis.errors, warnings: analysis.warnings },
    selectors: analysis.selectors.map(item => ({ selector: item.selector, specificity: item.specificity, matched: item.matched, declarations: item.declarations }))
  }), [analysis, selected]);
  const exportReport = (format: 'json' | 'md') => {
    const content = format === 'json' ? JSON.stringify(report, null, 2) : [
      '# CascadeLens diagnostic report', '', `Generated: ${report.generatedAt}`, '',
      `Selected element: ${selected?.selector || 'None'}`, '',
      `Rules: ${analysis.ruleCount} · Declarations: ${analysis.declarationCount}`, '',
      '## Selector analysis', ...sortedRules.map(rule => `- ${rule.matched ? '[matched]' : '[not selected]'} \`${rule.selector}\` — specificity ${formatSpecificity(rule.specificity)}`), '',
      '## Warnings', ...(analysis.warnings.length ? analysis.warnings.map(w => '- ' + w) : ['- None']), '',
      '## Parse errors', ...(analysis.errors.length ? analysis.errors.map(e => '- ' + e) : ['- None'])
    ].join('\n');
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `cascade-lens-report.${format}`; anchor.click(); URL.revokeObjectURL(url);
  };
  const importFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const text = await file.text();
      if (file.name.toLowerCase().endsWith('.css')) setCss(text);
      else if (file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm')) setHtml(text);
    }
    setSelected(null);
  };
  const copySelector = async () => {
    if (!selected) return;
    await navigator.clipboard?.writeText(selected.selector);
    setCopied(true); window.setTimeout(() => setCopied(false), 1500);
  };
  return <div className={`app ${theme}`}>
    <header className="topbar">
      <a className="brand" href="#" aria-label="CascadeLens home"><span className="brand-mark"><i></i><i></i><i></i></span><span>Cascade<span className="brand-accent">Lens</span></span><span className="version">BETA</span></a>
      <div className="top-context"><span className="status-dot"></span> Local workspace <span className="context-divider">/</span> Untitled inspection</div>
      <div className="top-actions">
        <button className="icon-button" title="Import HTML or CSS" onClick={() => fileInput.current?.click()}><Icon>⇧</Icon></button>
        <input ref={fileInput} type="file" accept=".html,.htm,.css,text/html,text/css" multiple hidden onChange={e => void importFiles(e.target.files)} />
        <button className="icon-button" title="Help" onClick={() => setShowHelp(!showHelp)}><Icon>?</Icon></button>
        <button className="icon-button" title="Toggle theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><Icon>{theme === 'dark' ? '☼' : '◐'}</Icon></button>
        <button className="export-button" onClick={() => exportReport('json')}>Export report <span>↗</span></button>
      </div>
    </header>
    <main className="workspace">
      <aside className="left-rail">
        <div className="rail-label">WORKSPACE</div>
        <button className="rail-item active"><Icon>⌘</Icon><span>Inspector</span></button>
        <button className="rail-item" onClick={() => setShowHelp(!showHelp)}><Icon>◈</Icon><span>How it works</span></button>
        <div className="rail-spacer"></div>
        <div className="privacy-card"><span className="privacy-icon">◉</span><strong>Private by design</strong><p>Your code stays in this browser. Nothing is uploaded.</p><span className="privacy-link">LOCAL PROCESSING</span></div>
        <div className="rail-footer">CASCADELENS <span>·</span> 1.0</div>
      </aside>
      <section className="main-area">
        <div className="page-heading"><div><div className="eyebrow">CSS DEBUGGING WORKSPACE</div><h1>Inspect the cascade<span>.</span></h1><p>Trace styles, understand specificity, and see what wins.</p></div><div className="heading-meta"><span className="live-indicator"></span> LIVE PREVIEW</div></div>
        {showHelp && <div className="help-banner"><strong>Quick start</strong><span>Choose an example, edit the HTML or CSS, then click any element in the preview to inspect its computed styles and matching selectors.</span><button onClick={() => setShowHelp(false)}>Dismiss ×</button></div>}
        <div className="examples-row"><span className="examples-label">START WITH AN EXAMPLE</span>{examples.map(example => <button key={example.name} className="example-chip" onClick={() => loadExample(example)}>{example.name}</button>)}</div>
        <div className="editor-preview-grid">
          <section className="panel editor-panel">
            <div className="panel-header"><div className="panel-title"><span className="panel-dot violet"></span> SOURCE EDITOR</div><div className="panel-actions"><button onClick={() => { setHtml(initial.html); setCss(initial.css); }}>Reset</button><span className="panel-divider"></span><span className="language-tag">{activeTab === 'css' ? 'CSS' : 'HTML'}</span></div></div>
            <div className="editor-tabs"><button className={activeTab === 'html' ? 'selected' : ''} onClick={() => setActiveTab('html')}><span className="file-icon orange">〈/〉</span> index.html</button><button className={activeTab === 'css' ? 'selected' : ''} onClick={() => setActiveTab('css')}><span className="file-icon blue">✳</span> styles.css</button><span className="editor-hint">EDIT SOURCE</span></div>
            <div className="editor-wrap"><div className="line-numbers" aria-hidden="true">{(activeTab === 'css' ? css : html).split('\n').map((_, i) => <span key={i}>{i + 1}</span>)}</div><textarea aria-label={activeTab === 'css' ? 'CSS source editor' : 'HTML source editor'} spellCheck={false} value={activeTab === 'css' ? css : html} onChange={e => activeTab === 'css' ? setCss(e.target.value) : setHtml(e.target.value)} /></div>
            <div className="editor-footer"><span><span className="status-dot"></span> Changes update live</span><span>{(activeTab === 'css' ? css : html).split('\n').length} lines</span></div>
          </section>
          <section className="panel preview-panel">
            <div className="panel-header"><div className="panel-title"><span className="panel-dot green"></span> LIVE PREVIEW</div><div className="viewport-switch" role="group" aria-label="Preview viewport"><button className={viewport === 'wide' ? 'active' : ''} onClick={() => setViewport('wide')} title="Desktop">▰</button><button className={viewport === 'tablet' ? 'active' : ''} onClick={() => setViewport('tablet')} title="Tablet">▣</button><button className={viewport === 'mobile' ? 'active' : ''} onClick={() => setViewport('mobile')} title="Mobile">▯</button></div></div>
            <div className="preview-toolbar"><div className="traffic-lights"><i></i><i></i><i></i></div><span>preview.local <b>·</b> isolated</span><span className="preview-lock">⌑</span></div>
            <div className="preview-stage"><div className={`device-frame ${viewport}`}><iframe ref={frame} title="Isolated HTML and CSS preview" sandbox="allow-scripts" srcDoc={makeSrcDoc(html, css)} /></div></div>
            <div className="preview-footer"><span><span className="status-dot"></span> Sandbox active</span><span>Click an element to inspect ↗</span></div>
          </section>
        </div>
        <section className="panel analysis-panel">
          <div className="analysis-head"><div><div className="panel-title"><span className="panel-dot amber"></span> CASCADE ANALYSIS</div><p>Parsed declarations and selector specificity</p></div><div className="analysis-stats"><span><b>{analysis.ruleCount}</b> rules</span><span><b>{analysis.declarationCount}</b> declarations</span><span className={analysis.errors.length ? 'error-stat' : ''}><b>{analysis.errors.length}</b> errors</span></div></div>
          {analysis.errors.length > 0 ? <div className="parse-error">{analysis.errors.join(' · ')}</div> : <div className="rules-table"><div className="rules-header"><span>SELECTOR</span><span>SPECIFICITY</span><span>DECLARATIONS</span><span>STATUS</span></div>{sortedRules.filter(rule => !query || rule.selector.toLowerCase().includes(query.toLowerCase())).slice(0, 12).map((rule, i) => <div className="rule-row" key={rule.selector + i}><code>{rule.selector}</code>{specificityLabel(rule.specificity)}<span className="declaration-count">{rule.declarations.length} properties</span><span className={rule.matched ? 'match-badge' : 'unmatched-badge'}>{rule.matched ? 'MATCHED' : 'RULE'}</span></div>)}{analysis.selectors.length === 0 && <div className="empty-state">Add CSS rules to begin inspecting the cascade.</div>}</div>}
          {analysis.warnings.map(warning => <div className="warning-line" key={warning}>ⓘ {warning}</div>)}
        </section>
        <footer className="main-footer"><span>Built for the moments when CSS doesn't make sense.</span><span>NO ACCOUNT <b>·</b> NO UPLOADS <b>·</b> JUST CSS</span></footer>
      </section>
      <aside className="inspector">
        <div className="inspector-heading"><div><div className="eyebrow">ELEMENT INSPECTOR</div><h2>Details</h2></div><span className="inspector-target">⌖</span></div>
        <div className="inspector-tabs"><button className={rightTab === 'styles' ? 'active' : ''} onClick={() => setRightTab('styles')}>Computed</button><button className={rightTab === 'rules' ? 'active' : ''} onClick={() => setRightTab('rules')}>Matched rules</button><button className={rightTab === 'diagnostics' ? 'active' : ''} onClick={() => setRightTab('diagnostics')}>Notes</button></div>
        {rightTab === 'styles' && <div className="inspector-content">{selected ? <><div className="selected-element"><span className="element-icon">〈/〉</span><div><strong>{selected.tag}</strong><code>{selected.selector}</code></div><button title="Copy selector" onClick={() => void copySelector()}>{copied ? '✓' : '⧉'}</button></div><div className="property-search"><Icon>⌕</Icon><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter properties..." aria-label="Filter computed properties" /></div><div className="properties-list">{computedEntries.map(([key, value]) => <div className="property-row" key={key}><code>{key}</code><span>{value}</span></div>)}{computedEntries.length === 0 && <div className="empty-state">No properties match this filter.</div>}</div></> : <div className="inspector-empty"><div className="target-illustration">⌖</div><strong>No element selected</strong><p>Click any element inside the live preview to inspect its computed styles and matching CSS rules.</p><span>WAITING FOR SELECTION</span></div>}</div>}
        {rightTab === 'rules' && <div className="inspector-content">{selected ? <div className="matched-list">{sortedRules.filter(rule => rule.matched).map((rule, i) => <div className="matched-rule" key={rule.selector + i}><div><code>{rule.selector}</code>{specificityLabel(rule.specificity)}</div>{rule.declarations.map((decl, j) => <p key={j}><span>{decl.property}</span><b>{decl.value}{decl.important ? ' !important' : ''}</b></p>)}</div>)}{sortedRules.filter(rule => rule.matched).length === 0 && <div className="empty-state">No matching selectors found for the selected element.</div>}</div> : <div className="inspector-empty"><div className="target-illustration">⌖</div><strong>Select an element first</strong><p>Matched declarations will appear here.</p></div>}</div>}
        {rightTab === 'diagnostics' && <div className="inspector-content"><div className="diagnostic-card"><span className="diagnostic-icon">ⓘ</span><strong>Analysis scope</strong><p>Specificity is calculated from parsed selectors. The preview browser determines actual computed values.</p></div>{analysis.warnings.map(w => <div className="diagnostic-note" key={w}>{w}</div>)}{analysis.errors.map(e => <div className="diagnostic-note error" key={e}>{e}</div>)}<button className="download-md" onClick={() => exportReport('md')}>↓ Export Markdown report</button></div>}
        <div className="inspector-bottom"><div className="mini-status"><span className="status-dot"></span> Analysis ready</div><span>v1.0.0</span></div>
      </aside>
    </main>
    <div className="toast-region" aria-live="polite">{copied ? 'Selector copied to clipboard' : ''}</div>
  </div>;
}