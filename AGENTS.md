# CascadeLens development instructions

- Preserve the local-first architecture. Do not add a backend, account system, telemetry, or external API without an explicit product requirement.
- Treat imported HTML and CSS as untrusted input. Keep preview execution isolated in the sandboxed iframe and maintain its restrictive Content Security Policy.
- Validate import selections before reading file contents. Support at most one HTML document and one CSS stylesheet per import operation; never silently overwrite a selected file.
- Keep CSS analysis behavior covered by Vitest tests and user-visible workflows covered by Playwright.
- Before proposing a change, inspect the relevant implementation and existing tests. Make focused changes and preserve existing behavior.
- Run `npm run check` after implementation when dependencies and browser binaries are available.
- Never bypass dependency peer constraints with `--force` or `--legacy-peer-deps`.
- Do not claim production readiness from a successful build alone. Verify deployment and relevant browser behavior separately.
