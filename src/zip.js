// A tiny dependency-free ZIP writer (stored, no compression) so a whole site downloads as one file.

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_END = 0x06054b50;
const VERSION = 20;
const FLAG_UTF8_NAMES = 0x0800;
const METHOD_STORE = 0;
const LOCAL_HEADER_SIZE = 30;
const CENTRAL_HEADER_SIZE = 46;
const END_RECORD_SIZE = 22;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

function header(size, writeFields) {
  const bytes = new Uint8Array(size);
  writeFields(new DataView(bytes.buffer));
  return bytes;
}

function localHeader(entry, stamp) {
  return header(LOCAL_HEADER_SIZE, (v) => {
    v.setUint32(0, SIG_LOCAL, true);
    v.setUint16(4, VERSION, true);
    v.setUint16(6, FLAG_UTF8_NAMES, true);
    v.setUint16(8, METHOD_STORE, true);
    v.setUint16(10, stamp.time, true);
    v.setUint16(12, stamp.day, true);
    v.setUint32(14, entry.crc, true);
    v.setUint32(18, entry.data.length, true);
    v.setUint32(22, entry.data.length, true);
    v.setUint16(26, entry.name.length, true);
    v.setUint16(28, 0, true);
  });
}

function centralHeader(entry, stamp) {
  return header(CENTRAL_HEADER_SIZE, (v) => {
    v.setUint32(0, SIG_CENTRAL, true);
    v.setUint16(4, VERSION, true);
    v.setUint16(6, VERSION, true);
    v.setUint16(8, FLAG_UTF8_NAMES, true);
    v.setUint16(10, METHOD_STORE, true);
    v.setUint16(12, stamp.time, true);
    v.setUint16(14, stamp.day, true);
    v.setUint32(16, entry.crc, true);
    v.setUint32(20, entry.data.length, true);
    v.setUint32(24, entry.data.length, true);
    v.setUint16(28, entry.name.length, true);
    v.setUint32(42, entry.offset, true);
  });
}

function endRecord(count, centralSize, centralOffset) {
  return header(END_RECORD_SIZE, (v) => {
    v.setUint32(0, SIG_END, true);
    v.setUint16(8, count, true);
    v.setUint16(10, count, true);
    v.setUint32(12, centralSize, true);
    v.setUint32(16, centralOffset, true);
  });
}

function concat(chunks) {
  const out = new Uint8Array(chunks.reduce((sum, c) => sum + c.length, 0));
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/** files: [{ name, text }] -> Uint8Array holding a valid .zip archive. */
export function createZip(files, date = new Date()) {
  const encoder = new TextEncoder();
  const stamp = dosDateTime(date);
  const chunks = [];
  const entries = [];
  let offset = 0;
  for (const file of files) {
    const data = encoder.encode(file.text);
    const entry = { name: encoder.encode(file.name), data, crc: crc32(data), offset };
    const local = localHeader(entry, stamp);
    chunks.push(local, entry.name, data);
    offset += local.length + entry.name.length + data.length;
    entries.push(entry);
  }
  const central = entries.flatMap((e) => [centralHeader(e, stamp), e.name]);
  const centralSize = central.reduce((sum, c) => sum + c.length, 0);
  return concat([...chunks, ...central, endRecord(entries.length, centralSize, offset)]);
}
