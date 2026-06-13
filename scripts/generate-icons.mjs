// Generates all app icon / splash PNGs from a single SVG logo definition.
// Run with: node scripts/generate-icons.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, '..', 'assets');

// 2x2 block cluster colors (match src/theme/theme.ts blockColors)
const BLOCKS = [
  { from: '#FF7AB8', to: '#FF477E' }, // pink   (top-left)
  { from: '#6FE0FF', to: '#2D9CFF' }, // blue   (top-right)
  { from: '#C79BFF', to: '#8A5BFF' }, // purple (bottom-left)
  { from: '#9BFF7A', to: '#37D67A' }, // green  (bottom-right)
];

const S = 300; // block size
const G = 30; // gap
const R = 58; // corner radius
const START = (1024 - (S * 2 + G)) / 2; // center the 2x2

const positions = [
  [START, START],
  [START + S + G, START],
  [START, START + S + G],
  [START + S + G, START + S + G],
];

function defs() {
  const grads = BLOCKS.map(
    (b, i) => `
    <linearGradient id="g${i}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${b.from}"/>
      <stop offset="1" stop-color="${b.to}"/>
    </linearGradient>`
  ).join('');

  const clips = positions
    .map(
      ([x, y], i) => `
    <clipPath id="c${i}">
      <rect x="${x}" y="${y}" width="${S}" height="${S}" rx="${R}" ry="${R}"/>
    </clipPath>`
    )
    .join('');

  return `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1B2150"/>
      <stop offset="1" stop-color="#0B0E24"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.46" r="0.55">
      <stop offset="0" stop-color="#5B7CFF" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#5B7CFF" stop-opacity="0"/>
    </radialGradient>
    ${grads}
    ${clips}
  </defs>`;
}

function cluster() {
  return positions
    .map(([x, y], i) => {
      const glossH = S * 0.34;
      return `
      <rect x="${x}" y="${y}" width="${S}" height="${S}" rx="${R}" ry="${R}" fill="url(#g${i})"/>
      <g clip-path="url(#c${i})">
        <rect x="${x}" y="${y}" width="${S}" height="${glossH}" fill="#FFFFFF" fill-opacity="0.28"/>
      </g>`;
    })
    .join('');
}

function buildSVG({ background, scale = 1 }) {
  const body = `<g transform="translate(512,512) scale(${scale}) translate(-512,-512)">${cluster()}</g>`;
  const bg = background
    ? `<rect width="1024" height="1024" fill="url(#bg)"/>
       <ellipse cx="512" cy="470" rx="560" ry="560" fill="url(#glow)"/>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    ${defs()}
    ${bg}
    ${body}
  </svg>`;
}

async function render(svg, size, file) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(join(ASSETS, file));
  console.log('  ✓', file, `(${size}px)`);
}

async function main() {
  console.log('Generating icons →', ASSETS);
  // Full app icon (iOS + fallback): gradient bg + glow + blocks
  await render(buildSVG({ background: true, scale: 1 }), 1024, 'icon.png');
  // Android adaptive foreground: transparent, blocks shrunk into the safe zone
  await render(
    buildSVG({ background: false, scale: 0.82 }),
    1024,
    'adaptive-icon.png'
  );
  // Splash logo: transparent (plugin paints the bg color behind it)
  await render(buildSVG({ background: false, scale: 1 }), 512, 'splash-icon.png');
  // Web favicon
  await render(buildSVG({ background: true, scale: 1 }), 48, 'favicon.png');
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
