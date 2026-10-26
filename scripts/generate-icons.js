/**
 * Generates PNG and ICO placeholder icons for browser extension and Windows executable
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPngBuffer(width, height, r, g, b) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // RGBA color type
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);

  // Raw image data with scanline filter 0
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter byte: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      // Draw cyan/electric blue rounded shape
      const dx = x - width / 2;
      const dy = y - height / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const isInside = dist <= width * 0.45;

      if (isInside) {
        rawData[pixelOffset] = r;     // R
        rawData[pixelOffset + 1] = g; // G
        rawData[pixelOffset + 2] = b; // B
        rawData[pixelOffset + 3] = 255; // A
      } else {
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = calculateCrc(Buffer.concat([Buffer.from(type, 'ascii'), data]));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// CRC32 table & function
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function calculateCrc(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Ensure directories exist
const extIconDir = path.join(process.cwd(), 'browser-extension', 'icons');
const assetsDir = path.join(process.cwd(), 'assets');
if (!fs.existsSync(extIconDir)) fs.mkdirSync(extIconDir, { recursive: true });
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

// Write PNG icons
fs.writeFileSync(path.join(extIconDir, 'icon16.png'), createPngBuffer(16, 16, 0, 245, 255));
fs.writeFileSync(path.join(extIconDir, 'icon48.png'), createPngBuffer(48, 48, 0, 163, 255));
fs.writeFileSync(path.join(extIconDir, 'icon128.png'), createPngBuffer(128, 128, 0, 163, 255));
fs.writeFileSync(path.join(assetsDir, 'icon.png'), createPngBuffer(256, 256, 0, 163, 255));

// Create a basic ICO wrapper
const png256 = createPngBuffer(64, 64, 0, 163, 255);
const icoHeader = Buffer.from([
  0, 0,             // Reserved
  1, 0,             // Type: 1 = ICO
  1, 0,             // Number of images: 1
  64, 64, 0, 0,     // Width, height, color count, reserved
  1, 0, 32, 0,      // Color planes, bpp
  ...intToBytes(png256.length), // Size of image data
  22, 0, 0, 0       // Offset of image data
]);

function intToBytes(num) {
  return [num & 0xff, (num >> 8) & 0xff, (num >> 16) & 0xff, (num >> 24) & 0xff];
}

fs.writeFileSync(path.join(assetsDir, 'icon.ico'), Buffer.concat([icoHeader, png256]));

console.log('[TDM] Icons successfully generated.');
