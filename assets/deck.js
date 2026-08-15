/* Dual-Loop Retention Swarm — deck controller */
(function () {
  'use strict';

  var slides = [].slice.call(document.querySelectorAll('.slide'));
  if (!slides.length) return;

  var progress = document.getElementById('prog');
  var hint = document.getElementById('hint');
  var scaler = document.getElementById('scaler');

  var DEFAULT_DWELL = 7000;
  var DWELL = { 0: 6000, 2: 9000, 6: 9000, 12: 9000, 13: 12000 };

  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var autoplay = new URLSearchParams(location.search).get('autoplay') !== '0';

  var i = 0, timer = null, rafId = null, paused = !autoplay, startedAt = 0, dwell = DEFAULT_DWELL;

  /* progress: one segment per slide */
  var segs = slides.map(function () {
    var el = document.createElement('i');
    progress.appendChild(el);
    return el;
  });

  function paintProgress(pct) {
    for (var k = 0; k < segs.length; k++) {
      segs[k].className = k < i ? 'past' : (k === i ? 'cur' : '');
    }
    segs[i].style.setProperty('--pct', reduced || paused ? 1 : (pct || 0));
  }

  function tick() {
    var pct = Math.min(1, (performance.now() - startedAt) / dwell);
    segs[i].style.setProperty('--pct', pct);
    if (pct < 1) rafId = requestAnimationFrame(tick);
  }

  function clearTimers() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  function arm() {
    clearTimers();
    paintProgress(0);
    if (paused) return;
    dwell = DWELL[i] || DEFAULT_DWELL;
    startedAt = performance.now();
    rafId = requestAnimationFrame(tick);
    timer = setTimeout(function () { show(i + 1); }, dwell);
  }

  /* re-run entrance animations when a slide is revisited */
  function replay(el) {
    if (reduced) return;
    var nodes = el.querySelectorAll('*');
    for (var k = 0; k < nodes.length; k++) {
      var n = nodes[k];
      if (getComputedStyle(n).animationName !== 'none') {
        n.style.animation = 'none';
        void n.offsetWidth;
        n.style.animation = '';
      }
    }
  }

  function show(n, fromHash) {
    i = ((n % slides.length) + slides.length) % slides.length;
    for (var k = 0; k < slides.length; k++) {
      slides[k].classList.toggle('on', k === i);
      slides[k].setAttribute('aria-hidden', k === i ? 'false' : 'true');
    }
    replay(slides[i]);
    if (!fromHash) {
      var h = '#' + (i + 1);
      if (location.hash !== h) history.replaceState(null, '', h);
    }
    arm();
  }

  function setPaused(p) {
    paused = p;
    document.body.classList.toggle('paused', paused);
    hint.textContent = paused ? 'paused · press space to resume' : 'auto-advancing · press space to pause';
    hint.style.opacity = .8;
    if (paused) { clearTimers(); paintProgress(1); } else arm();
    if (!paused) fadeHint();
  }

  var hintTimer;
  function fadeHint() {
    clearTimeout(hintTimer);
    hintTimer = setTimeout(function () { if (!paused) hint.style.opacity = 0; }, 4500);
  }

  function fit() {
    if (matchMedia('(max-width:820px),(max-aspect-ratio:3/4)').matches) {
      scaler.style.transform = '';
      return;
    }
    var s = Math.min(innerWidth / 1280, innerHeight / 720);
    scaler.style.transform = 'scale(' + s + ')';
  }

  /* deep link: #7 -> slide 7 */
  function fromHash() {
    var n = parseInt((location.hash || '').replace('#', ''), 10);
    return isFinite(n) && n >= 1 && n <= slides.length ? n - 1 : 0;
  }

  addEventListener('resize', fit);
  addEventListener('hashchange', function () { show(fromHash(), true); });

  addEventListener('keydown', function (e) {
    if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); setPaused(!paused); return; }
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); show(i + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); show(i - 1); }
    else if (e.key === 'Home') { e.preventDefault(); show(0); }
    else if (e.key === 'End') { e.preventDefault(); show(slides.length - 1); }
  });

  /* click zones: left third back, right two-thirds forward */
  addEventListener('click', function (e) {
    if (e.target.closest('#nav') || e.target.closest('a')) return;
    show(i + (e.clientX < innerWidth / 3 ? -1 : 1));
  });

  document.getElementById('prev').addEventListener('click', function () { show(i - 1); });
  document.getElementById('next').addEventListener('click', function () { show(i + 1); });
  document.getElementById('pause').addEventListener('click', function () { setPaused(!paused); });

  /* background tabs throttle timers — re-arm so the deck doesn't skip ahead */
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && !paused) arm();
  });

  fit();
  show(fromHash(), true);
  if (paused) {
    document.body.classList.add('paused');
    hint.textContent = 'manual · arrows or click to advance';
  } else fadeHint();
})();
