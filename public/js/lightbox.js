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
    items = normalise(list);
    current = index || 0;
    lastFocus = trigger || document.activeElement;
    show(true);
    overlay.classList.add('active');
    document.documentElement.classList.add('no-scroll');
    closeBtn.focus({ preventScroll: true });
  }

  function close() {
    overlay.classList.remove('active');
    document.documentElement.classList.remove('no-scroll');
    items = [];
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function next() { current = (current + 1) % items.length; show(false); }
  function prev() { current = (current - 1 + items.length) % items.length; show(false); }

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
      if (e.shiftKey && i <= 0) { e.preventDefault(); controls[controls.length - 1].focus(); }
      else if (!e.shiftKey && i === controls.length - 1) { e.preventDefault(); controls[0].focus(); }
    }
  });

  // Touch: swipe sideways to browse, swipe down to dismiss (intent-locked)
  var sx = 0, sy = 0;
  overlay.addEventListener('touchstart', function (e) {
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
  }, { passive: true });
  overlay.addEventListener('touchend', function (e) {
    if (!isOpen() || items.length === 0) return;
    var dx = e.changedTouches[0].clientX - sx;
    var dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 50) {
      if (dx < 0) next(); else prev();
    } else if (dy > 90 && dy > Math.abs(dx) * 1.5) {
      close();
    }
  }, { passive: true });

  bindGallery();

  // Expose for external use
  window.LightboxOpen = open;

})();
