/* ============================================================
   lightbox.js — Gallery Lightbox
   Conservation Trips & Adventures
   ============================================================ */

(function() {
  'use strict';

  const overlay = document.querySelector('.lightbox-overlay');
  if (!overlay) return;

  const img = overlay.querySelector('img');
  const closeBtn = overlay.querySelector('.lightbox-close');
  const prevBtn = overlay.querySelector('.lightbox-prev');
  const nextBtn = overlay.querySelector('.lightbox-next');

  let images = [];
  let current = 0;

  function open(srcs, index) {
    images = srcs;
    current = index;
    show();
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    images = [];
  }

  function show() {
    if (!images.length) return;
    img.src = images[current];
  }

  function next() {
    current = (current + 1) % images.length;
    show();
  }

  function prev() {
    current = (current - 1 + images.length) % images.length;
    show();
  }

  // Bind gallery items
  function bindGallery() {
    const items = document.querySelectorAll('.gallery-item img');
    const srcs = Array.from(items).map(i => i.src);

    items.forEach((item, index) => {
      item.parentElement.addEventListener('click', () => open(srcs, index));
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', close);
  if (prevBtn) prevBtn.addEventListener('click', prev);
  if (nextBtn) nextBtn.addEventListener('click', next);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  // Keyboard
  document.addEventListener('keydown', e => {
    if (!overlay.classList.contains('active')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
  });

  bindGallery();

  // Expose for external use
  window.LightboxOpen = open;

})();
