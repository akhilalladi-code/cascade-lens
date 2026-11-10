# CascadeLens

**Understand why your CSS looks the way it does.**

CascadeLens is a local-first CSS cascade debugger. Paste HTML and CSS, inspect a live isolated preview, select elements, explore matching selectors and specificity, and review computed styles without sending your source to a server.

## Features

- Live HTML and CSS editing with a sandboxed preview.
- Click an element in the preview to inspect its computed styles.
- Selector matching and specificity breakdown for supported selectors.
- Declaration and source-order inspection, including `!important` and cascade-layer context.
- Desktop, tablet and mobile viewport presets.
- Built-in examples for specificity, inheritance, important declarations, layers and media queries.
- Import HTML/CSS files and export diagnostic reports as Markdown or JSON.
- Local-only processing: no account, API key, backend or upload required.

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Quality checks

```bash
npm run typecheck
npm run test
npm run build
```

## Deploy to GitHub Pages

The included GitHub Actions workflow builds and publishes the app to GitHub Pages. In the repository settings, ensure **Settings → Pages → Build and deployment → Source** is set to **GitHub Actions**.

The Vite base path is configured for the repository URL:

`https://akhilalladi-code.github.io/cascade-lens/`

## How analysis works and known limits

CascadeLens combines PostCSS parsing, selector specificity analysis, element matching in the preview frame, and the browser's computed-style engine. Browser computed styles are authoritative for the rendered result; the app's declaration view is an explanatory aid, not a replacement for browser DevTools' full cascade engine.

Some behavior cannot be completely reconstructed from pasted source alone. Cross-origin stylesheets, closed shadow roots, browser extensions, user-agent internals, pseudo-element inspection, dynamically loaded resources, and complex interactions among origins, animations, transitions and cascade layers may be incomplete or unavailable. CascadeLens calls out unsupported or uncertain cases rather than claiming full DevTools parity.

Preview content runs in a sandboxed iframe with a restrictive Content Security Policy. Do not use the preview as a security boundary for opening untrusted files in a browser you do not control; treat imported source as untrusted.

## Privacy

Your HTML and CSS are processed in your browser. CascadeLens does not transmit your source to a CascadeLens server.

## License

MIT. Copyright (c) 2026 Akhil Alladi.
