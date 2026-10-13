/* ============================================================
   booking.js — Enquiry forms
   Conservation Trips & Adventures

   Two forms share one delivery path and one error style:
     .booking-form          multi-step form on /contact
     #quick-enquiry-form    sidebar form on each tour page

   Errors are shown inline (role="alert") — never with window.alert().
   ============================================================ */

(function () {
  'use strict';

  var reduced = function () { return window.Motion && window.Motion.prefersReducedMotion(); };

  /* ─── Delivery ───
     server  → Express route (npm start)
     static  → hosted form endpoint if the build set one (FORM_ENDPOINT),
               otherwise open a prefilled email draft. GitHub Pages has no backend. */
  function createDelivery(form, serverPath, buildMail) {
    var mode = form.dataset.mode || 'server';
    var endpoint = form.dataset.endpoint || '';
    var fallbackEmail = form.dataset.email || '';

    function openMailDraft(data) {
      var mail = buildMail(data);
      window.location.href = 'mailto:' + fallbackEmail +
        '?subject=' + encodeURIComponent(mail.subject) +
        '&body=' + encodeURIComponent(mail.lines.join('\n'));
    }

    return {
      email: fallbackEmail,
      send: async function (data) {
        if (mode === 'server') {
          var res = await fetch(serverPath, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          var json = await res.json();
          return { ok: !!json.success, message: json.message };
        }

        if (endpoint) {
          var r = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(data)
          });
          if (r.ok) return { ok: true };
          var message;
          try {
            var j = await r.json();
            message = j.error || j.message || (j.errors && j.errors.map(function (err) { return err.message; }).join(', '));
          } catch (_) { /* non-JSON error body */ }
          return { ok: false, message: message };
        }

        openMailDraft(data);
        return { ok: true, viaMailto: true };
      }
    };
  }

  /* ─── Shared UI helpers ─── */
  function fieldWrap(field) {
    return field.closest('.form-group') || field.parentElement;
  }

  function showError(field, msg) {
    field.classList.add('error');
    field.setAttribute('aria-invalid', 'true');
    var err = fieldWrap(field).querySelector('.form-error');
    if (err) { err.textContent = msg; err.classList.add('show'); }
  }

  function clearError(field) {
    field.classList.remove('error');
    field.removeAttribute('aria-invalid');
    var wrap = fieldWrap(field);
    var err = wrap ? wrap.querySelector('.form-error') : null;
    if (err) err.classList.remove('show');
  }

  // Inline status above the submit row, announced to screen readers
  function showStatus(anchor, html) {
    var status = anchor.parentElement.querySelector(':scope > .form-status');
    if (!status) {
      status = document.createElement('div');
      status.className = 'form-status';
      status.setAttribute('role', 'alert');
      anchor.insertAdjacentElement('beforebegin', status);
    }
    status.innerHTML = '<i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i><span>' + html + '</span>';
  }

  function clearStatus(anchor) {
    var status = anchor.parentElement.querySelector(':scope > .form-status');
    if (status) status.remove();
  }

  function contactHint(email) {
    return 'Please try again, or contact us directly at <a href="mailto:' + email + '">' + email + '</a> ' +
           'or on <a href="https://wa.me/256767936590" target="_blank" rel="noopener">WhatsApp</a>.';
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function validateRequired(scope) {
    var valid = true;
    var firstInvalid = null;
    scope.querySelectorAll('[required]').forEach(function (field) {
      clearError(field);
      var val = field.type === 'checkbox' ? (field.checked ? 'checked' : '') : field.value.trim();
      var message = null;
      if (!val) message = field.type === 'checkbox' ? 'Please tick this box to continue.' : 'This field is required.';
      else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) message = 'Please enter a valid email address.';
      else if (field.type === 'tel' && val.length < 7) message = 'Please enter a valid phone number.';
      if (message) {
        showError(field, message);
        valid = false;
        if (!firstInvalid) firstInvalid = field;
      }
    });
    if (firstInvalid) firstInvalid.focus();
    return valid;
  }

  function collect(form) {
    var data = {};
    new FormData(form).forEach(function (value, key) {
      if (data[key]) {
        if (!Array.isArray(data[key])) data[key] = [data[key]];
        data[key].push(value);
      } else {
        data[key] = value;
      }
    });
    return data;
  }

  /* Card/pill pickers become a real radio group (keyboard + screen reader) */
  function choiceGroup(items, input, label) {
    if (!items.length) return;
    var group = items[0].parentElement;
    group.setAttribute('role', 'radiogroup');
    if (label) group.setAttribute('aria-label', label);

    function select(el) {
      items.forEach(function (it) {
        var on = it === el;
        it.classList.toggle('selected', on);
        it.setAttribute('aria-checked', String(on));
        it.tabIndex = on ? 0 : -1;
      });
      if (input) {
        input.value = el.getAttribute('data-value');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    items.forEach(function (el, i) {
      el.setAttribute('role', 'radio');
      el.setAttribute('aria-checked', 'false');
      el.tabIndex = i === 0 ? 0 : -1;
      el.addEventListener('click', function () { select(el); });
      el.addEventListener('keydown', function (e) {
        var move = 0;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') move = 1;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') move = -1;
        else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); select(el); return; }
        if (move) {
          e.preventDefault();
          var target = items[(i + move + items.length) % items.length];
          target.focus();
          select(target);
        }
      });
    });
  }

  /* ═══════════════ Multi-step booking form (/contact) ═══════════════ */
  var form = document.querySelector('.booking-form');
  if (form) {
    var steps = form.querySelectorAll('.form-step');
    var stepCircles = form.querySelectorAll('.step-circle');
    var stepLines = form.querySelectorAll('.step-line');
    var stepLabels = form.querySelectorAll('.step-label');
    var successScreen = form.querySelector('.success-screen');
    var currentStep = 0;

    var delivery = createDelivery(form, '/contact/booking', function (data) {
      var list = function (v) { return Array.isArray(v) ? v.join(', ') : (v || ''); };
      var who = ((data.firstName || '') + ' ' + (data.lastName || '')).trim();
      return {
        subject: ('Safari Enquiry: ' + (data.safari_type || 'Custom') + ' — ' + who).trim(),
        lines: [
          ('Name: ' + who).trim(),
          'Email: ' + (data.email || ''),
          'Phone: ' + (data.phone || ''),
          'Country: ' + (data.country || ''),
          '',
          'Safari type: ' + (data.safari_type || ''),
          'Duration: ' + (data.duration_range || ''),
          ('Travel date: ' + (data.travel_month || '') + ' ' + (data.travel_year || '')).trim(),
          'Group size: ' + (data.group_size || ''),
          'Destinations: ' + list(data.destinations),
          'Accommodation: ' + (data.accommodation || ''),
          '',
          'Requirements:',
          data.requirements || ''
        ]
      };
    });

    var updateProgress = function () {
      stepCircles.forEach(function (circle, i) {
        circle.classList.remove('active', 'done');
        if (i < currentStep) circle.classList.add('done');
        else if (i === currentStep) circle.classList.add('active');
      });
      stepLines.forEach(function (line, i) { line.classList.toggle('done', i < currentStep); });
      stepLabels.forEach(function (label, i) {
        label.classList.remove('active', 'done');
        if (i < currentStep) label.classList.add('done');
        else if (i === currentStep) label.classList.add('active');
      });
    };

    var showStep = function (n, userInitiated) {
      steps.forEach(function (step, i) { step.classList.toggle('active', i === n); });
      currentStep = n;
      updateProgress();
      if (!userInitiated) return;
      // Move keyboard / screen-reader context to the new step's heading
      var heading = steps[n].querySelector('h4');
      if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
      if (window.innerWidth < 768) {
        form.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
      }
    };

    var validateStep = function (index) {
      var ok = validateRequired(steps[index]);
      // safari type (step 1) is chosen with cards, not a native required field
      if (index === 0) {
        var typeInput = form.querySelector('#safari_type');
        if (typeInput && !typeInput.value) {
          var wrap = typeInput.closest('.form-step');
          showStatus(wrap.querySelector('.step-next'), 'Please choose the kind of safari you are dreaming of.');
          ok = false;
        } else {
          clearStatus(steps[0].querySelector('.step-next'));
        }
      }
      return ok;
    };

    form.querySelectorAll('.form-control, input[type="checkbox"]').forEach(function (field) {
      field.addEventListener('input', function () { clearError(field); });
      field.addEventListener('change', function () { clearError(field); });
    });
    var typeInputEl = form.querySelector('#safari_type');
    if (typeInputEl) {
      typeInputEl.addEventListener('input', function () { clearStatus(steps[0].querySelector('.step-next')); });
    }

    form.querySelectorAll('.step-next').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (validateStep(currentStep)) showStep(currentStep + 1, true);
      });
    });
    form.querySelectorAll('.step-back').forEach(function (btn) {
      btn.addEventListener('click', function () { showStep(currentStep - 1, true); });
    });

    choiceGroup(Array.prototype.slice.call(form.querySelectorAll('.safari-type-card')), form.querySelector('#safari_type'), 'Type of safari');
    choiceGroup(Array.prototype.slice.call(form.querySelectorAll('.duration-pill')), form.querySelector('#duration_range'), 'Number of days');
    choiceGroup(Array.prototype.slice.call(form.querySelectorAll('.accom-card')), form.querySelector('#accommodation'), 'Accommodation preference');

    var showMailtoNotice = function () {
      // The enquiry is only sent once the visitor presses Send in their mail
      // app, so don't claim "received" — say what actually happens.
      var note = successScreen && successScreen.querySelector('p');
      if (!note) return;
      note.textContent = 'Your email app should now be open with your enquiry ready to go — just press Send. If nothing opened, email us at ';
      var link = document.createElement('a');
      link.href = 'mailto:' + delivery.email;
      link.textContent = delivery.email;
      note.appendChild(link);
      note.append('.');
    };

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!validateStep(currentStep)) return;

      var submitBtn = form.querySelector('[type="submit"]');
      var sendLabel = submitBtn.innerHTML;
      clearStatus(submitBtn.parentElement);
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

      var data = collect(form);
      var fail = function (msg) {
        showStatus(submitBtn.parentElement, (msg ? escapeHtml(msg) + ' ' : 'We couldn’t send your enquiry. ') + contactHint(delivery.email));
        submitBtn.disabled = false;
        submitBtn.innerHTML = sendLabel;
      };

      try {
        var result = await delivery.send(data);
        if (result.ok) {
          steps.forEach(function (s) { s.classList.remove('active'); });
          var progressWrap = form.querySelector('.progress-bar-wrap');
          if (progressWrap) progressWrap.style.display = 'none';
          var nameDisplay = document.querySelector('.success-first-name');
          if (nameDisplay) nameDisplay.textContent = data.firstName || 'Explorer';
          if (result.viaMailto) showMailtoNotice();
          if (successScreen) {
            successScreen.classList.add('show');
            successScreen.setAttribute('tabindex', '-1');
            successScreen.focus({ preventScroll: true });
          }
        } else {
          fail(result.message);
        }
      } catch (err) {
        console.error(err);
        fail();
      }
    });

    showStep(0, false);
  }

  /* ═══════════════ Quick enquiry (tour pages) ═══════════════ */
  var quick = document.getElementById('quick-enquiry-form');
  if (quick) {
    var quickDelivery = createDelivery(quick, '/contact/enquiry', function (data) {
      return {
        subject: ('Tour enquiry: ' + (data.tour || 'Safari') + ' — ' + (data.name || '')).trim(),
        lines: [
          'Tour: ' + (data.tour || ''),
          'Name: ' + (data.name || ''),
          'Email: ' + (data.email || ''),
          'Phone: ' + (data.phone || ''),
          'Travel date: ' + (data.travel_date || ''),
          'Group size: ' + (data.group_size || ''),
          '',
          'Special requests:',
          data.message || ''
        ]
      };
    });

    quick.querySelectorAll('.form-control').forEach(function (field) {
      field.addEventListener('input', function () { clearError(field); });
    });

    quick.addEventListener('submit', async function (e) {
      e.preventDefault();
      var btn = quick.querySelector('[type="submit"]');
      var label = btn.innerHTML;
      clearStatus(btn);
      if (!validateRequired(quick)) return;

      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
      var data = Object.fromEntries(new FormData(quick).entries());
      var fail = function (msg) {
        showStatus(btn, (msg ? escapeHtml(msg) + ' ' : 'We couldn’t send your enquiry. ') + contactHint(quickDelivery.email));
        btn.disabled = false;
        btn.innerHTML = label;
      };

      try {
        var result = await quickDelivery.send(data);
        if (!result.ok) { fail(result.message); return; }
        var success = document.getElementById('enquiry-success');
        quick.hidden = true;
        if (success) {
          if (result.viaMailto) {
            var line = success.querySelector('p:last-child');
            if (line) line.textContent = 'Your email app should now be open with your enquiry ready — just press Send.';
            var head = success.querySelector('p:first-of-type');
            if (head) head.textContent = 'Almost there!';
          }
          success.hidden = false;
          success.setAttribute('tabindex', '-1');
          success.focus({ preventScroll: true });
        }
      } catch (err) {
        console.error(err);
        fail();
      }
    });
  }

})();
