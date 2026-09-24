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

## Why there is no Content-Security-Policy

`srcdoc` frames inherit the parent page's CSP. A strict policy on the editor would also apply to the pages
being edited and break their fonts, styles and scripts. Isolation is done with the sandboxes above instead.

## Reporting a problem

Please do not open a public issue for a security problem. Use GitHub's
[private vulnerability reporting](https://github.com/kingd2925-beep/unslop/security/advisories/new) for this
repository. Include the HTML that triggers it and what it can reach.
