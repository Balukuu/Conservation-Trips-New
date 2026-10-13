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
    this.dragging = false;
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
    // Fallback only: index.ejs already wraps the words (so nothing is created
    // after first paint). Wrap any title that arrives without them.
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

    // The first slide arrives .active from the server and its entrance runs
    // from CSS (@starting-style), so this only syncs aria/inert/dots. Do not
    // toggle .active off and on again to "replay" it: by the time this runs
    // the slide has usually been styled already, and the replay would only
    // cancel the entrance that is in flight.
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

    this.initDrag();

    this.updatePauseButton();
    this.schedule();
  };

  /* Swipe: the slide follows the finger 1:1 with the next one revealed
     underneath, then settles with the release velocity (the menu's model:
     ~10px of intent, projection, only a real flick bounces). Touch and pen
     only; a mouse has the arrows and dots. Vertical movement is left to the
     page (touch-action: pan-y), and a drag never also clicks a link. */
  HeroSlider.prototype.initDrag = function () {
    var self = this;
    var M = window.Motion;
    var n = this.slides.length;
    if (!M || n < 2) return;

    var drag = null;
    var spring = null;
    var offset = 0;
    var neighbour = -1;
    var swallowClick = false;
    var width = function () { return self.el.offsetWidth || window.innerWidth; };

    function release() { // hand the neighbour back to its stylesheet
      if (neighbour < 0) return;
      var s = self.slides[neighbour];
      s.style.opacity = ''; s.style.zIndex = ''; s.style.transition = '';
      neighbour = -1;
    }

    function paint(dx) {
      offset = dx;
      self.slides[self.current].style.transform = 'translate3d(' + dx + 'px,0,0)';
      var want = dx === 0 ? -1 : (dx < 0 ? (self.current + 1) % n : (self.current - 1 + n) % n);
      if (want !== neighbour) {
        release();
        if (want >= 0) {
          var s = self.slides[want];
          s.style.transition = 'none';
          s.style.opacity = '1';
          s.style.zIndex = '1';
          neighbour = want;
        }
      }
    }

    function reset() {
      release();
      self.slides[self.current].style.transform = '';
      offset = 0;
    }

    function stop() { if (spring) { spring.stop(); spring = null; } }

    // throws if the pointer has already gone (a quick tap, a cancelled touch)
    function capture(id) {
      try { self.el.setPointerCapture(id); } catch (err) { /* nothing to hold on to */ }
    }

    function springTo(to, v, done) {
      stop();
      spring = M.spring({
        from: offset, to: to, velocity: v, response: 0.4,
        damping: Math.abs(v) > 600 ? 0.8 : 1,
        onUpdate: paint,
        onDone: function () { spring = null; done(); }
      });
    }

    function velocity(samples, now) {
      // measured at the moment of release: a finger that rested before it lifted has no momentum
      var last = samples[samples.length - 1];
      if (now - last.t > 100) return 0;
      var first = last;
      for (var i = samples.length - 1; i >= 0; i--) {
        if (last.t - samples[i].t > 100) break;
        first = samples[i];
      }
      var dt = last.t - first.t;
      return dt > 0 ? ((last.x - first.x) / dt) * 1000 : 0;
    }

    function settle(v) {
      var w = width();
      var projected = offset + M.project(v, 0.99);
      var sign = projected < 0 ? -1 : 1;
      var go = (Math.abs(projected) > w * 0.3 || Math.abs(v) > 500) &&
               (Math.abs(offset) < 2 || (offset < 0) === (sign < 0));
      var target = self.current + (sign < 0 ? 1 : -1);
      var end = function () {
        self.dragging = false;
        reset();
        if (go) self.go(target); else self.schedule();
      };
      if (self.reduced) { end(); return; }
      springTo(go ? sign * w : 0, v, end);
    }

    this.el.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' || !e.isPrimary) return;
      if (e.target.closest && e.target.closest('.slider-arrow, .slider-dots, .slider-pause, .slider-controls')) return;
      var interrupted = !!spring;
      stop(); // grabbed mid-flight: carry on from where it is
      drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, base: offset, on: interrupted, samples: [{ x: e.clientX, t: e.timeStamp }] };
      swallowClick = false;
      if (interrupted) { self.dragging = true; capture(e.pointerId); swallowClick = true; }
    });

    this.el.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x0;
      var dy = e.clientY - drag.y0;
      if (!drag.on) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; } // vertical belongs to the page
        drag.on = true;
        swallowClick = true;
        self.dragging = true;
        clearTimeout(self.timer);
        capture(drag.id);
      }
      paint(drag.base + dx);
      drag.samples.push({ x: e.clientX, t: e.timeStamp });
      if (drag.samples.length > 8) drag.samples.shift();
    });

    function end(e, cancelled) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag;
      drag = null;
      if (!d.on) return;
      settle(cancelled ? 0 : velocity(d.samples, e.timeStamp));
    }
    this.el.addEventListener('pointerup', function (e) { end(e, false); });
    this.el.addEventListener('pointercancel', function (e) { end(e, true); });

    // a drag that started on a slide's button must not also follow it
    this.el.addEventListener('click', function (e) {
      if (swallowClick) { e.preventDefault(); e.stopPropagation(); swallowClick = false; }
    }, true);
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
    return !this.reduced && !this.userPaused && !this.hovering && !this.focused && !this.dragging &&
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
