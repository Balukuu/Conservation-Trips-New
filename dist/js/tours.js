/* ============================================================
   tours.js — Tour Filter/Search Logic
   Conservation Trips & Adventures
   ============================================================ */

(function() {
  'use strict';

  const tourGrid = document.querySelector('.tours-grid');
  if (!tourGrid) return;

  const filterTabs = document.querySelectorAll('.filter-tab');
  const tourCards = tourGrid.querySelectorAll('.tour-card');
  const noResults = document.querySelector('.no-results-msg');

  function filterTours(category) {
    let visible = 0;

    tourCards.forEach(card => {
      const cardCat = card.getAttribute('data-category');
      const matches = category === 'All' || cardCat === category;

      if (matches) {
        card.style.display = '';
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        }, 50);
        visible++;
      } else {
        card.style.display = 'none';
      }
    });

    if (noResults) {
      noResults.style.display = visible === 0 ? 'block' : 'none';
    }
  }

  // Set transition on all cards
  tourCards.forEach(card => {
    card.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
  });

  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      filterTours(tab.getAttribute('data-category') || 'All');
    });
  });

  // Initialize from URL query param
  const params = new URLSearchParams(window.location.search);
  const catParam = params.get('category');
  if (catParam) {
    let found = false;
    filterTabs.forEach(tab => {
      if (tab.getAttribute('data-category') === catParam) {
        found = true;
      }
    });

    if (found) {
      filterTabs.forEach(t => t.classList.remove('active'));
      filterTabs.forEach(tab => {
        if (tab.getAttribute('data-category') === catParam) {
          tab.classList.add('active');
          filterTours(catParam);
        }
      });
    }
  }

})();
