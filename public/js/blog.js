/* ============================================================
   blog.js — Blog Category Filter
   Conservation Trips & Adventures
   Filters in the browser so it also works on the static build,
   where "?category=" can't be handled by a server.
   ============================================================ */

(function () {
  'use strict';

  var grid = document.querySelector('.blog-grid');
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.filter-tabs .filter-tab[data-category]'));
  if (!grid || !tabs.length) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.blog-card[data-category]'));

  function filterPosts(category) {
    tabs.forEach(function (tab) {
      var on = tab.getAttribute('data-category') === category;
      tab.classList.toggle('active', on);
      tab.setAttribute('aria-selected', String(on));
    });
    cards.forEach(function (card) {
      card.hidden = !(category === 'All' || card.getAttribute('data-category') === category);
    });
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function (e) {
      e.preventDefault();
      filterPosts(tab.getAttribute('data-category'));
      history.replaceState(null, '', tab.getAttribute('href'));
    });
  });

  // Initialize from URL query param
  var catParam = new URLSearchParams(window.location.search).get('category');
  if (catParam && tabs.some(function (tab) { return tab.getAttribute('data-category') === catParam; })) {
    filterPosts(catParam);
  }

})();
