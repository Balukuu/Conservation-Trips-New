/* ============================================================
   main.js — Global JavaScript
   Conservation Trips & Adventures

   Needs motion.js (loaded first). Category filtering lives in tours.js and
   blog.js — it used to be duplicated here and hid the filter tabs
   themselves, because the tabs carry data-category too.
   ============================================================ */

(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = function () { return window.Motion ? window.Motion.prefersReducedMotion() : false; };

  /* iOS Safari only applies :active (press feedback) when a touch listener
     exists somewhere up the tree. */
  document.addEventListener('touchstart', function () {}, { passive: true });

  /* ─── Navbar: material once content scrolls beneath it ─── */
  var navbar = document.querySelector('.navbar');
  if (navbar) {
    var isScrolled = null;
    var onScroll = function () {
      var next = window.scrollY > 40;
      if (next !== isScrolled) {
        isScrolled = next;
        navbar.classList.toggle('scrolled', next);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ─── Mobile menu ───
     Open/close is a CSS transform transition (so a tap mid-flight reverses
     from where it is). Dragging it right dismisses it: 1:1 tracking, then a
     spring that inherits the release velocity. */
  var hamburger = document.querySelector('.hamburger');
  var mobileMenu = document.querySelector('.mobile-menu');
  var menuBackdrop = document.querySelector('.menu-backdrop');
  var menuOpen = false;
  var menuSpring = null;
  var menuOffset = 0; // live translateX while dragging / springing

  function stopMenuSpring() {
    if (menuSpring) { menuSpring.stop(); menuSpring = null; }
  }

  function clearMenuInline() {
    mobileMenu.style.transform = '';
    if (menuBackdrop) menuBackdrop.style.opacity = '';
  }

  function setMenu(open, returnFocus) {
    if (!navbar || !mobileMenu) return;
    stopMenuSpring();
    menuOpen = open;
    // Drop inline drag styles with transitions off, so the class change
    // continues from the same visual position instead of jumping.
    clearMenuInline();
    menuOffset = 0;
    navbar.classList.toggle('menu-open', open);
    mobileMenu.classList.toggle('open', open);
    if (menuBackdrop) menuBackdrop.classList.toggle('open', open);
    root.classList.toggle('no-scroll', open);
    if (hamburger) {
      hamburger.setAttribute('aria-expanded', String(open));
      hamburger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
    if (open) {
      var first = mobileMenu.querySelector('.mobile-link');
      if (first) first.focus({ preventScroll: true });
    } else if (returnFocus && hamburger) {
      hamburger.focus({ preventScroll: true });
    }
  }

  if (hamburger && mobileMenu) {
    hamburger.setAttribute('aria-label', 'Open menu');
    hamburger.addEventListener('click', function () { setMenu(!menuOpen, true); });
    if (menuBackdrop) menuBackdrop.addEventListener('click', function () { setMenu(false, true); });
    mobileMenu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false, false); });
    });

    document.addEventListener('keydown', function (e) {
      if (!menuOpen) return;
      if (e.key === 'Escape') { setMenu(false, true); return; }
      if (e.key === 'Tab') {
        // keep focus inside the open menu (+ the close button)
        var items = [hamburger].concat(Array.prototype.slice.call(mobileMenu.querySelectorAll('a[href], button')));
        var i = items.indexOf(document.activeElement);
        if (e.shiftKey && (i <= 0)) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
      }
    });

    window.addEventListener('resize', function () {
      if (menuOpen && window.innerWidth > 768) setMenu(false, false);
    });

    /* Drag to dismiss */
    var pointerId = null;
    var startX = 0, startY = 0, baseOffset = 0;
    var dragging = false;
    var swallowClick = false;
    var samples = [];

    var setOffset = function (x, width) {
      menuOffset = x;
      mobileMenu.style.transform = 'translateX(' + x + 'px)';
      if (menuBackdrop) menuBackdrop.style.opacity = String(Math.max(0, Math.min(1, 1 - x / width)));
    };

    var velocityX = function () {
      // px/s over the last ~100ms of movement
      var last = samples[samples.length - 1];
      var first = last;
      for (var i = samples.length - 1; i >= 0; i--) {
        if (last.t - samples[i].t > 100) break;
        first = samples[i];
      }
      var dt = last.t - first.t;
      return dt > 0 ? ((last.x - first.x) / dt) * 1000 : 0;
    };

    var endDrag = function (cancelled) {
      if (!dragging) { pointerId = null; return; }
      var width = mobileMenu.offsetWidth;
      var v = cancelled ? 0 : velocityX();
      // Decide with where the flick is GOING, not just where it was released
      var projected = menuOffset + window.Motion.project(v, 0.99);
      var shouldClose = projected > width * 0.5 || v > 500;
      var target = shouldClose ? width : 0;
      var bouncy = Math.abs(v) > 600; // only a real flick earns overshoot

      dragging = false;
      pointerId = null;
      stopMenuSpring();
      menuSpring = window.Motion.spring({
        from: menuOffset,
        to: target,
        velocity: v,
        response: 0.4,
        damping: bouncy ? 0.8 : 1,
        onUpdate: function (x) { setOffset(x, width); },
        onDone: function () {
          menuSpring = null;
          mobileMenu.classList.remove('dragging');
          if (menuBackdrop) menuBackdrop.classList.remove('dragging');
          if (shouldClose) {
            // inline transform equals the closed position, so this is seamless
            setMenu(false, true);
          } else {
            clearMenuInline();
            menuOffset = 0;
          }
        }
      });
    };

    mobileMenu.addEventListener('pointerdown', function (e) {
      if (!menuOpen || pointerId !== null) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      baseOffset = menuOffset; // grab it wherever it currently is
      samples = [{ x: e.clientX, t: e.timeStamp }];
      if (menuSpring) {
        // interrupted mid-spring: take over from the live position
        stopMenuSpring();
        dragging = true;
        mobileMenu.setPointerCapture(pointerId);
      }
    });

    mobileMenu.addEventListener('pointermove', function (e) {
      if (e.pointerId !== pointerId) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (!dragging) {
        // ~10px of intent, then lock the direction: vertical belongs to the list
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        if (Math.abs(dy) > Math.abs(dx)) { pointerId = null; return; }
        dragging = true;
        swallowClick = true;
        mobileMenu.setPointerCapture(pointerId);
        mobileMenu.classList.add('dragging');
        if (menuBackdrop) menuBackdrop.classList.add('dragging');
      }
      var width = mobileMenu.offsetWidth;
      var raw = baseOffset + dx;
      // glued to the finger to the right; resists when pulled past fully open
      setOffset(raw >= 0 ? raw : window.Motion.rubberband(raw, width), width);
      samples.push({ x: e.clientX, t: e.timeStamp });
      if (samples.length > 8) samples.shift();
    });

    mobileMenu.addEventListener('pointerup', function (e) { if (e.pointerId === pointerId) endDrag(false); });
    mobileMenu.addEventListener('pointercancel', function (e) { if (e.pointerId === pointerId) endDrag(true); });
    // a drag that started on a link must not also follow it
    mobileMenu.addEventListener('click', function (e) {
      if (swallowClick) {
        e.preventDefault();
        e.stopPropagation();
        swallowClick = false;
      }
    }, true);
  }

  /* ─── Scroll reveal ───
     CSS hides content only under <html class="js">. Singles toggle .visible;
     grid children are revealed one by one as they scroll in (--i staggers
     those that arrive together). .reveal-done hands the element back to its
     own hover/transform rules once the reveal has played. */
  var singles = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
  var gridKids = [];
  document.querySelectorAll('.reveal-grid').forEach(function (grid) {
    Array.prototype.forEach.call(grid.children, function (kid) { gridKids.push(kid); });
  });

  if ('IntersectionObserver' in window) {
    var revealIO = new IntersectionObserver(function (entries) {
      var batch = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        revealIO.unobserve(el);
        var inGrid = el.parentElement && el.parentElement.classList.contains('reveal-grid');
        var i = batch++;
        if (inGrid) {
          el.style.setProperty('--i', i);
          el.classList.add('in-view');
        } else {
          el.classList.add('visible');
        }
        setTimeout(function () { el.classList.add('reveal-done'); }, 600 + i * 70 + 150);
      });
    }, { threshold: 0.01, rootMargin: '0px 0px -8% 0px' });
    singles.forEach(function (el) { revealIO.observe(el); });
    gridKids.forEach(function (el) { revealIO.observe(el); });
  } else {
    singles.forEach(function (el) { el.classList.add('visible', 'reveal-done'); });
    gridKids.forEach(function (el) { el.classList.add('in-view', 'reveal-done'); });
  }

  /* ─── Counters ─── */
  var counters = document.querySelectorAll('[data-count]');
  function counterText(n, el) { return n.toLocaleString() + (el.getAttribute('data-suffix') || ''); }

  function animateCounter(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var duration = 1600;
    var start = performance.now();
    var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
    function update(now) {
      var progress = Math.min((now - start) / duration, 1);
      el.textContent = counterText(Math.round(easeOut(progress) * target), el);
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  if (counters.length) {
    if ('IntersectionObserver' in window && !reduceMotion()) {
      // start from zero before first paint so the final value doesn't flash
      counters.forEach(function (el) { el.textContent = counterText(0, el); });
      var counterIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterIO.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });
      counters.forEach(function (el) { counterIO.observe(el); });
    } else {
      counters.forEach(function (el) {
        el.textContent = counterText(parseInt(el.getAttribute('data-count'), 10), el);
      });
    }
  }

  /* Anchor links (#enquire-form …) use native smooth scrolling with
     scroll-padding-top in CSS — no JS needed, and the hash updates. */

  /* ─── Back to Top ─── */
  var backToTop = document.querySelector('.back-to-top');
  if (backToTop) {
    var btnVisible = null;
    window.addEventListener('scroll', function () {
      var next = window.scrollY > 500;
      if (next !== btnVisible) {
        btnVisible = next;
        backToTop.classList.toggle('visible', next);
      }
    }, { passive: true });
    backToTop.addEventListener('click', function () { window.scrollTo(0, 0); });
  }

  /* ─── Cookie Banner (returning visitors never see it: see the layout <head>) ─── */
  var cookieBanner = document.querySelector('.cookie-banner');
  if (cookieBanner) {
    var accept = cookieBanner.querySelector('.cookie-accept');
    if (accept) {
      accept.addEventListener('click', function () {
        try { localStorage.setItem('cookiesAccepted', 'true'); } catch (e) { /* private mode */ }
        cookieBanner.classList.add('hidden');
        setTimeout(function () { cookieBanner.remove(); }, 700);
      });
    }
  }

  /* ─── Availability Toast ─── */
  var toast = document.querySelector('.availability-toast');
  if (toast) {
    var seen = false;
    try { seen = sessionStorage.getItem('toastShown') === 'true'; } catch (e) { /* ignore */ }
    if (seen) {
      toast.remove();
    } else {
      setTimeout(function () {
        toast.classList.add('show');
        try { sessionStorage.setItem('toastShown', 'true'); } catch (e) { /* ignore */ }
        setTimeout(function () { toast.classList.remove('show'); }, 8000);
      }, 20000);
    }
    var toastClose = toast.querySelector('.toast-close');
    if (toastClose) {
      toastClose.addEventListener('click', function () {
        toast.classList.remove('show');
        setTimeout(function () { toast.remove(); }, 600);
      });
    }
  }

  /* ─── Active Nav Link ─── */
  // The site may be served under a sub-path (GitHub Pages project sites), so the
  // home link is whatever the logo points at rather than a literal "/".
  var trimSlash = function (p) { return p.replace(/\/+$/, '') || '/'; };
  var currentPath = trimSlash(window.location.pathname);
  var logoLink = document.querySelector('.nav-logo');
  var homePath = trimSlash(logoLink ? logoLink.getAttribute('href') : '/');
  document.querySelectorAll('.nav-links a, .mobile-link').forEach(function (link) {
    var href = trimSlash(link.getAttribute('href'));
    if (href === currentPath || (href !== homePath && currentPath.indexOf(href + '/') === 0)) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  /* ─── Accordion (Tour Itinerary) — scoped per accordion, keyboard-native
         because the headers are <button>s ─── */
  document.querySelectorAll('.accordion').forEach(function (accordion) {
    var headers = accordion.querySelectorAll('.accordion-header');

    function setOpen(header, open) {
      var body = header.nextElementSibling;
      header.classList.toggle('active', open);
      header.setAttribute('aria-expanded', String(open));
      if (body) body.classList.toggle('open', open);
    }

    headers.forEach(function (header) {
      header.addEventListener('click', function () {
        var wasOpen = header.classList.contains('active');
        headers.forEach(function (h) { setOpen(h, false); });
        if (!wasOpen) setOpen(header, true);
      });
    });

    if (headers.length) setOpen(headers[0], true);
  });

  /* ─── Testimonial slider ───
     Native scroll-snap does the physical part (1:1 finger tracking,
     momentum, rubber-banding). This only wires arrows, dots and a
     pausable autoplay on top. */
  var testSlider = document.querySelector('.testimonial-slider');
  if (testSlider) {
    var track = testSlider.querySelector('.testimonial-track');
    var cards = testSlider.querySelectorAll('.testimonial-card');
    var dots = testSlider.querySelectorAll('.test-dot');
    var prevBtn = testSlider.querySelector('.test-prev');
    var nextBtn = testSlider.querySelector('.test-next');
    var pauseBtn = testSlider.querySelector('.test-pause');
    var current = 0;
    var timer = null;
    var userPaused = false;
    var hovering = false;
    var focused = false;
    var inView = false;
    var AUTO_MS = 7000;

    var syncUI = function (i) {
      current = i;
      dots.forEach(function (d, n) {
        d.classList.toggle('active', n === i);
        d.setAttribute('aria-current', n === i ? 'true' : 'false');
      });
    };

    // While our own smooth scroll is travelling, intermediate scroll positions
    // must not drag the dots backwards.
    var settleUntil = 0;
    var goTo = function (n) {
      if (!cards.length) return;
      var i = (n + cards.length) % cards.length;
      // wrapping the long way round would scroll past every card: jump instead
      var instant = Math.abs(i - current) > 1 || reduceMotion();
      settleUntil = instant ? 0 : performance.now() + 700;
      track.scrollTo({ left: i * track.clientWidth, behavior: instant ? 'auto' : 'smooth' });
      syncUI(i);
    };

    var autoplayAllowed = function () {
      return !reduceMotion() && !userPaused && !hovering && !focused && inView && !document.hidden && cards.length > 1;
    };
    var schedule = function () {
      clearTimeout(timer);
      if (!autoplayAllowed()) return;
      timer = setTimeout(function () { goTo(current + 1); schedule(); }, AUTO_MS);
    };

    // keep dots honest when the visitor swipes/flicks
    var scrollRaf = 0;
    track.addEventListener('scroll', function () {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(function () {
        scrollRaf = 0;
        if (performance.now() < settleUntil) return;
        var i = Math.round(track.scrollLeft / track.clientWidth);
        if (i !== current && i >= 0 && i < cards.length) { syncUI(i); schedule(); }
      });
    }, { passive: true });

    if (prevBtn) prevBtn.addEventListener('click', function () { goTo(current - 1); schedule(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goTo(current + 1); schedule(); });
    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () { goTo(i); schedule(); });
    });
    if (pauseBtn) {
      pauseBtn.addEventListener('click', function () {
        userPaused = !userPaused;
        pauseBtn.setAttribute('aria-pressed', String(userPaused));
        pauseBtn.setAttribute('aria-label', userPaused ? 'Play testimonials' : 'Pause testimonials');
        pauseBtn.querySelector('i').className = userPaused ? 'fa-solid fa-play' : 'fa-solid fa-pause';
        schedule();
      });
    }

    testSlider.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { hovering = true; schedule(); } });
    testSlider.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { hovering = false; schedule(); } });
    testSlider.addEventListener('focusin', function () { focused = true; schedule(); });
    testSlider.addEventListener('focusout', function () { focused = false; schedule(); });
    document.addEventListener('visibilitychange', schedule);
    window.addEventListener('resize', function () {
      track.scrollTo({ left: current * track.clientWidth, behavior: 'auto' });
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        schedule();
      }, { threshold: 0.25 }).observe(testSlider);
    }

    syncUI(0);
  }

})();
