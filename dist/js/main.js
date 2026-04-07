/* ============================================================
   main.js — Global JavaScript
   Conservation Trips & Adventures
   ============================================================ */

(function() {
  'use strict';

  /* ─── Navbar Scroll Behaviour ─── */
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    const onScroll = () => {
      if (window.scrollY > 100) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ─── Mobile Hamburger Menu ─── */
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  const menuBackdrop = document.querySelector('.menu-backdrop');

  function openMenu() {
    if (!navbar || !mobileMenu) return;
    navbar.classList.add('menu-open');
    mobileMenu.classList.add('open');
    if (menuBackdrop) menuBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeMenu() {
    if (!navbar || !mobileMenu) return;
    navbar.classList.remove('menu-open');
    mobileMenu.classList.remove('open');
    if (menuBackdrop) menuBackdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (hamburger) hamburger.addEventListener('click', () => navbar.classList.contains('menu-open') ? closeMenu() : openMenu());
  if (menuBackdrop) menuBackdrop.addEventListener('click', closeMenu);
  document.querySelectorAll('.mobile-link').forEach(link => link.addEventListener('click', closeMenu));

  /* ─── Intersection Observer — Scroll Reveal ─── */
  const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
  if (revealEls.length > 0) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
    revealEls.forEach(el => revealObserver.observe(el));
  }

  /* ─── Reveal Grid Stagger ─── */
  const revealGrids = document.querySelectorAll('.reveal-grid');
  if (revealGrids.length > 0) {
    const gridObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const children = entry.target.querySelectorAll(':scope > *');
          children.forEach((child, i) => {
            child.style.opacity = '0';
            child.style.transform = 'translateY(40px)';
            child.style.transition = `opacity 0.65s ease ${i * 0.1}s, transform 0.65s ease ${i * 0.1}s`;
            setTimeout(() => {
              child.style.opacity = '1';
              child.style.transform = 'translateY(0)';
            }, 50);
          });
          gridObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    revealGrids.forEach(el => gridObserver.observe(el));
  }

  /* ─── Counter Animation ─── */
  function animateCounter(el) {
    const target = parseInt(el.getAttribute('data-count'), 10);
    const suffix = el.getAttribute('data-suffix') || '';
    const duration = 2000;
    const start = performance.now();

    const easeOut = t => 1 - Math.pow(1 - t, 3);

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const val = Math.round(easeOut(progress) * target);
      el.textContent = val.toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  const counters = document.querySelectorAll('[data-count]');
  if (counters.length > 0) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(el => counterObserver.observe(el));
  }

  /* ─── Smooth Scroll for Anchor Links ─── */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 80;
        const top = target.getBoundingClientRect().top + window.scrollY - navH - 16;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  /* ─── Back to Top Button ─── */
  const backToTop = document.querySelector('.back-to-top');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 500) {
        backToTop.classList.add('visible');
      } else {
        backToTop.classList.remove('visible');
      }
    }, { passive: true });

    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ─── Cookie Banner ─── */
  const cookieBanner = document.querySelector('.cookie-banner');
  const cookieAccept = document.querySelector('.cookie-accept');
  if (cookieBanner) {
    if (localStorage.getItem('cookiesAccepted') === 'true') {
      cookieBanner.classList.add('hidden');
    }
    if (cookieAccept) {
      cookieAccept.addEventListener('click', () => {
        localStorage.setItem('cookiesAccepted', 'true');
        cookieBanner.style.transform = 'translateY(110%)';
        setTimeout(() => cookieBanner.remove(), 500);
      });
    }
  }

  /* ─── Availability Toast ─── */
  const toast = document.querySelector('.availability-toast');
  const toastClose = document.querySelector('.toast-close');
  if (toast) {
    const toastShown = sessionStorage.getItem('toastShown');
    if (!toastShown) {
      setTimeout(() => {
        toast.classList.add('show');
        sessionStorage.setItem('toastShown', 'true');
        setTimeout(() => {
          if (toast) toast.classList.remove('show');
        }, 8000);
      }, 20000);
    } else {
      toast.remove();
    }
    if (toastClose) {
      toastClose.addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
      });
    }
  }

  /* ─── Active Nav Link ─── */
  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-links a, .mobile-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (href !== '/' && currentPath.startsWith(href))) {
      link.classList.add('active');
    }
  });

  /* ─── Accordion (Tour Itinerary) ─── */
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const body = header.nextElementSibling;
      const isOpen = header.classList.contains('active');

      // Close all
      document.querySelectorAll('.accordion-header').forEach(h => {
        h.classList.remove('active');
        h.nextElementSibling.classList.remove('open');
      });

      // Open clicked if was closed
      if (!isOpen) {
        header.classList.add('active');
        body.classList.add('open');
      }
    });
  });

  // Open first accordion
  const firstAccordion = document.querySelector('.accordion-header');
  if (firstAccordion) {
    firstAccordion.classList.add('active');
    const body = firstAccordion.nextElementSibling;
    if (body) body.classList.add('open');
  }

  /* ─── Testimonial Slider ─── */
  const testSlider = document.querySelector('.testimonial-slider');
  if (testSlider) {
    const track = testSlider.querySelector('.testimonial-track');
    const cards = testSlider.querySelectorAll('.testimonial-card');
    const dots = testSlider.querySelectorAll('.test-dot');
    const prevBtn = testSlider.querySelector('.test-prev');
    const nextBtn = testSlider.querySelector('.test-next');
    let current = 0;
    let autoInterval;

    function goTo(n) {
      current = (n + cards.length) % cards.length;
      track.style.transform = `translateX(-${current * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle('active', i === current));
    }

    function startAuto() {
      autoInterval = setInterval(() => goTo(current + 1), 7000);
    }
    function stopAuto() { clearInterval(autoInterval); }

    if (prevBtn) prevBtn.addEventListener('click', () => { stopAuto(); goTo(current - 1); startAuto(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { stopAuto(); goTo(current + 1); startAuto(); });
    dots.forEach((dot, i) => dot.addEventListener('click', () => { stopAuto(); goTo(i); startAuto(); }));

    // Touch support
    let touchStartX = 0;
    testSlider.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    testSlider.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) { stopAuto(); goTo(current + (dx < 0 ? 1 : -1)); startAuto(); }
    });

    goTo(0);
    startAuto();
  }

  /* ─── Filter Tabs ─── */
  document.querySelectorAll('.filter-tabs, .filter-bar').forEach(container => {
    const tabs = container.querySelectorAll('.filter-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const cat = tab.getAttribute('data-category');
        const cards = document.querySelectorAll('[data-category]');
        if (!cards.length) return;

        cards.forEach(card => {
          if (cat === 'All' || card.getAttribute('data-category') === cat) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  });

  /* ─── Blog Category Tabs (link-based) ─── */
  // handled server-side via query params

})();
