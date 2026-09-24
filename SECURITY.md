# Security

unslop opens HTML that you did not write, so it treats every page as untrusted.

## How pages are isolated

- **Editing** happens in an `<iframe sandbox="allow-same-origin">` without `allow-scripts`. The page's
  scripts, inline event handlers and `javascript:` links cannot run. The editor reads and changes the
  page from outside.
- **Preview** (and a one-off invisible "probe" that captures styles a page builds at runtime) happens in an
  `<iframe sandbox="allow-scripts">` without `allow-same-origin`. The page runs, but in an opaque origin:
  it cannot read the editor, its storage or its cookies. It can only send messages, and the editor accepts
  a message only from that exact frame and with a random per-frame token.
- The editor's own interface never inserts page-derived text as HTML.
- No data is sent anywhere by unslop. Pages you open may still load their own resources (fonts, images,
  scripts from CDNs) when previewed, exactly as they would in any browser.

- Every frame also denies camera, microphone, location, clipboard, screen capture, payment and device
  access (`allow="… 'none'"`), so a page cannot raise permission prompts that look like they come from unslop.

## What is stored, and where

- **Online** (`kingd2925-beep.github.io/unslop`), unslop autosaves your pages and your brand kit in this
  browser's `localStorage`. Browsers share that storage across a whole site origin, and every GitHub Pages
  project under the same account shares the `kingd2925-beep.github.io` origin. So keep in mind that other
  pages on that origin could read it. It holds page HTML and colours only: never passwords or keys.
- **Offline file** (`dist/unslop.html` opened from disk): Chrome gives every local HTML file the same
  storage, so any other file you double-click could read it. The offline version therefore **saves nothing**:
  no autosave, and your brand kit lasts only until the tab closes. Use **Download** and the brand **Export**
  button to keep your work.
- When you preview a page, it loads its own images, fonts and scripts like any web page, and those servers
  may see where the request came from (the referrer). The Google Fonts link unslop adds behaves the same way.
- unslop's own interface loads three fonts (Bricolage Grotesque, Instrument Sans, Martian Mono) from Google
  Fonts when you are online. Offline, it falls back to your system fonts. No page content is sent with it.

## Why there is no Content-Security-Policy

`srcdoc` frames inherit the parent page's CSP. A strict policy on the editor would also apply to the pages
being edited and break their fonts, styles and scripts. Isolation is done with the sandboxes above instead.

## Reporting a problem

Please do not open a public issue for a security problem. Use GitHub's
[private vulnerability reporting](https://github.com/kingd2925-beep/unslop/security/advisories/new) for this
repository. Include the HTML that triggers it and what it can reach.
