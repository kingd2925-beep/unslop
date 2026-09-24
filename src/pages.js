// Page names for multi-page sites: match a clicked link to an uploaded page, and name new pages.

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const HTML_EXT = /\.html?$/i;

function basename(path) {
  return path.split('/').filter(Boolean).pop() || '';
}

/** Index of the page a link points to, or -1 when it leaves the site or points nowhere we know. */
export function resolvePageLink(href, pageNames) {
  if (typeof href !== 'string') return -1;
  const link = href.trim();
  if (!link || link.startsWith('#') || link.startsWith('//') || HAS_SCHEME.test(link)) return -1;
  const path = link.split(/[?#]/)[0].replace(/^(\.\/|\/)+/, '');
  const lowerNames = pageNames.map((n) => n.toLowerCase());
  if (path === '') return lowerNames.indexOf('index.html');
  const exact = lowerNames.indexOf(path.toLowerCase());
  if (exact !== -1) return exact;
  return lowerNames.indexOf(basename(path).toLowerCase());
}

/** A file name that does not clash with existing pages: "about.html" -> "about-2.html". */
export function uniquePageName(name, pageNames) {
  const withExt = HTML_EXT.test(name) ? name : `${name}.html`;
  const taken = new Set(pageNames.map((n) => n.toLowerCase()));
  if (!taken.has(withExt.toLowerCase())) return withExt;
  const stem = withExt.replace(HTML_EXT, '');
  const ext = withExt.match(HTML_EXT)[0];
  for (let i = 2; ; i += 1) {
    const candidate = `${stem}-${i}${ext}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}
