// Headless playtest for The Frozen Hour. Usage: node playtest.js [chapterId]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.dirname(__filename);
const chapter = process.argv[2] || 'ch1';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

  await page.goto('file:///home/user/App/game/index.html');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'shot-title.png') });

  await page.evaluate((id) => window.LHF.start(id), chapter);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, `shot-${chapter}-card.png`) });
  await page.evaluate(() => window.LHF.skipCard());
  await page.waitForTimeout(300);

  const st = () => page.evaluate(() => window.LHF.state());
  console.log('after start:', JSON.stringify(await st()));

  // dismiss any opening dialogue: press Enter repeatedly
  for (let i = 0; i < 60; i++) {
    const s = await st();
    if (s.mode !== 'dialog') break;
    await page.keyboard.press('Enter');
    await page.waitForTimeout(120);
  }
  await page.screenshot({ path: path.join(OUT, `shot-${chapter}-start.png`) });

  // walk right for a while, jumping now and then
  await page.keyboard.down('ArrowRight');
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(250);
    if (i % 3 === 2) { await page.keyboard.press('Space'); }
    const s = await st();
    if (s.mode === 'dialog') {
      await page.keyboard.up('ArrowRight');
      for (let j = 0; j < 40 && (await st()).mode === 'dialog'; j++) { await page.keyboard.press('Enter'); await page.waitForTimeout(120); }
      await page.keyboard.down('ArrowRight');
    }
  }
  await page.keyboard.up('ArrowRight');
  await page.screenshot({ path: path.join(OUT, `shot-${chapter}-walk.png`) });
  console.log('after walk:', JSON.stringify(await st()));

  // a few more keys to exercise attack and dash
  await page.keyboard.press('KeyX');
  await page.keyboard.press('KeyK');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, `shot-${chapter}-attack.png`) });

  fs.writeFileSync(path.join(OUT, `errors-${chapter}.txt`), errors.join('\n') || 'no errors');
  console.log('errors:', errors.length);
  errors.slice(0, 10).forEach((e) => console.log('  ' + e));
  await browser.close();
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
