/* Dual-Loop Retention Swarm — deck controller */
(function () {
  'use strict';

  var slides = [].slice.call(document.querySelectorAll('.slide'));
  if (!slides.length) return;

  var progress = document.getElementById('prog');
  var hint = document.getElementById('hint');
  var scaler = document.getElementById('scaler');

  var i = 0;

  /* progress: one segment per slide */
  var segs = slides.map(function () {
    var el = document.createElement('i');
    progress.appendChild(el);
    return el;
  });

  function paintProgress() {
    for (var k = 0; k < segs.length; k++) {
      segs[k].className = k < i ? 'past' : (k === i ? 'cur' : '');
    }
    segs[i].style.setProperty('--pct', 1);
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
    paintProgress();
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

  /* click zones: left third back, right two-thirds forward */
  addEventListener('click', function (e) {
    if (e.target.closest('#nav') || e.target.closest('a')) return;
    show(i + (e.clientX < innerWidth / 3 ? -1 : 1));
  });

  document.getElementById('prev').addEventListener('click', function () { show(i - 1); });
  document.getElementById('next').addEventListener('click', function () { show(i + 1); });
  fit();
  show(fromHash(), true);
  hint.textContent = 'click to advance · click left third to go back';
})();
