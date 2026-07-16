// Generates all Rowflare icon / splash PNGs from one SVG mark.
// Run with: node scripts/generate-icons.mjs
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, "..", "assets");

const TILES = [
  { from: "#6FE0FF", to: "#2D9CFF" },
  { from: "#FF7AB8", to: "#FF477E" },
  { from: "#FFD56F", to: "#FFA53B" },
];

const SIZE = 220;
const GAP = 34;
const RADIUS = 46;
const START_X = (1024 - (SIZE * 3 + GAP * 2)) / 2;
const positions = [
  [START_X, 402],
  [START_X + SIZE + GAP, 402],
  [START_X + (SIZE + GAP) * 2, 402],
];

function defs() {
  const gradients = TILES.map(
    (tile, index) => `
      <linearGradient id="tile${index}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${tile.from}"/>
        <stop offset="1" stop-color="${tile.to}"/>
      </linearGradient>`,
  ).join("");

  const clips = positions
    .map(
      ([x, y], index) => `
        <clipPath id="clip${index}">
          <rect x="${x}" y="${y}" width="${SIZE}" height="${SIZE}" rx="${RADIUS}"/>
        </clipPath>`,
    )
    .join("");

  return `<defs>
    <linearGradient id="background" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#202A66"/>
      <stop offset="1" stop-color="#080A1F"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.48">
      <stop offset="0" stop-color="#FFD25A" stop-opacity="0.42"/>
      <stop offset="1" stop-color="#5B7CFF" stop-opacity="0"/>
    </radialGradient>
    ${gradients}
    ${clips}
  </defs>`;
}

function mark() {
  const tiles = positions
    .map(
      ([x, y], index) => `
      <rect x="${x}" y="${y}" width="${SIZE}" height="${SIZE}" rx="${RADIUS}" fill="url(#tile${index})"/>
      <g clip-path="url(#clip${index})">
        <rect x="${x}" y="${y}" width="${SIZE}" height="${SIZE * 0.34}" fill="#FFFFFF" fill-opacity="0.26"/>
      </g>`,
    )
    .join("");

  const flare = `
    <path d="M512 322 L542 472 L692 512 L542 552 L512 702 L482 552 L332 512 L482 472 Z"
      fill="#FFFFFF" fill-opacity="0.96"/>
    <path d="M512 430 L594 512 L512 594 L430 512 Z"
      fill="#FFD25A" fill-opacity="0.9"/>`;

  return tiles + flare;
}

function buildSvg({ background, scale = 1 }) {
  const backdrop = background
    ? `<rect width="1024" height="1024" fill="url(#background)"/>
       <ellipse cx="512" cy="512" rx="560" ry="560" fill="url(#glow)"/>`
    : "";
  const body = `<g transform="translate(512,512) scale(${scale}) translate(-512,-512)">${mark()}</g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    ${defs()}
    ${backdrop}
    ${body}
  </svg>`;
}

async function render(svg, size, file) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(join(ASSETS, file));
  console.log("  ✓", file, `(${size}px)`);
}

async function main() {
  console.log("Generating Rowflare icons →", ASSETS);
  await render(buildSvg({ background: true }), 1024, "icon.png");
  await render(
    buildSvg({ background: false, scale: 0.76 }),
    1024,
    "adaptive-icon.png",
  );
  await render(buildSvg({ background: false }), 512, "splash-icon.png");
  await render(buildSvg({ background: true }), 48, "favicon.png");
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
