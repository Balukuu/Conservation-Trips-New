/* ============================================================
   slider.js — Hero Slider
   Conservation Trips & Adventures
   ============================================================ */

(function() {
  'use strict';

  class HeroSlider {
    constructor(el) {
      this.el = el;
      this.slides = el.querySelectorAll('.hero-slide');
      this.dots = el.querySelectorAll('.slider-dot');
      this.prevBtn = el.querySelector('.slider-prev');
      this.nextBtn = el.querySelector('.slider-next');
      this.current = 0;
      this.total = this.slides.length;
      this.autoInterval = null;
      this.isPaused = false;

      if (this.total === 0) return;

      this.init();
    }

    init() {
      this.goTo(0);
      this.startAuto();

      if (this.prevBtn) this.prevBtn.addEventListener('click', () => { this.stop(); this.prev(); this.startAuto(); });
      if (this.nextBtn) this.nextBtn.addEventListener('click', () => { this.stop(); this.next(); this.startAuto(); });

      this.dots.forEach((dot, i) => {
        dot.addEventListener('click', () => { this.stop(); this.goTo(i); this.startAuto(); });
      });

      // Pause on hover
      this.el.addEventListener('mouseenter', () => this.pause());
      this.el.addEventListener('mouseleave', () => this.resume());

      // Touch swipe
      let startX = 0;
      this.el.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
      this.el.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 50) {
          this.stop();
          dx < 0 ? this.next() : this.prev();
          this.startAuto();
        }
      });
    }

    goTo(n) {
      // Deactivate current
      const prevSlide = this.slides[this.current];
      prevSlide.classList.remove('active');
      this.resetWords(prevSlide);

      this.current = ((n % this.total) + this.total) % this.total;

      // Activate new
      const slide = this.slides[this.current];
      slide.classList.add('active');
      this.animateWords(slide);
      this.updateDots();
    }

    animateWords(slide) {
      const title = slide.querySelector('.slide-title');
      if (!title) return;

      // If not yet split into words, split now
      if (!title.querySelector('.word-span')) {
        const text = title.textContent.trim();
        title.innerHTML = '';
        text.split(/\s+/).forEach(word => {
          const span = document.createElement('span');
          span.className = 'word-span';
          span.textContent = word;
          title.appendChild(span);
          // Add a literal space after each word span to prevent smashed text
          title.appendChild(document.createTextNode(' '));
        });
      }

      // Stagger reveal
      const words = slide.querySelectorAll('.word-span');
      words.forEach((w, i) => {
        setTimeout(() => w.classList.add('word-visible'), 200 + i * 80);
      });
    }

    resetWords(slide) {
      slide.querySelectorAll('.word-span').forEach(w => w.classList.remove('word-visible'));
    }

    updateDots() {
      this.dots.forEach((dot, i) => dot.classList.toggle('active', i === this.current));
    }

    next() { this.goTo(this.current + 1); }
    prev() { this.goTo(this.current - 1); }

    startAuto() {
      this.stop();
      this.autoInterval = setInterval(() => {
        if (!this.isPaused) this.next();
      }, 6000);
    }

    stop() { clearInterval(this.autoInterval); }
    pause() { this.isPaused = true; }
    resume() { this.isPaused = false; }
  }

  // Init
  const sliderEl = document.querySelector('.hero-slider');
  if (sliderEl) {
    new HeroSlider(sliderEl);
  }

})();
