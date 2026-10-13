/* ============================================================
   blog.js — Blog Category Filter
   Conservation Trips & Adventures

   The tabs are real links to /blog/category/<slug>; the server renders every
   post and hides the other categories, so a category URL works without
   JavaScript. Here a click filters in place and updates the address bar.
   Filtering in the browser also works on the static build.
   ============================================================ */

(function () {
  'use strict';

  var grid = document.querySelector('.bl-grid');
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.filter-tabs .filter-tab[data-category]'));
  if (!grid || !tabs.length) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.bl-card[data-category]'));
  var countEl = document.querySelector('[data-blog-count]'); // "6 articles"

  function filterPosts(category) {
    tabs.forEach(function (tab) {
      var on = tab.getAttribute('data-category') === category;
      tab.classList.toggle('active', on);
      tab.setAttribute('aria-selected', String(on));
    });
    var shown = 0;
    cards.forEach(function (card) {
      var match = category === 'All' || card.getAttribute('data-category') === category;
      card.hidden = !match;
      if (match) shown++;
    });
    if (countEl) countEl.textContent = shown === 1 ? '1 article' : shown + ' articles';
  }

  function syncUrl(tab) {
    var href = tab.getAttribute('href');
    if (href && window.history && history.replaceState) history.replaceState(null, '', href);
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0) return;
      e.preventDefault();
      filterPosts(tab.getAttribute('data-category'));
      syncUrl(tab);
    });
  });

  // Old ?category= links (a server redirects them; static hosts can't)
  var param = new URLSearchParams(window.location.search).get('category');
  var legacyTab = param && tabs.filter(function (t) { return t.getAttribute('data-category') === param; })[0];
  if (legacyTab) {
    filterPosts(param);
    syncUrl(legacyTab);
  }

})();
