'use strict';

/*
 * Formatting for dated, fixed-price trips (the "Seasonal Trips" category).
 * A tour opts in by having `dates` and/or `pricing` in data/tours.json:
 *
 *   "dates":   { "start": "2026-12-24", "end": "2026-12-26" }
 *   "pricing": { "currency": "UGX",
 *                "options": [{ "label": "Sharing", "amount": 950000 },
 *                            { "label": "Kids (5–12 yrs)", "amount": 550000, "child": true }],
 *                "bookingFee": 300000, "bookingFeeNote": "To secure your festive slot" }
 *
 * Tours without them (the USD, any-date safaris) are unaffected.
 */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Dates are calendar days, not instants: parse as UTC so a build server in
// another time zone can't shift "24 Dec" to the 23rd.
function parse(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return { y, m: m - 1, d };
}

function ordinal(n) {
  const rem = n % 100;
  if (rem >= 11 && rem <= 13) return n + 'th';
  return n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
}

// { short: '24–26 Dec 2026', long: '24th – 26th December 2026', compact: '24–26 Dec' }
// A range that crosses a month or year repeats the part that changes:
// '30 Dec 2026 – 1 Jan 2027'.
function tripDates(dates) {
  if (!dates || !dates.start) return null;
  const a = parse(dates.start);
  const b = dates.end ? parse(dates.end) : a;
  const sameMonth = a.y === b.y && a.m === b.m;
  const mon = m => MONTHS[m].slice(0, 3);

  if (sameMonth && a.d === b.d) {
    return { short: `${a.d} ${mon(a.m)} ${a.y}`, long: `${ordinal(a.d)} ${MONTHS[a.m]} ${a.y}`, compact: `${a.d} ${mon(a.m)}` };
  }
  if (sameMonth) {
    return {
      short: `${a.d}–${b.d} ${mon(a.m)} ${a.y}`,
      long: `${ordinal(a.d)} – ${ordinal(b.d)} ${MONTHS[a.m]} ${a.y}`,
      compact: `${a.d}–${b.d} ${mon(a.m)}`
    };
  }
  return {
    short: `${a.d} ${mon(a.m)}${a.y === b.y ? '' : ' ' + a.y} – ${b.d} ${mon(b.m)} ${b.y}`,
    long: `${ordinal(a.d)} ${MONTHS[a.m]}${a.y === b.y ? '' : ' ' + a.y} – ${ordinal(b.d)} ${MONTHS[b.m]} ${b.y}`,
    compact: `${a.d} ${mon(a.m)} – ${b.d} ${mon(b.m)}`
  };
}

// 950000 -> 'UGX 950,000'
function money(amount, currency = 'UGX') {
  return `${currency} ${Number(amount).toLocaleString('en-US')}`;
}

// The cheapest adult option of a tour's pricing, for "From UGX 650,000" labels.
// Options flagged `child: true` are skipped, or "From" would quote the kids' rate.
function lowestPrice(pricing) {
  const options = (pricing && pricing.options) || [];
  const adults = options.filter(o => !o.child);
  const amounts = (adults.length ? adults : options).map(o => o.amount).filter(Number.isFinite);
  return amounts.length ? Math.min(...amounts) : null;
}

module.exports = { tripDates, money, lowestPrice };
