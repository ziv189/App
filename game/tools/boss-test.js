// Scripted run through the Regent fight, chapter 5, and one ending. Usage: node boss-test.js [good|bad]
const { chromium } = require('playwright');
const choice = process.argv[2] || 'good';
const log = (...a) => console.log(...a);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/ERR_FILE_NOT_FOUND/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.goto('file:///home/user/App/game/index.html');
  await p.waitForTimeout(400);
  const st = () => p.evaluate(() => window.LHF.state());
  const dismiss = async (max = 80) => {
    for (let i = 0; i < max; i++) {
      const s = await st();
      if (s.mode !== 'dialog' && s.mode !== 'endcard') break;
      if (s.choice) { if (choice === 'bad') { await p.keyboard.press('ArrowDown'); await p.waitForTimeout(80); } }
      await p.keyboard.press('Enter');
      await p.waitForTimeout(160);
    }
  };
  const settle = async (ms = 2600) => { await p.waitForTimeout(ms); };

  await p.evaluate(() => window.LHF.start('ch4'));
  await p.waitForTimeout(300);
  await p.evaluate(() => window.LHF.skipCard());
  await dismiss();
  log('ch4 start', JSON.stringify(await st()).slice(0, 200));

  // Walk to the gate, then let the intro scene play.
  await p.evaluate(() => window.LHF.teleport(3700, 512));
  await p.waitForTimeout(300);
  await dismiss();
  await p.evaluate(() => window.LHF.teleport(3835, 512));
  await p.waitForTimeout(400);
  let s = await st();
  log('at gate', 'gateClosed', s.gateClosed, 'boss', JSON.stringify(s.boss));
  await dismiss();
  s = await st();
  log('boss after intro', JSON.stringify(s.boss), 'gateClosed', s.gateClosed);

  // Phase 2 and 3 via real hits.
  await settle(2000);
  await p.evaluate(() => window.LHF.hitBoss(6));   // 18 -> 12, phase 2
  await dismiss();
  s = await st(); log('after phase2 hits', JSON.stringify(s.boss));
  await p.evaluate(() => window.LHF.hitBoss(6));   // 12 -> 6, phase 3
  await dismiss();
  s = await st(); log('after phase3 hits', JSON.stringify(s.boss));
  await p.evaluate(() => window.LHF.hitBoss(6));   // 6 -> 0, defeated
  await p.waitForTimeout(2600);
  await dismiss();
  s = await st(); log('after defeat', JSON.stringify(s.boss), 'gateClosed', s.gateClosed, 'mode', s.mode);

  // Reach the exit (X at col 166).
  await p.evaluate(() => window.LHF.teleport(166 * 32 + 8, 512));
  await p.waitForTimeout(1600);
  s = await st(); log('after exit', 'chapter', s.chapter, 'mode', s.mode);
  await dismiss();

  // Chapter 5: jump to the choice scene.
  await p.evaluate(() => window.LHF.skipCard());
  await dismiss();
  await p.evaluate(() => window.LHF.teleport(124 * 32 + 4, 512));
  await p.waitForTimeout(400);
  await dismiss(120);
  s = await st(); log('ch5 after choice', 'chapter', s.chapter, 'mode', s.mode, 'endKey', s.endKey);
  await dismiss(40);
  await p.waitForTimeout(3000);
  s = await st(); log('ending', 'mode', s.mode, 'endKey', s.endKey);
  await p.screenshot({ path: `shot-ending-${choice}.png` });
  await p.keyboard.press('Enter');
  await p.waitForTimeout(3000);
  s = await st(); log('after credits', 'mode', s.mode);
  log('errors:', errs.length);
  errs.slice(0, 10).forEach((e) => log('  ' + e));
  await b.close();
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
