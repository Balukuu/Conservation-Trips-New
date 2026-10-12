/* ============================================================
   motion.js — tiny physics helpers (no dependencies)
   Conservation Trips & Adventures

   Used by gesture-driven UI (the mobile menu sheet). Everything else on the
   site is plain CSS transitions, which already re-target from the current
   value and so are interruptible.
   ============================================================ */

(function (global) {
  'use strict';

  var reduceQuery = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;

  function prefersReducedMotion() {
    return !!(reduceQuery && reduceQuery.matches);
  }

  /**
   * Animate a number toward `to` with a damped spring, starting at `velocity`.
   * Handing the release velocity of a drag to `velocity` is what removes the
   * seam between "dragging" and "animating".
   *
   *   response — seconds for the value to roughly reach the target.
   *              Lower = snappier. It is NOT a fixed duration.
   *   damping  — 1 = critically damped (no overshoot). < 1 bounces.
   *              Use < 1 only when the gesture itself carried momentum.
   *
   * Returns { stop() }.
   */
  function spring(opts) {
    var to = opts.to;
    var x = opts.from;
    var v = opts.velocity || 0;
    var response = opts.response || 0.4;
    var damping = opts.damping == null ? 1 : opts.damping;
    var onUpdate = opts.onUpdate;
    var onDone = opts.onDone;

    // Apple's two-parameter model → stiffness/damping for a unit mass
    var omega = (2 * Math.PI) / response;
    var stiffness = omega * omega;
    var drag = 2 * damping * omega;

    var last = null;
    var raf = 0;
    var stopped = false;

    function frame(now) {
      if (stopped) return;
      if (last === null) last = now;
      var dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;

      // Sub-step so the integrator stays stable at high stiffness
      var steps = 4;
      var h = dt / steps;
      for (var i = 0; i < steps; i++) {
        v += (-stiffness * (x - to) - drag * v) * h;
        x += v * h;
      }

      if (Math.abs(x - to) < 0.4 && Math.abs(v) < 8) {
        stopped = true;
        onUpdate(to);
        if (onDone) onDone();
        return;
      }
      onUpdate(x);
      raf = global.requestAnimationFrame(frame);
    }

    raf = global.requestAnimationFrame(frame);

    return {
      stop: function () {
        stopped = true;
        global.cancelAnimationFrame(raf);
      }
    };
  }

  /**
   * Where a flick would come to rest if it decelerated like a scroll view.
   * `velocity` in px/s. Lower decelerationRate = stops sooner.
   */
  function project(velocity, decelerationRate) {
    var d = decelerationRate || 0.998;
    return (velocity / 1000) * d / (1 - d);
  }

  /**
   * Progressive resistance past a boundary: the further you drag, the less
   * the element follows. Sign-preserving.
   */
  function rubberband(overshoot, dimension, constant) {
    var c = constant || 0.55;
    return (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot));
  }

  global.Motion = {
    spring: spring,
    project: project,
    rubberband: rubberband,
    prefersReducedMotion: prefersReducedMotion
  };
})(window);
