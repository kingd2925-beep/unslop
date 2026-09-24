# Contributing to unslop

Thanks for helping. unslop is meant for people who are not developers, so every change should keep it
simple to use, private and fast.

## Ground rules

- **No runtime dependencies and no build step for the app.** `index.html` must keep working when served as plain files, and `npm run build` must keep producing a working `dist/unslop.html`.
- **The user's page never runs with access to the editor.** Keep the two sandboxes in `src/canvas.js` as they are: edit frame = `allow-same-origin` without scripts, preview frame = `allow-scripts` without same-origin.
- **Untrusted text goes into the editor's own UI as text only.** Use `h()` from `src/ui.js`; never `innerHTML` with page data.
- **Export must be clean.** Anything the editor adds to a page is marked with `data-unslop-*` and removed by `src/exporter.js`.
- Keep modules small and focused (a few hundred lines at most). Top-level names must be unique across `src/` because the single-file build joins the modules; `npm run build` fails if they clash.

## Workflow

1. Write or update a test first: `tests/unit/` for pure logic, `tests/e2e/` for anything in the browser.
2. Make the change.
3. Run `npm test`, `npm run test:e2e` and `npm run build` before opening a pull request.
4. Describe what a user will notice, and attach a screenshot for visible changes.

## Good first issues

- More fonts in `src/fonts.js` (check the Google Fonts weights exist).
- Keyboard shortcuts for moving the selection.
- Translations of the interface.
