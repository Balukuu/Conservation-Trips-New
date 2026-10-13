/* ============================================================
   tours.js — Tour category filter
   Conservation Trips & Adventures

   Used on the home page (featured tours) and /tours.

   On /tours the tabs are real links to /tours/category/<slug>, so a category
   has its own shareable URL and works without JavaScript (the server renders
   every card and just hides the other categories). With JavaScript a click
   filters in place and updates the address bar instead of reloading.

   Cards are shown and hidden with the `hidden` attribute and re-enter with a
   CSS animation — no inline transform/transition, which would pin cards in
   place and defeat their hover state.
   ============================================================ */

(function () {
  'use strict';

  var grid = document.querySelector('.tours-grid');
  if (!grid) return;

  var tabs = Array.prototype.slice.call(document.querySelectorAll('.filter-tab[data-category]'));
  var cards = Array.prototype.slice.call(grid.querySelectorAll('.tour-card'));
  var noResults = document.querySelector('.no-results-msg');
  var countEl = document.querySelector('[data-tours-count]'); // /tours only: "11 itineraries"
  var headingEl = document.querySelector('[data-page-heading]'); // /tours only: the h1
  if (!tabs.length) return;

  function setActive(category) {
    tabs.forEach(function (tab) {
      var on = tab.getAttribute('data-category') === category;
      tab.classList.toggle('active', on);
      tab.setAttribute('aria-selected', String(on));
      // where am I: the heading and tab title follow the filter, as they do on a category URL
      if (on) {
        if (headingEl && tab.getAttribute('data-heading')) headingEl.textContent = tab.getAttribute('data-heading');
        if (tab.getAttribute('data-title')) document.title = tab.getAttribute('data-title');
      }
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
    if (countEl) countEl.textContent = shown === 1 ? '1 itinerary' : shown + ' itineraries';
  }

  // keep the address bar on the category's clean URL (link tabs only)
  function syncUrl(tab) {
    var href = tab.getAttribute('href');
    if (href && window.history && history.replaceState) history.replaceState(null, '', href);
  }

  // clean up the entrance class so it can replay next time
  grid.addEventListener('animationend', function (e) {
    if (e.target.classList && e.target.classList.contains('is-entering')) {
      e.target.classList.remove('is-entering');
      e.target.style.animationDelay = '';
    }
  });

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function (e) {
      // let "open in new tab" and friends do what the browser does
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0) return;
      var category = tab.getAttribute('data-category') || 'All';
      e.preventDefault();
      setActive(category);
      filter(category, !(window.Motion && window.Motion.prefersReducedMotion()));
      syncUrl(tab);
    });
  });

  // Old ?category= links. Where a server is present it redirects to the clean
  // URL; static hosts can't, so honour the parameter here and tidy the address.
  var param = new URLSearchParams(window.location.search).get('category');
  var legacyTab = param && tabs.filter(function (t) { return t.getAttribute('data-category') === param; })[0];
  if (legacyTab) {
    setActive(param);
    filter(param, false);
    syncUrl(legacyTab);
  } else {
    setActive(tabs.filter(function (t) { return t.classList.contains('active'); }).map(function (t) {
      return t.getAttribute('data-category');
    })[0] || 'All');
  }

})();
