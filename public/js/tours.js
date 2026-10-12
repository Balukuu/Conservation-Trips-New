/* ============================================================
   tours.js — Tour category filter
   Conservation Trips & Adventures

   Used on the home page (featured tours) and /tours. Cards are shown and
   hidden with the `hidden` attribute and re-enter with a CSS animation —
   no inline transform/transition, which would pin cards in place and
   defeat their hover state.
   ============================================================ */

(function () {
  'use strict';

  var grid = document.querySelector('.tours-grid');
  if (!grid) return;

  var tabs = Array.prototype.slice.call(document.querySelectorAll('.filter-tab[data-category]'));
  var cards = Array.prototype.slice.call(grid.querySelectorAll('.tour-card'));
  var noResults = document.querySelector('.no-results-msg');
  if (!tabs.length) return;

  function setActive(category) {
    tabs.forEach(function (tab) {
      var on = tab.getAttribute('data-category') === category;
      tab.classList.toggle('active', on);
      tab.setAttribute('aria-selected', String(on));
    });
  }

  function filter(category, animate) {
    var shown = 0;
    cards.forEach(function (card) {
      var match = category === 'All' || card.getAttribute('data-category') === category;
      card.hidden = !match;
      card.classList.remove('is-entering');
      card.style.animationDelay = '';
      if (match) {
        if (animate) {
          // restart the entrance animation, lightly staggered
          void card.offsetWidth;
          card.style.animationDelay = (shown * 40) + 'ms';
          card.classList.add('is-entering');
        }
        shown++;
      }
    });
    if (noResults) noResults.style.display = shown === 0 ? 'block' : 'none';
  }

  // clean up the entrance class so it can replay next time
  grid.addEventListener('animationend', function (e) {
    if (e.target.classList && e.target.classList.contains('is-entering')) {
      e.target.classList.remove('is-entering');
      e.target.style.animationDelay = '';
    }
  });

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var category = tab.getAttribute('data-category') || 'All';
      setActive(category);
      filter(category, !(window.Motion && window.Motion.prefersReducedMotion()));
    });
  });

  // ?category= deep links (e.g. from the footer)
  var param = new URLSearchParams(window.location.search).get('category');
  if (param && tabs.some(function (t) { return t.getAttribute('data-category') === param; })) {
    setActive(param);
    filter(param, false);
  } else {
    setActive(tabs.filter(function (t) { return t.classList.contains('active'); }).map(function (t) {
      return t.getAttribute('data-category');
    })[0] || 'All');
  }

})();
