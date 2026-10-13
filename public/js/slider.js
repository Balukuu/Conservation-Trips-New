/* ============================================================
   slider.js — Hero Slider
   Conservation Trips & Adventures

   The cross-fade, Ken Burns zoom and text entrances are all CSS (driven by
   the .active class), so they re-target cleanly if the visitor changes
   slide mid-transition. This file owns state: which slide is active,
   autoplay (pausable), swipe, and keeping inactive slides out of the
   accessibility tree.
   ============================================================ */

(function () {
  'use strict';

  var INTERVAL = 6000;

  function HeroSlider(el) {
    this.el = el;
    this.slides = Array.prototype.slice.call(el.querySelectorAll('.hero-slide'));
    this.dots = Array.prototype.slice.call(el.querySelectorAll('.slider-dot'));
    this.prevBtn = el.querySelector('.slider-prev');
    this.nextBtn = el.querySelector('.slider-next');
    this.pauseBtn = el.querySelector('.slider-pause');
    this.current = 0;
    this.timer = null;

    // autoplay gates — any one of them stops the carousel
    this.userPaused = false;
    this.hovering = false;
    this.focused = false;
    this.visible = true;
    this.reduced = window.Motion ? window.Motion.prefersReducedMotion() : false;

    if (!this.slides.length) return;
    // looked up once: the links/buttons inside each slide never change
    this.focusables = this.slides.map(function (slide) {
      return Array.prototype.slice.call(slide.querySelectorAll('a, button'));
    });
    this.splitWords();
    this.init();
  }

  HeroSlider.prototype.splitWords = function () {
    // One-off: wrap each title word so CSS can stagger them via --w
    this.slides.forEach(function (slide) {
      var title = slide.querySelector('.slide-title');
      if (!title || title.querySelector('.word-span')) return;
      var words = title.textContent.trim().split(/\s+/);
      title.textContent = '';
      words.forEach(function (word, i) {
        var span = document.createElement('span');
        span.className = 'word-span';
        span.style.setProperty('--w', i);
        span.textContent = word;
        title.appendChild(span);
        title.appendChild(document.createTextNode(' '));
      });
    });
  };

  HeroSlider.prototype.init = function () {
    var self = this;

    // Re-enter the first slide so its text animates in on load. Same tick,
    // before first paint — no flash.
    this.slides[0].classList.remove('active');
    void this.slides[0].offsetWidth;
    this.show(0);

    if (this.prevBtn) this.prevBtn.addEventListener('click', function () { self.go(self.current - 1); });
    if (this.nextBtn) this.nextBtn.addEventListener('click', function () { self.go(self.current + 1); });
    this.dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () { self.go(i); });
    });

    if (this.pauseBtn) {
      this.pauseBtn.addEventListener('click', function () {
        self.userPaused = !self.userPaused;
        self.updatePauseButton();
        self.schedule();
      });
    }

    // Pause for hover (mouse only — touch "hover" would stick), focus, hidden tab, off-screen
    this.el.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'mouse') { self.hovering = true; self.schedule(); }
    });
    this.el.addEventListener('pointerleave', function (e) {
      if (e.pointerType === 'mouse') { self.hovering = false; self.schedule(); }
    });
    this.el.addEventListener('focusin', function () { self.focused = true; self.schedule(); });
    this.el.addEventListener('focusout', function () { self.focused = false; self.schedule(); });
    document.addEventListener('visibilitychange', function () { self.schedule(); });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        self.visible = entries[0].isIntersecting;
        self.schedule();
      }, { threshold: 0.2 }).observe(this.el);
    }

    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      var onChange = function () { self.reduced = mq.matches; self.schedule(); };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
    }

    // Swipe: horizontal intent only (a diagonal scroll must not change slides),
    // and a short fast flick counts as well as a long slow drag.
    var sx = 0, sy = 0, st = 0;
    this.el.addEventListener('touchstart', function (e) {
      var t = e.touches[0];
      sx = t.clientX; sy = t.clientY; st = e.timeStamp;
    }, { passive: true });
    this.el.addEventListener('touchend', function (e) {
      var t = e.changedTouches[0];
      var dx = t.clientX - sx;
      var dy = t.clientY - sy;
      var dt = Math.max(e.timeStamp - st, 1);
      var horizontal = Math.abs(dx) > Math.abs(dy) * 1.5;
      var flick = Math.abs(dx) > 30 && Math.abs(dx) / dt > 0.5; // px per ms
      if (horizontal && (Math.abs(dx) > 50 || flick)) {
        self.go(self.current + (dx < 0 ? 1 : -1));
      }
    }, { passive: true });

    this.updatePauseButton();
    this.schedule();
  };

  HeroSlider.prototype.show = function (n) {
    var total = this.slides.length;
    var next = ((n % total) + total) % total;

    var focusables = this.focusables;
    this.slides.forEach(function (slide, i) {
      var on = i === next;
      slide.classList.toggle('active', on);
      slide.setAttribute('aria-hidden', String(!on));
      // inert removes the slide's links from tab order and the a11y tree;
      // tabindex covers browsers without inert.
      slide.inert = !on;
      focusables[i].forEach(function (c) {
        if (on) c.removeAttribute('tabindex'); else c.setAttribute('tabindex', '-1');
      });
    });
    this.dots.forEach(function (dot, i) {
      dot.classList.toggle('active', i === next);
      dot.setAttribute('aria-current', i === next ? 'true' : 'false');
    });
    this.current = next;
  };

  HeroSlider.prototype.go = function (n) {
    this.show(n);
    this.schedule(); // a manual change restarts the countdown
  };

  HeroSlider.prototype.canAutoplay = function () {
    return !this.reduced && !this.userPaused && !this.hovering && !this.focused &&
           this.visible && !document.hidden && this.slides.length > 1;
  };

  HeroSlider.prototype.schedule = function () {
    var self = this;
    clearTimeout(this.timer);
    if (!this.canAutoplay()) return;
    this.timer = setTimeout(function () {
      self.show(self.current + 1);
      self.schedule();
    }, INTERVAL);
  };

  HeroSlider.prototype.updatePauseButton = function () {
    if (!this.pauseBtn) return;
    this.pauseBtn.setAttribute('aria-pressed', String(this.userPaused));
    this.pauseBtn.setAttribute('aria-label', this.userPaused ? 'Play slideshow' : 'Pause slideshow');
    var icon = this.pauseBtn.querySelector('i');
    if (icon) icon.className = this.userPaused ? 'fa-solid fa-play' : 'fa-solid fa-pause';
  };

  var sliderEl = document.querySelector('.hero-slider');
  if (sliderEl) new HeroSlider(sliderEl);

})();
