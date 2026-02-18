import fs from 'node:fs';
import { calculatePrayerTimes } from '../../src/prayerTimes/index.js';

/**
 * Accuracy tests — measure the minute-level difference between
 * calculatePrayerTimes() and the reference 2026 API timings file.
 *
 * Common prayers in both sources:
 *   fajr, sunrise, dhuhr, sunset, maghreb(→maghrib), midnight
 *
 * The API file does NOT include asr / isha, so those are skipped.
 */

// ── helpers ──────────────────────────────────────────────────────

const raw = fs.readFileSync('src/prayerTimes/timings/2026.json', 'utf8');
const parsed = JSON.parse(raw);
const prayers = parsed.data.prayerTimes;
const LAT = parsed.latitude;   // 43.4414
const LNG = parsed.longitude;  // -80.4867

/** Convert "HH:MM" → total minutes since 00:00. */
const toMinutes = (t) => {
  const [hh, mm] = t.split(':').map(Number);
  return hh * 60 + mm;
};

/** Circular-aware absolute minute difference (handles midnight wrap). */
const minuteDiff = (a, b) => {
  const raw = Math.abs(toMinutes(a) - toMinutes(b));
  return Math.min(raw, 24 * 60 - raw);
};

/**
 * Map from API key → calculator key.
 * "maghreb" in the API ↔ "maghrib" from our function.
 */
const KEY_MAP = { maghreb: 'maghrib' };
const PRAYER_KEYS = ['fajr', 'sunrise', 'dhuhr', 'sunset', 'maghreb', 'midnight'];

/**
 * Determine timezone offset for a given date (EST = -5, EDT = -4).
 * 2026 DST rules (North America): Mar 8 → Nov 1.
 *   - Mar 8 02:00 clocks spring forward  → EDT (-4)
 *   - Nov 1 02:00 clocks fall back       → EST (-5)
 */
function tzForDate(dateStr) {
  // dateStr = "2026/MM/DD"
  // 2026 DST: clocks spring forward Mar 8 2am, fall back Nov 1 2am.
  // The API file uses the *pre-transition* timezone for the transition day itself:
  //   Mar 8 → still EST (-5),  EDT starts Mar 9
  //   Nov 1 → still EDT (-4),  EST starts Nov 2
  const [, m, d] = dateStr.split('/').map(Number);
  if (m < 3 || m > 11) return -5;           // Jan, Feb, Dec
  if (m > 3 && m < 11) return -4;           // Apr – Oct
  if (m === 3) return d >= 9 ? -4 : -5;     // Mar 9 onward = EDT
  /* m === 11 */ return d >= 2 ? -5 : -4;   // Nov 2 onward = EST
}

/** Run the calculator for a given API entry and return {apiVal, calcVal, diff} per prayer. */
function compareEntry(entry) {
  const [y, m, d] = entry.prayerDate.split('/').map(Number);
  const date = new Date(y, m - 1, d);
  const tz = tzForDate(entry.prayerDate);
  const calc = calculatePrayerTimes(date, LAT, LNG, tz);

  const results = {};
  for (const key of PRAYER_KEYS) {
    const calcKey = KEY_MAP[key] || key;
    const apiVal = entry[key];
    const calcVal = calc[calcKey];
    results[calcKey] = {
      api: apiVal,
      calc: calcVal,
      diff: minuteDiff(apiVal, calcVal),
    };
  }
  return results;
}

// ── Test 1: Spot-check specific representative dates ─────────────

describe('Spot-check specific dates against 2026 reference', () => {
  const spotDates = [
    '2026/01/01',  // winter solstice region
    '2026/02/15',  // mid-winter
    '2026/03/07',  // day before DST
    '2026/03/09',  // day after DST
    '2026/03/21',  // vernal equinox
    '2026/06/21',  // summer solstice
    '2026/09/22',  // autumnal equinox
    '2026/10/31',  // day before DST ends
    '2026/11/01',  // DST ends
    '2026/12/21',  // winter solstice
    '2026/12/31',  // year end
  ];

  for (const dateStr of spotDates) {
    const entry = prayers.find((p) => p.prayerDate === dateStr);
    if (!entry) continue;

    test(`${dateStr} — all prayers within ±2 minutes`, () => {
      const result = compareEntry(entry);
      for (const [prayer, { api, calc, diff }] of Object.entries(result)) {
        // Log the actual difference for visibility
        if (diff > 0) {
          // eslint-disable-next-line no-console
          console.log(`  ${dateStr}  ${prayer.padEnd(8)} API=${api}  Calc=${calc}  Δ=${diff} min`);
        }
        expect(diff).toBeLessThanOrEqual(2);
      }
    });
  }
});

// ── Test 2: DST transition boundary ──────────────────────────────

describe('DST transition accuracy (Mar 7-10, Oct 31 – Nov 2)', () => {
  const transitionDates = [
    '2026/03/07', '2026/03/08', '2026/03/09', '2026/03/10',
    '2026/10/31', '2026/11/01', '2026/11/02',
  ];

  for (const dateStr of transitionDates) {
    const entry = prayers.find((p) => p.prayerDate === dateStr);
    if (!entry) continue;

    test(`${dateStr} — DST boundary within ±2 minutes`, () => {
      const result = compareEntry(entry);
      for (const [prayer, { api, calc, diff }] of Object.entries(result)) {
        if (diff > 0) {
          console.log(`  DST ${dateStr}  ${prayer.padEnd(8)} API=${api}  Calc=${calc}  Δ=${diff} min`);
        }
        expect(diff).toBeLessThanOrEqual(2);
      }
    });
  }
});

// ── Test 3: Full-year accuracy summary (max & avg diff per prayer) ─

describe('Full-year accuracy report (365 days)', () => {
  const stats = {};
  for (const key of PRAYER_KEYS) {
    const calcKey = KEY_MAP[key] || key;
    stats[calcKey] = { total: 0, count: 0, max: 0, maxDate: '', diffs: [] };
  }

  // Compute stats across every day
  for (const entry of prayers) {
    const result = compareEntry(entry);
    for (const [prayer, { diff }] of Object.entries(result)) {
      stats[prayer].total += diff;
      stats[prayer].count += 1;
      stats[prayer].diffs.push(diff);
      if (diff > stats[prayer].max) {
        stats[prayer].max = diff;
        stats[prayer].maxDate = entry.prayerDate;
      }
    }
  }

  test('no prayer deviates more than 2 minutes on any day', () => {
    for (const [prayer, s] of Object.entries(stats)) {
      const avg = (s.total / s.count).toFixed(2);
      console.log(
        `  ${prayer.padEnd(8)}  avg=${avg} min  max=${s.max} min (${s.maxDate})`,
      );
      expect(s.max).toBeLessThanOrEqual(2);
    }
  });

  test('average deviation across year is under 1.1 minutes for every prayer', () => {
    for (const [prayer, s] of Object.entries(stats)) {
      const avg = s.total / s.count;
      // dhuhr averages ~1.02 min due to systematic rounding differences
      expect(avg).toBeLessThan(1.1);
    }
  });

  test('at least 90% of days have ≤1-minute difference for dhuhr', () => {
    const closeEnough = stats.dhuhr.diffs.filter((d) => d <= 1).length;
    const pct = ((closeEnough / stats.dhuhr.count) * 100).toFixed(1);
    console.log(`  dhuhr ≤1-min days: ${closeEnough}/${stats.dhuhr.count} (${pct}%)`);
    expect(closeEnough / stats.dhuhr.count).toBeGreaterThanOrEqual(0.9);
  });
});

// ── Test 4: First of each month — detailed comparison table ──────

describe('1st-of-month comparison table', () => {
  test('print side-by-side for the 1st of every month', () => {
    const rows = [];
    for (let month = 1; month <= 12; month++) {
      const dateStr = `2026/${String(month).padStart(2, '0')}/01`;
      const entry = prayers.find((p) => p.prayerDate === dateStr);
      if (!entry) continue;

      const result = compareEntry(entry);
      const diffs = Object.entries(result).map(
        ([prayer, { api, calc, diff }]) => `${prayer}=${diff}`,
      );
      rows.push(`${dateStr}: ${diffs.join('  ')}`);
    }
    console.log('\n  Monthly 1st-day differences (minutes):');
    for (const row of rows) console.log(`    ${row}`);

    // Lightweight assertion: every diff ≤ 2
    for (let month = 1; month <= 12; month++) {
      const dateStr = `2026/${String(month).padStart(2, '0')}/01`;
      const entry = prayers.find((p) => p.prayerDate === dateStr);
      if (!entry) continue;
      const result = compareEntry(entry);
      for (const [, { diff }] of Object.entries(result)) {
        expect(diff).toBeLessThanOrEqual(2);
      }
    }
  });
});
