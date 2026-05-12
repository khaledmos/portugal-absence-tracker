// Generate PWA icons (192x192 and 512x512 PNG) + favicon from scripts/icon-source.svg.
// Run with: node scripts/generate-icons.mjs

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const iconsDir = join(root, 'static', 'icons');
const faviconPath = join(root, 'src', 'lib', 'assets', 'favicon.svg');
const sourcePath = join(__dirname, 'icon-source.svg');

async function main() {
  const svgBuffer = readFileSync(sourcePath);

  for (const size of [192, 512]) {
    const buf = await sharp(svgBuffer).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
    writeFileSync(join(iconsDir, `icon-${size}.png`), buf);
    console.log(`wrote static/icons/icon-${size}.png (${buf.length} bytes)`);
  }

  // Favicon: copy the source SVG so it scales for browser tabs.
  writeFileSync(faviconPath, svgBuffer);
  console.log(`wrote ${faviconPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
