/**
 * Renders Ivy's crayon drawings (the SVGs the game shows in close-up) to textures for the rooms:
 *   node --experimental-strip-types tools/make-drawings.mjs   ->  assets-src/work/tex/drawing_<variant>.png
 */
import sharp from 'sharp';

const mod = await import('../src/story/content.ts');
for (const v of ['family', 'ice']) {
  const svg = mod.ivyDrawingSvg(v);
  await sharp(Buffer.from(svg)).resize(512, null, { fit: 'inside' }).flatten({ background: '#f4efe4' }).png().toFile(`assets-src/work/tex/drawing_${v}.png`);
  const meta = await sharp(`assets-src/work/tex/drawing_${v}.png`).metadata();
  console.log(v, meta.width, meta.height);
}
