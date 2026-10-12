/* ============================================================
   blog.js — Blog Category Filter
   Conservation Trips & Adventures
   Filters in the browser so it also works on the static build,
   where "?category=" can't be handled by a server.
   ============================================================ */

(function() {
  'use strict';

  const grid = document.querySelector('.blog-grid');
  const tabs = document.querySelectorAll('.filter-tabs .filter-tab[data-category]');
  if (!grid || !tabs.length) return;

  const cards = grid.querySelectorAll('.blog-card[data-category]');

  function filterPosts(category) {
    tabs.forEach(tab => tab.classList.toggle('active', tab.getAttribute('data-category') === category));
    cards.forEach(card => {
      const matches = category === 'All' || card.getAttribute('data-category') === category;
      card.style.display = matches ? '' : 'none';
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', e => {
      e.preventDefault();
      filterPosts(tab.getAttribute('data-category'));
      history.replaceState(null, '', tab.getAttribute('href'));
    });
  });

  // Initialize from URL query param
  const catParam = new URLSearchParams(window.location.search).get('category');
  if (catParam && Array.from(tabs).some(tab => tab.getAttribute('data-category') === catParam)) {
    filterPosts(catParam);
  }

})();
