/* ============================================================
   lightbox.js — Gallery Lightbox
   Conservation Trips & Adventures
   ============================================================ */

(function () {
  'use strict';

  var overlay = document.querySelector('.lightbox-overlay');
  if (!overlay) return;

  var img = overlay.querySelector('img');
  var closeBtn = overlay.querySelector('.lightbox-close');
  var prevBtn = overlay.querySelector('.lightbox-prev');
  var nextBtn = overlay.querySelector('.lightbox-next');
  var countEl = overlay.querySelector('.lightbox-count');

  var items = [];
  var current = 0;
  var lastFocus = null;

  var reduced = function () { return window.Motion && window.Motion.prefersReducedMotion(); };

  function isOpen() { return overlay.classList.contains('active'); }

  // Accepts ["src", …] or [{ src, alt }, …]
  function normalise(list) {
    return list.map(function (it) {
      return typeof it === 'string' ? { src: it, alt: '' } : it;
    });
  }

  function apply() {
    var item = items[current];
    // the deferred swap in show() can fire after the lightbox was closed
    if (!item) return;
    img.src = item.src;
    img.alt = item.alt || 'Gallery image ' + (current + 1);
    if (countEl) countEl.textContent = (current + 1) + ' / ' + items.length;
  }

  function show(initial) {
    if (!items.length) return;
    var item = items[current];
    if (initial || reduced() || img.getAttribute('src') === item.src) {
      img.classList.remove('is-swapping');
      apply();
      return;
    }
    // quick fade-through so the swap doesn't pop
    img.classList.add('is-swapping');
    var done = function () { img.classList.remove('is-swapping'); img.onload = img.onerror = null; };
    img.onload = done;
    img.onerror = done;
    setTimeout(apply, 120);
  }

  function open(list, index, trigger) {
    stopSpring();
    resetPaint();
    items = normalise(list);
    current = index || 0;
    lastFocus = trigger || document.activeElement;
    show(true);
    preloadNeighbours();
    overlay.classList.add('active');
    document.documentElement.classList.add('no-scroll');
    closeBtn.focus({ preventScroll: true });
  }

  function close() {
    stopSpring();
    overlay.classList.remove('active');
    document.documentElement.classList.remove('no-scroll');
    items = [];
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  // Warm the cache for the photos either side of the current one, so stepping
  // through a long album doesn't wait on the network each time.
  function preloadNeighbours() {
    if (items.length < 2) return;
    [1, -1].forEach(function (d) {
      var it = items[(current + d + items.length) % items.length];
      if (it && it.src) new Image().src = it.src;
    });
  }

  function next() { current = (current + 1) % items.length; show(false); preloadNeighbours(); }
  function prev() { current = (current - 1 + items.length) % items.length; show(false); preloadNeighbours(); }

  // Gallery tiles become real, keyboard-operable buttons
  function bindGallery() {
    var tiles = Array.prototype.slice.call(document.querySelectorAll('.gallery-item'));
    var list = tiles.map(function (tile) {
      var im = tile.querySelector('img');
      return { src: im ? im.src : '', alt: im ? im.alt : '' };
    });
    tiles.forEach(function (tile, index) {
      tile.setAttribute('role', 'button');
      tile.setAttribute('tabindex', '0');
      tile.setAttribute('aria-label', 'View larger: ' + (list[index].alt || 'image ' + (index + 1)));
      tile.addEventListener('click', function () { open(list, index, tile); });
      tile.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(list, index, tile); }
      });
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', close);
  if (prevBtn) prevBtn.addEventListener('click', prev);
  if (nextBtn) nextBtn.addEventListener('click', next);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

  document.addEventListener('keydown', function (e) {
    if (!isOpen()) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowRight') { next(); return; }
    if (e.key === 'ArrowLeft') { prev(); return; }
    if (e.key === 'Tab') {
      // trap focus inside the dialog
      var controls = [closeBtn, prevBtn, nextBtn].filter(Boolean);
      var i = controls.indexOf(document.activeElement);
      // i === -1: focus has strayed outside the dialog — pull it back in
      if (e.shiftKey && i <= 0) { e.preventDefault(); controls[controls.length - 1].focus(); }
      else if (!e.shiftKey && (i === -1 || i === controls.length - 1)) { e.preventDefault(); controls[0].focus(); }
    }
  });

  /* ─── Touch: the photo follows the finger ───
     Same model as the mobile menu: ~10px of intent picks an axis, the photo
     tracks 1:1, and on release the flick is projected to decide where it
     was going, then a spring carries on at the finger's own velocity.
     Sideways browses; up or down dismisses (the dim fades with the drag).
     Touch and pen only: a mouse has the arrows and Escape. */
  var M = window.Motion;
  var drag = null;
  var spring = null;
  var offX = 0, offY = 0;
  var swallowClick = false;
  var lastAxis = 'x';

  function paint() {
    var h = overlay.clientHeight || window.innerHeight;
    var p = Math.min(Math.abs(offY) / (h * 0.6), 1);
    img.style.transform = 'translate3d(' + offX + 'px,' + offY + 'px,0) scale(' + (1 - p * 0.12) + ')';
    overlay.style.setProperty('--lb-alpha', String(0.92 * (1 - p)));
  }

  function resetPaint() {
    offX = 0; offY = 0;
    img.style.transform = '';
    overlay.style.removeProperty('--lb-alpha');
  }

  function stopSpring() {
    if (spring) { spring.stop(); spring = null; }
  }

  // throws if the pointer has already gone (a quick tap, a cancelled touch)
  function capture(id) {
    try { overlay.setPointerCapture(id); } catch (err) { /* nothing to hold on to */ }
  }

  function velocityOf(samples, axis, now) {
    // px/s over the last ~100ms of movement, measured at the moment of release:
    // a finger that rested before it lifted has no momentum to hand over
    var last = samples[samples.length - 1];
    if (now - last.t > 100) return 0;
    var first = last;
    for (var i = samples.length - 1; i >= 0; i--) {
      if (last.t - samples[i].t > 100) break;
      first = samples[i];
    }
    var dt = last.t - first.t;
    return dt > 0 ? ((last[axis] - first[axis]) / dt) * 1000 : 0;
  }

  function springAxis(axis, to, v, done) {
    stopSpring();
    spring = M.spring({
      from: axis === 'x' ? offX : offY,
      to: to,
      velocity: v,
      response: 0.38,
      damping: Math.abs(v) > 600 ? 0.8 : 1, // only a real flick earns overshoot
      onUpdate: function (x) { if (axis === 'x') offX = x; else offY = x; paint(); },
      onDone: function () { spring = null; if (done) done(); }
    });
  }

  // Slide the current photo out, bring the neighbour in from the other side
  function browse(sign, v) {
    var w = overlay.clientWidth || window.innerWidth;
    var step = sign < 0 ? 1 : -1; // swiped left → next photo
    var swap = function () {
      current = (current + step + items.length) % items.length;
      var incoming = items[current];
      var enter = function () {
        apply();
        preloadNeighbours();
        offX = -sign * w * 1.1; offY = 0;
        paint();
        if (M.prefersReducedMotion()) { resetPaint(); return; }
        springAxis('x', 0, 0, resetPaint);
      };
      // swap only once the next photo can paint, so it never arrives blank
      var pre = new Image();
      pre.src = incoming.src;
      if (pre.decode) pre.decode().then(enter, enter); else enter();
    };
    if (M.prefersReducedMotion()) { swap(); return; }
    springAxis('x', sign * w * 1.1, v, swap); // carries the finger's own velocity
  }

  function settle(axis, v) {
    lastAxis = axis;
    var reduced = M.prefersReducedMotion();
    if (axis === 'x') {
      var w = overlay.clientWidth || window.innerWidth;
      var projected = offX + M.project(v, 0.99);
      var sign = projected < 0 ? -1 : 1;
      var go = items.length > 1 && (Math.abs(projected) > w * 0.3 || Math.abs(v) > 500) &&
               (Math.abs(offX) < 2 || (offX < 0) === (sign < 0));
      if (go) { browse(sign, v); return; }
      if (reduced) { resetPaint(); return; }
      springAxis('x', 0, v, resetPaint);
    } else {
      var h = overlay.clientHeight || window.innerHeight;
      var projY = offY + M.project(v, 0.99);
      var dismiss = Math.abs(projY) > h * 0.25 || Math.abs(v) > 600;
      if (dismiss) {
        var dir = (projY !== 0 ? projY : v) < 0 ? -1 : 1;
        var finish = function () { close(); resetPaint(); };
        if (reduced) { finish(); return; }
        springAxis('y', dir * h, v, finish);
        return;
      }
      if (reduced) { resetPaint(); return; }
      springAxis('y', 0, v, resetPaint);
    }
  }

  overlay.addEventListener('pointerdown', function (e) {
    if (!isOpen() || !M || e.pointerType === 'mouse' || !e.isPrimary) return;
    if (e.target.closest && e.target.closest('button')) return;
    var interrupted = !!spring;
    stopSpring(); // grabbed mid-flight: carry on from where it is
    drag = {
      id: e.pointerId, x0: e.clientX, y0: e.clientY, bx: offX, by: offY,
      axis: interrupted ? lastAxis : null,
      samples: [{ x: e.clientX, y: e.clientY, t: e.timeStamp }]
    };
    swallowClick = false;
    if (interrupted) { capture(e.pointerId); swallowClick = true; }
  });

  overlay.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x0;
    var dy = e.clientY - drag.y0;
    if (!drag.axis) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      capture(drag.id);
      swallowClick = true;
    }
    if (drag.axis === 'x') {
      var raw = drag.bx + dx;
      // a single photo has nowhere to go: resist instead of following
      offX = items.length > 1 ? raw : M.rubberband(raw, overlay.clientWidth || window.innerWidth);
      offY = 0;
    } else {
      offY = drag.by + dy;
      offX = 0;
    }
    paint();
    drag.samples.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
    if (drag.samples.length > 8) drag.samples.shift();
  });

  function endDrag(e, cancelled) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag;
    drag = null;
    if (!d.axis) return; // a tap: let the click through
    settle(d.axis, cancelled ? 0 : velocityOf(d.samples, d.axis, e.timeStamp));
  }
  overlay.addEventListener('pointerup', function (e) { endDrag(e, false); });
  overlay.addEventListener('pointercancel', function (e) { endDrag(e, true); });

  // a drag that ends over the backdrop must not also count as a tap that closes it
  overlay.addEventListener('click', function (e) {
    if (swallowClick) { e.stopPropagation(); swallowClick = false; }
  }, true);

  bindGallery();

  // Expose for external use
  window.LightboxOpen = open;

})();
