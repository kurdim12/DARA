/**
 * Just enough PNG to read the brand mark and write the app icons, with no
 * image dependency to install before a demo.
 * Supports 8/16-bit, non-interlaced PNGs (grey, RGB, palette, alpha).
 */
import zlib from "node:zlib";

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/** Returns { width, height, data } with data as RGBA bytes. */
export function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(SIGNATURE)) throw new Error("not a PNG file");

  let offset = 8;
  let ihdr = null;
  let palette = null;
  let transparency = null;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === "IHDR") {
      ihdr = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        interlace: data[12],
      };
    } else if (type === "PLTE") palette = Buffer.from(data);
    else if (type === "tRNS") transparency = Buffer.from(data);
    else if (type === "IDAT") idat.push(Buffer.from(data));
    else if (type === "IEND") break;
  }

  if (!ihdr) throw new Error("PNG has no IHDR");
  if (ihdr.interlace !== 0) throw new Error("interlaced PNGs are not supported");
  if (ihdr.bitDepth !== 8 && ihdr.bitDepth !== 16) {
    throw new Error(`unsupported bit depth ${ihdr.bitDepth} (use an 8-bit PNG)`);
  }

  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ihdr.colorType];
  if (!channels) throw new Error(`unsupported colour type ${ihdr.colorType}`);

  const sampleBytes = ihdr.bitDepth / 8;
  const bpp = channels * sampleBytes;
  const stride = ihdr.width * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(ihdr.width * ihdr.height * 4);

  let prev = Buffer.alloc(stride);
  let pos = 0;

  for (let y = 0; y < ihdr.height; y++) {
    const filter = raw[pos++];
    const line = Buffer.from(raw.subarray(pos, pos + stride));
    pos += stride;

    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      if (filter === 1) line[i] = (line[i] + a) & 0xff;
      else if (filter === 2) line[i] = (line[i] + b) & 0xff;
      else if (filter === 3) line[i] = (line[i] + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) line[i] = (line[i] + paeth(a, b, c)) & 0xff;
    }

    for (let x = 0; x < ihdr.width; x++) {
      const src = x * bpp;
      const dst = (y * ihdr.width + x) * 4;
      const at = (channel) => line[src + channel * sampleBytes];

      if (ihdr.colorType === 0) {
        const v = at(0);
        out[dst] = out[dst + 1] = out[dst + 2] = v;
        out[dst + 3] = 255;
      } else if (ihdr.colorType === 2) {
        out[dst] = at(0);
        out[dst + 1] = at(1);
        out[dst + 2] = at(2);
        out[dst + 3] = 255;
      } else if (ihdr.colorType === 3) {
        const index = line[src];
        out[dst] = palette[index * 3];
        out[dst + 1] = palette[index * 3 + 1];
        out[dst + 2] = palette[index * 3 + 2];
        out[dst + 3] = transparency && index < transparency.length ? transparency[index] : 255;
      } else if (ihdr.colorType === 4) {
        const v = at(0);
        out[dst] = out[dst + 1] = out[dst + 2] = v;
        out[dst + 3] = at(1);
      } else {
        out[dst] = at(0);
        out[dst + 1] = at(1);
        out[dst + 2] = at(2);
        out[dst + 3] = at(3);
      }
    }
    prev = line;
  }

  return { width: ihdr.width, height: ihdr.height, data: out };
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

export function encodePng({ width, height, data }) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    scanlines[y * (width * 4 + 1)] = 0;
    data.copy(scanlines, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(scanlines, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Nearest-neighbour scale of `image` onto a solid background square. */
export function renderIcon(image, size, background, coverage) {
  const out = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    out[i * 4] = background[0];
    out[i * 4 + 1] = background[1];
    out[i * 4 + 2] = background[2];
    out[i * 4 + 3] = 255;
  }

  const target = Math.round(size * coverage);
  const scale = Math.min(target / image.width, target / image.height);
  const drawW = Math.max(1, Math.round(image.width * scale));
  const drawH = Math.max(1, Math.round(image.height * scale));
  const offsetX = Math.round((size - drawW) / 2);
  const offsetY = Math.round((size - drawH) / 2);

  for (let y = 0; y < drawH; y++) {
    const sy = Math.min(image.height - 1, Math.floor((y / drawH) * image.height));
    for (let x = 0; x < drawW; x++) {
      const sx = Math.min(image.width - 1, Math.floor((x / drawW) * image.width));
      const src = (sy * image.width + sx) * 4;
      const alpha = image.data[src + 3] / 255;
      if (alpha === 0) continue;
      const dst = ((offsetY + y) * size + (offsetX + x)) * 4;
      for (let c = 0; c < 3; c++) {
        out[dst + c] = Math.round(image.data[src + c] * alpha + out[dst + c] * (1 - alpha));
      }
    }
  }
  return { width: size, height: size, data: out };
}
