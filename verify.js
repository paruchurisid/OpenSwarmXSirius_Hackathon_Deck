const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'http://localhost:8791';
const OUT = 'shots';
const fail = [];
const ok = (m) => console.log('  PASS  ' + m);
const bad = (m) => { console.log('  FAIL  ' + m); fail.push(m); };

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  /* ── external requests must be zero ── */
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const external = [];
  ctx.on('request', r => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:')) external.push(r.url()); });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  console.log('\n=== 1. LOAD + SLIDE COUNT ===');
  await page.goto(BASE + '/?autoplay=0', { waitUntil: 'networkidle' });
  const count = await page.locator('.slide').count();
  count === 14 ? ok('14 slides') : bad('slide count = ' + count);

  console.log('\n=== 2. PER-SLIDE OVERFLOW + SCREENSHOTS (1280x720) ===');
  for (let n = 1; n <= 14; n++) {
    await page.goto(BASE + '/?autoplay=0#' + n, { waitUntil: 'load' });
    await page.waitForTimeout(1150); // let entrance animations settle
    const m = await page.evaluate(() => {
      const s = document.querySelector('.slide.on');
      const r = s.getBoundingClientRect();
      let worst = 0, culprit = '';
      s.querySelectorAll('*').forEach(el => {
        const b = el.getBoundingClientRect();
        if (b.width === 0 && b.height === 0) return;
        const over = Math.max(b.bottom - r.bottom, b.right - r.right, r.top - b.top, r.left - b.left);
        if (over > worst) { worst = over; culprit = el.className || el.tagName; }
      });
      return {
        label: s.getAttribute('aria-label'),
        foot: [...s.querySelectorAll('.foot span')].map(x => x.textContent),
        scrollOver: s.scrollHeight - s.clientHeight,
        worst: Math.round(worst),
        culprit: String(culprit).slice(0, 46)
      };
    });
    await page.screenshot({ path: `${OUT}/slide-${String(n).padStart(2, '0')}.png` });
    const clean = m.scrollOver <= 1 && m.worst <= 2;
    const msg = `slide ${String(n).padStart(2)} [${m.foot.join(' / ')}] scrollOver=${m.scrollOver} maxBleed=${m.worst}px ${m.culprit ? '(' + m.culprit + ')' : ''}`;
    clean ? ok(msg) : bad(msg);
  }

  console.log('\n=== 3. NAVIGATION ===');
  await page.goto(BASE + '/?autoplay=0', { waitUntil: 'load' });
  const cur = () => page.evaluate(() => [...document.querySelectorAll('.slide')].findIndex(s => s.classList.contains('on')));

  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(120);
  (await cur()) === 1 ? ok('ArrowRight advances') : bad('ArrowRight -> ' + await cur());
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(120);
  (await cur()) === 0 ? ok('ArrowLeft goes back') : bad('ArrowLeft -> ' + await cur());
  await page.keyboard.press('End'); await page.waitForTimeout(120);
  (await cur()) === 13 ? ok('End -> last slide') : bad('End -> ' + await cur());
  await page.keyboard.press('Home'); await page.waitForTimeout(120);
  (await cur()) === 0 ? ok('Home -> first slide') : bad('Home -> ' + await cur());

  // click zones
  await page.mouse.click(1000, 400); await page.waitForTimeout(120);
  (await cur()) === 1 ? ok('right-zone click advances') : bad('right click -> ' + await cur());
  await page.mouse.click(120, 400); await page.waitForTimeout(120);
  (await cur()) === 0 ? ok('left-zone click goes back') : bad('left click -> ' + await cur());

  // wrap
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(120);
  (await cur()) === 13 ? ok('wraps backwards to 14') : bad('wrap -> ' + await cur());

  console.log('\n=== 4. DEEP LINKS ===');
  await page.goto(BASE + '/#7', { waitUntil: 'load' }); await page.waitForTimeout(250);
  const s7 = await page.evaluate(() => document.querySelector('.slide.on').getAttribute('aria-label'));
  const f7 = await page.evaluate(() => [...document.querySelectorAll('.slide.on .foot span')].pop().textContent);
  (await cur()) === 6 && f7 === '07' ? ok(`#7 -> ${s7}, footer "${f7}"`) : bad(`#7 -> idx ${await cur()}, footer "${f7}"`);
  await page.goto(BASE + '/#13', { waitUntil: 'load' }); await page.waitForTimeout(250);
  (await cur()) === 12 ? ok('#13 -> slide 13') : bad('#13 -> ' + await cur());

  console.log('\n=== 5. AUTOPLAY ===');
  await page.goto(BASE + '/?autoplay=0', { waitUntil: 'load' });
  await page.waitForTimeout(8500);
  (await cur()) === 0 ? ok('?autoplay=0 stays on slide 1 after 8.5s') : bad('autoplay=0 drifted to ' + await cur());
  const hintOff = await page.textContent('#hint');
  ok('  hint reads: "' + hintOff.trim() + '"');

  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.waitForTimeout(7600);
  (await cur()) === 1 ? ok('auto-advanced 1 -> 2 (~7s)') : bad('autoplay did not advance, at ' + await cur());

  console.log('\n=== 6. SPACE PAUSE ===');
  await page.keyboard.press(' '); await page.waitForTimeout(200);
  const paused = await page.evaluate(() => document.body.classList.contains('paused'));
  const hintPaused = (await page.textContent('#hint')).trim();
  paused ? ok('space sets paused state (body.paused)') : bad('space did not pause');
  hintPaused.includes('paused') ? ok('visible state change: "' + hintPaused + '"') : bad('hint text: ' + hintPaused);
  const before = await cur();
  await page.waitForTimeout(9000);
  (await cur()) === before ? ok('no advance while paused (9s)') : bad('advanced while paused');
  await page.keyboard.press(' '); await page.waitForTimeout(200);
  const resumed = await page.evaluate(() => !document.body.classList.contains('paused'));
  resumed ? ok('space resumes') : bad('space did not resume');

  console.log('\n=== 7. NO-JS ===');
  const ctx2 = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 720 } });
  const p2 = await ctx2.newPage();
  await p2.goto(BASE + '/', { waitUntil: 'load' });
  const vis = await p2.evaluate(() => {
    const all = [...document.querySelectorAll('.slide')];
    return all.filter(s => getComputedStyle(s).opacity !== '0' && s.getBoundingClientRect().height > 100).length;
  });
  vis === 14 ? ok('all 14 slides readable with JS disabled') : bad('JS-off visible slides = ' + vis);
  await p2.screenshot({ path: `${OUT}/nojs-top.png` });
  await ctx2.close();

  console.log('\n=== 8. PHONE 360px ===');
  const ctx3 = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const p3 = await ctx3.newPage();
  let phoneBad = 0;
  for (const n of [1, 2, 3, 4, 7, 8, 13]) {
    await p3.goto(BASE + '/?autoplay=0#' + n, { waitUntil: 'load' });
    await p3.waitForTimeout(700);
    const hOver = await p3.evaluate(() => {
      const d = document.documentElement;
      return { x: d.scrollWidth - d.clientWidth, fs: parseFloat(getComputedStyle(document.querySelector('.slide.on h1,.slide.on h2')).fontSize) };
    });
    if (hOver.x > 2) { bad(`phone slide ${n}: ${hOver.x}px horizontal overflow`); phoneBad++; }
    await p3.screenshot({ path: `${OUT}/phone-${String(n).padStart(2, '0')}.png`, fullPage: true });
  }
  if (!phoneBad) ok('no horizontal overflow at 360px on sampled slides');
  await ctx3.close();

  console.log('\n=== 9. REDUCED MOTION ===');
  const ctx4 = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
  const p4 = await ctx4.newPage();
  await p4.goto(BASE + '/', { waitUntil: 'load' });
  await p4.waitForTimeout(400);
  const rmVisible = await p4.evaluate(() => {
    const s = document.querySelector('.slide.on h1, .slide.on h2');
    return getComputedStyle(s).opacity;
  });
  rmVisible === '1' ? ok('reduced-motion: content visible immediately') : bad('reduced-motion opacity=' + rmVisible);
  await p4.waitForTimeout(7200);
  const rmIdx = await p4.evaluate(() => [...document.querySelectorAll('.slide')].findIndex(s => s.classList.contains('on')));
  rmIdx === 1 ? ok('reduced-motion: auto-advance still runs') : bad('reduced-motion advance -> ' + rmIdx);
  await ctx4.close();

  console.log('\n=== 10. NETWORK + ERRORS ===');
  external.length === 0 ? ok('zero external network requests') : bad('external requests: ' + external.join(', '));
  errors.length === 0 ? ok('no console/page errors') : bad('errors: ' + errors.slice(0, 3).join(' | '));

  await browser.close();

  console.log('\n' + '='.repeat(52));
  console.log(fail.length ? `${fail.length} FAILURE(S)` : 'ALL CHECKS PASSED');
  fail.forEach(f => console.log('  - ' + f));
  process.exit(fail.length ? 1 : 0);
})();
