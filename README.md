# CascadeLens

**Understand why your CSS looks the way it does.**

CascadeLens is a local-first CSS debugging workspace. Edit HTML and CSS, inspect an isolated live preview, select an element, and trace the selectors that match it. The browser supplies the computed styles; CascadeLens adds a readable explanation of specificity, declaration order and surrounding at-rule context.

**Live app:** https://akhilalladi-code.github.io/cascade-lens/

## What you can do

- Edit HTML and CSS side by side with an updating preview.
- Select preview elements to inspect their computed CSS properties.
- See matching author selectors and their specificity scores.
- Review declarations, !important, source order and nested @media / @supports / @layer context.
- Switch between desktop, tablet and mobile preview widths.
- Load focused examples for specificity, inheritance, !important, media queries and cascade layers.
- Import .html, .htm and .css files (2 MB per file limit).
- Export a diagnostic report as JSON or Markdown.
- Use a dark or light workspace theme.
- Work without an account, API key or application backend.

## Run locally

Requirements: Node.js 20 or newer and npm.

~~~bash
npm install
npm run dev
~~~

Open the local URL printed by Vite.

## Quality checks

Run the complete local check sequence:

~~~bash
npm run check
~~~

This runs ESLint, TypeScript checks for the app and tooling, Vitest unit tests, a production build, a built-asset smoke test and Playwright browser tests.

For the browser tests on a fresh machine, install Chromium once:

~~~bash
npx playwright install chromium
npm run test:e2e
~~~

## Deploy to GitHub Pages

The GitHub Actions workflow runs the full quality suite for pull requests and deploys only after a successful push to main. In repository settings, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**.

The Vite base path is configured for:

~~~text
https://akhilalladi-code.github.io/cascade-lens/
~~~

## Privacy and preview security

HTML and CSS are processed in your browser. CascadeLens does not upload source files to an application server. Imported files are read locally and limited to 2 MB each.

The preview runs in a sandboxed iframe without same-origin access. A per-document nonce authorizes only the inspector script; user-provided script elements are removed and inline event handlers are blocked by the preview Content Security Policy. Network connections, external frames, plugins and form submissions are disabled inside the preview. The outer app also avoids third-party font requests.

Treat imported source as untrusted. The preview is a safer inspection surface, not a general-purpose security sandbox for arbitrary hostile documents.

## Analysis scope and known limits

CascadeLens is an explanatory aid, not a replacement for the browser's full DevTools cascade engine.

- The browser's computed-style values are authoritative for the rendered result.
- Specificity and declaration order are summarized, but the app does not independently simulate every cascade origin, transition, animation, layer-precedence or scope-proximity rule.
- Layer and conditional at-rule context is displayed; activation is evaluated by the preview browser.
- CSS nesting selectors using & are not expanded in the rule summary.
- Keyframe steps are excluded from element-selector matching.
- Pseudo-elements cannot be selected directly.
- External resources and @import stylesheets are blocked or may not load in the isolated preview.
- Closed shadow roots, browser extensions, user-agent internals and dynamically loaded application styles are outside the inspection scope.

When a case is outside this scope, use the computed values shown by the browser and verify complex cascade behavior in the browser's native DevTools.

## Technology

React 19, TypeScript, Vite, PostCSS, postcss-selector-parser, Vitest, ESLint and Playwright.

## License

MIT. Copyright (c) 2026 Akhil Alladi.
