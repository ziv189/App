/**
 * Hand-written labels for props (the basement's boxes):
 *   node tools/make-labels.mjs   ->  assets-src/work/tex/label_*.png
 */
import sharp from 'sharp';

const labels = {
  ivy_keep: ['IVY — KEEP', -3],
  ivy_toys: ['IVY — TOYS', 2],
  xmas: ['XMAS', -1],
};
for (const [name, [text, rot]] of Object.entries(labels)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="256">
    <rect width="512" height="256" fill="#b58d5c"/>
    <rect x="18" y="40" width="476" height="176" fill="#e9dfc4" transform="rotate(${rot} 256 128)"/>
    <text x="256" y="152" font-family="DejaVu Sans, sans-serif" font-weight="bold" font-size="${text.length > 6 ? 68 : 96}"
      fill="#15151c" text-anchor="middle" transform="rotate(${rot} 256 128)" style="letter-spacing:4px">${text}</text>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(`assets-src/work/tex/label_${name}.png`);
  console.log('label', name);
}

// A child's wet footprint (the trail on the landing in chapter 3): dark sole and toes on transparent.
const foot = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="256">
  <g fill="#000">
    <path d="M64 70 C92 70 100 110 96 150 C92 190 88 236 62 240 C38 244 34 205 36 170 C38 135 30 72 64 70 Z"/>
    <ellipse cx="44" cy="54" rx="11" ry="14"/><ellipse cx="66" cy="44" rx="9" ry="11"/><ellipse cx="84" cy="48" rx="7" ry="9"/>
    <ellipse cx="97" cy="58" rx="6" ry="7"/><ellipse cx="106" cy="72" rx="5" ry="6"/>
  </g></svg>`;
await sharp(Buffer.from(foot)).png().toFile('assets-src/work/tex/footprint.png');
console.log('footprint');
