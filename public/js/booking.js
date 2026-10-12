/* ============================================================
   booking.js — Multi-Step Booking Form
   Conservation Trips & Adventures
   ============================================================ */

(function() {
  'use strict';

  const form = document.querySelector('.booking-form');
  if (!form) return;

  const steps = form.querySelectorAll('.form-step');
  const stepCircles = form.querySelectorAll('.step-circle');
  const stepLines = form.querySelectorAll('.step-line');
  const stepLabels = form.querySelectorAll('.step-label');
  const successScreen = form.querySelector('.success-screen');
  let currentStep = 0;

  /* ─── Progress Bar Update ─── */
  function updateProgress() {
    stepCircles.forEach((circle, i) => {
      circle.classList.remove('active', 'done');
      if (i < currentStep) circle.classList.add('done');
      else if (i === currentStep) circle.classList.add('active');
    });

    stepLines.forEach((line, i) => {
      line.classList.toggle('done', i < currentStep);
    });

    stepLabels.forEach((label, i) => {
      label.classList.remove('active', 'done');
      if (i < currentStep) label.classList.add('done');
      else if (i === currentStep) label.classList.add('active');
    });
  }

  /* ─── Show Step ─── */
  function showStep(n) {
    steps.forEach((step, i) => step.classList.toggle('active', i === n));
    currentStep = n;
    updateProgress();
    // Scroll to form top on mobile
    if (window.innerWidth < 768) {
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /* ─── Validate Step Fields ─── */
  function validateStep(stepIndex) {
    const step = steps[stepIndex];
    const required = step.querySelectorAll('[required]');
    let valid = true;

    required.forEach(field => {
      clearError(field);
      
      let val;
      if (field.type === 'checkbox') {
        val = field.checked ? 'checked' : '';
      } else {
        val = field.value.trim();
      }

      if (!val) {
        showError(field, 'This field is required.');
        valid = false;
      } else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        showError(field, 'Please enter a valid email address.');
        valid = false;
      } else if (field.type === 'tel' && val.length < 7) {
        showError(field, 'Please enter a valid phone number.');
        valid = false;
      }
    });

    // Validate safari type selection (step 0)
    if (stepIndex === 0) {
      const safariTypeInput = form.querySelector('#safari_type');
      if (safariTypeInput && !safariTypeInput.value) {
        showFieldError(safariTypeInput, 'Please select a safari type.');
        valid = false;
      }
    }

    return valid;
  }

  function showError(field, msg) {
    field.classList.add('error');
    const err = field.parentElement.querySelector('.form-error');
    if (err) { err.textContent = msg; err.classList.add('show'); }
  }

  function clearError(field) {
    field.classList.remove('error');
    const err = field.parentElement ? field.parentElement.querySelector('.form-error') : null;
    if (err) err.classList.remove('show');
  }

  function showFieldError(field, msg) {
    field.classList.add('error');
    const wrap = field.closest('.form-group');
    if (wrap) {
      let err = wrap.querySelector('.form-error');
      if (!err) { err = document.createElement('div'); err.className = 'form-error'; wrap.appendChild(err); }
      err.textContent = msg;
      err.classList.add('show');
    }
  }

  // Clear errors on input
  form.querySelectorAll('.form-control').forEach(field => {
    field.addEventListener('input', () => clearError(field));
  });

  /* ─── Next / Back Buttons ─── */
  form.querySelectorAll('.step-next').forEach(btn => {
    btn.addEventListener('click', () => {
      if (validateStep(currentStep)) showStep(currentStep + 1);
    });
  });

  form.querySelectorAll('.step-back').forEach(btn => {
    btn.addEventListener('click', () => showStep(currentStep - 1));
  });

  /* ─── Safari Type Card Selector ─── */
  const safariCards = form.querySelectorAll('.safari-type-card');
  const safariTypeInput = form.querySelector('#safari_type');
  safariCards.forEach(card => {
    card.addEventListener('click', () => {
      safariCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      if (safariTypeInput) safariTypeInput.value = card.getAttribute('data-value');
    });
  });

  /* ─── Duration Pill Selector ─── */
  const durationPills = form.querySelectorAll('.duration-pill');
  const durationInput = form.querySelector('#duration_range');
  durationPills.forEach(pill => {
    pill.addEventListener('click', () => {
      durationPills.forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
      if (durationInput) durationInput.value = pill.getAttribute('data-value');
    });
  });

  /* ─── Accommodation Card Selector ─── */
  const accomCards = form.querySelectorAll('.accom-card');
  const accomInput = form.querySelector('#accommodation');
  accomCards.forEach(card => {
    card.addEventListener('click', () => {
      accomCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      if (accomInput) accomInput.value = card.getAttribute('data-value');
    });
  });

  /* ─── Delivery ───
     server  → Express route (npm start)
     static  → hosted form endpoint if the build set one (FORM_ENDPOINT),
               otherwise open a prefilled email draft. GitHub Pages has no backend. */
  const mode = form.dataset.mode || 'server';
  const endpoint = form.dataset.endpoint || '';
  const fallbackEmail = form.dataset.email || '';

  async function sendEnquiry(data) {
    if (mode === 'server') {
      const res = await fetch('/contact/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      return { ok: !!json.success, message: json.message };
    }

    if (endpoint) {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return { ok: true };
      let message;
      try {
        const json = await res.json();
        message = json.error || (json.errors && json.errors.map(err => err.message).join(', '));
      } catch (_) { /* non-JSON error body */ }
      return { ok: false, message };
    }

    openMailDraft(data);
    return { ok: true, viaMailto: true };
  }

  function openMailDraft(data) {
    const list = v => Array.isArray(v) ? v.join(', ') : (v || '');
    const lines = [
      `Name: ${data.firstName || ''} ${data.lastName || ''}`.trim(),
      `Email: ${data.email || ''}`,
      `Phone: ${data.phone || ''}`,
      `Country: ${data.country || ''}`,
      '',
      `Safari type: ${data.safari_type || ''}`,
      `Duration: ${data.duration_range || ''}`,
      `Travel date: ${data.travel_month || ''} ${data.travel_year || ''}`.trim(),
      `Group size: ${data.group_size || ''}`,
      `Destinations: ${list(data.destinations)}`,
      `Accommodation: ${data.accommodation || ''}`,
      '',
      'Requirements:',
      data.requirements || ''
    ];
    const subject = `Safari Enquiry: ${data.safari_type || 'Custom'} — ${data.firstName || ''} ${data.lastName || ''}`.trim();
    window.location.href = 'mailto:' + fallbackEmail +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(lines.join('\n'));
  }

  // The enquiry is only sent once the visitor presses Send in their mail app,
  // so don't claim "received" — say what actually happens.
  function showMailtoNotice() {
    const note = successScreen && successScreen.querySelector('p');
    if (!note) return;
    note.textContent = 'Your email app should now be open with your enquiry ready to go — just press Send. If nothing opened, email us at ';
    const link = document.createElement('a');
    link.href = 'mailto:' + fallbackEmail;
    link.textContent = fallbackEmail;
    note.appendChild(link);
    note.append('.');
  }

  /* ─── Form Submit ─── */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateStep(currentStep)) return;

    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
    }

    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
      if (data[key]) {
        if (!Array.isArray(data[key])) data[key] = [data[key]];
        data[key].push(value);
      } else {
        data[key] = value;
      }
    });

    try {
      const result = await sendEnquiry(data);

      if (result.ok) {
        // Show success screen
        steps.forEach(s => s.classList.remove('active'));
        const progressWrap = form.querySelector('.progress-bar-wrap');
        if (progressWrap) progressWrap.style.display = 'none';

        const nameDisplay = document.querySelector('.success-first-name');
        if (nameDisplay) nameDisplay.textContent = data.firstName || 'Explorer';

        if (result.viaMailto) showMailtoNotice();

        if (successScreen) successScreen.classList.add('show');
      } else {
        alert(result.message || 'An error occurred. Please try again.');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = 'Send Enquiry <i class="fa-solid fa-paper-plane"></i>'; }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to send. Please try again or contact us directly.');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = 'Send Enquiry <i class="fa-solid fa-paper-plane"></i>'; }
    }
  });

  /* ─── Init ─── */
  showStep(0);

})();
