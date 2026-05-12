// Generate PWA icons (192x192 and 512x512 PNG) + favicon SVG.
// Run with: node scripts/generate-icons.mjs
//
// Design: "PT" wordmark in white on slate (#0F172A), with a thin emerald accent
// stroke below the letters. Letters are traced as paths (not text) to avoid
// font-rendering variance across librsvg versions.

import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const iconsDir = join(root, 'static', 'icons');
const faviconPath = join(root, 'src', 'lib', 'assets', 'favicon.svg');

// "PT" as inline SVG paths (avoids font fallback issues in librsvg/sharp).
// Manually traced to look like a clean sans-serif bold. Width: 200 logical units.
// Centered around y=0 for easy positioning via translate().
const PT_PATHS = `
  <!-- P (rounded sans-serif, bold). 80 wide, 200 tall. -->
  <path d="M0 -100 L0 100 L24 100 L24 24 L48 24 C84 24 104 6 104 -38 C104 -82 84 -100 48 -100 Z M24 -78 L48 -78 C70 -78 80 -68 80 -38 C80 -8 70 2 48 2 L24 2 Z"
        fill="#FFFFFF"/>
  <!-- T (sans-serif, bold). 80 wide, centered ~120 right of P. -->
  <g transform="translate(124,0)">
    <path d="M0 -100 L0 -78 L28 -78 L28 100 L52 100 L52 -78 L80 -78 L80 -100 Z"
          fill="#FFFFFF"/>
  </g>
`;

const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="96" fill="#0F172A"/>
  <g transform="translate(154,232)">
    ${PT_PATHS}
  </g>
  <rect x="206" y="356" width="100" height="8" rx="4" fill="#10B981"/>
</svg>`;

// Favicon: same mark, but smaller padding and no accent line (tiny size).
const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="12" fill="#0F172A"/>
  <g transform="translate(19,30) scale(0.13)">
    ${PT_PATHS}
  </g>
</svg>`;

async function main() {
  for (const size of [192, 512]) {
    const buf = await sharp(Buffer.from(ICON_SVG))
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toBuffer();
    writeFileSync(join(iconsDir, `icon-${size}.png`), buf);
    console.log(`wrote static/icons/icon-${size}.png (${buf.length} bytes)`);
  }
  // Replace favicon.svg (lives in src/lib/assets so SvelteKit imports it as an asset)
  writeFileSync(faviconPath, FAVICON_SVG);
  console.log(`wrote ${faviconPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
