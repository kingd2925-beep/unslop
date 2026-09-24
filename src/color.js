// Colour parsing: turns the many ways CSS spells a colour into one canonical hex string,
// so "#333", "#333333" and "rgb(51, 51, 51)" are recognised as the same colour.

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB = /^rgba?\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*(?:[,/]\s*([\d.]+)(%?)\s*)?\)$/i;
const MAX_CHANNEL = 255;

const toHexPair = (n) => n.toString(16).padStart(2, '0');

function withAlpha(rgbHex, alphaByte) {
  return alphaByte === MAX_CHANNEL ? rgbHex : rgbHex + toHexPair(alphaByte);
}

function fromHex(body) {
  const expanded = body.length <= 4 ? [...body].map((ch) => ch + ch).join('') : body;
  const lower = expanded.toLowerCase();
  if (lower.length === 8) return withAlpha('#' + lower.slice(0, 6), parseInt(lower.slice(6), 16));
  return '#' + lower;
}

function fromRgb(match) {
  const channels = match.slice(1, 4).map(Number);
  if (channels.some((c) => c > MAX_CHANNEL)) return null;
  const rgbHex = '#' + channels.map(toHexPair).join('');
  if (match[4] === undefined) return rgbHex;
  const alpha = match[5] === '%' ? Number(match[4]) / 100 : Number(match[4]);
  if (!(alpha >= 0 && alpha <= 1)) return null;
  return withAlpha(rgbHex, Math.round(alpha * MAX_CHANNEL));
}

/** Returns a lowercase "#rrggbb" or "#rrggbbaa" string, or null when the input is not a colour we handle. */
export function normalizeColor(input) {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  const hex = value.match(HEX);
  if (hex) return fromHex(hex[1]);
  const rgb = value.match(RGB);
  if (rgb) return fromRgb(rgb);
  return null;
}
