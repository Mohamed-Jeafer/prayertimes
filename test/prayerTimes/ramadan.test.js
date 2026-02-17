import { calculatePrayerTimes } from '../../src/prayerTimes/index.js';

/**
 * Compare calculatePrayerTimes() against the community Ramadan 1447 timetable
 * for Kitchener, ON (43.4414°N, 80.4867°W).
 *
 * Ramadan 1, 1447 AH = February 19, 2026 (Gregorian).
 * DST springs forward on March 8, 2026 at 2:00 AM → EDT (-4).
 *
 * NOTE: The provided Ramadan timetable appears to have a DST bug —
 * starting Ramadan 18 (Mar 8) it should switch from EST to EDT,
 * but the timetable continues using EST-style times from day 19 onward.
 */

const LAT = 43.441388888888888;
const LNG = -80.486666666666665;

// ── Ramadan timetable (as provided) ──────────────────────────────

const RAMADAN_TIMETABLE = [
  { day: 1,  fajr: '05:39', sunrise: '07:14', dhuhr: '12:36', maghrib: '18:16' },
  { day: 2,  fajr: '05:37', sunrise: '07:13', dhuhr: '12:36', maghrib: '18:17' },
  { day: 3,  fajr: '05:36', sunrise: '07:11', dhuhr: '12:36', maghrib: '18:19' },
  { day: 4,  fajr: '05:34', sunrise: '07:10', dhuhr: '12:36', maghrib: '18:20' },
  { day: 5,  fajr: '05:33', sunrise: '07:08', dhuhr: '12:35', maghrib: '18:21' },
  { day: 6,  fajr: '05:31', sunrise: '07:06', dhuhr: '12:35', maghrib: '18:22' },
  { day: 7,  fajr: '05:30', sunrise: '07:05', dhuhr: '12:35', maghrib: '18:24' },
  { day: 8,  fajr: '05:28', sunrise: '07:03', dhuhr: '12:35', maghrib: '18:25' },
  { day: 9,  fajr: '05:27', sunrise: '07:02', dhuhr: '12:35', maghrib: '18:26' },
  { day: 10, fajr: '05:25', sunrise: '07:00', dhuhr: '12:35', maghrib: '18:27' },
  { day: 11, fajr: '05:24', sunrise: '06:58', dhuhr: '12:34', maghrib: '18:29' },
  { day: 12, fajr: '05:22', sunrise: '06:57', dhuhr: '12:34', maghrib: '18:30' },
  { day: 13, fajr: '05:20', sunrise: '06:55', dhuhr: '12:34', maghrib: '18:31' },
  { day: 14, fajr: '05:18', sunrise: '06:53', dhuhr: '12:34', maghrib: '18:32' },
  { day: 15, fajr: '05:17', sunrise: '06:52', dhuhr: '12:34', maghrib: '18:34' },
  { day: 16, fajr: '05:15', sunrise: '06:50', dhuhr: '12:33', maghrib: '18:35' },
  { day: 17, fajr: '05:13', sunrise: '06:48', dhuhr: '12:33', maghrib: '18:36' },
  // ── DST transition: Mar 8 = Ramadan 18 ──
  { day: 18, fajr: '05:12', sunrise: '06:46', dhuhr: '12:33', maghrib: '18:37' },
  // ── From day 19 (Mar 9) onward EDT should apply — timetable appears NOT to switch ──
  { day: 19, fajr: '05:10', sunrise: '06:45', dhuhr: '12:33', maghrib: '18:39' },
  { day: 20, fajr: '05:08', sunrise: '06:43', dhuhr: '12:32', maghrib: '18:40' },
  { day: 21, fajr: '05:06', sunrise: '06:41', dhuhr: '12:32', maghrib: '18:41' },
  { day: 22, fajr: '05:04', sunrise: '06:39', dhuhr: '12:32', maghrib: '18:42' },
  { day: 23, fajr: '05:02', sunrise: '06:38', dhuhr: '12:31', maghrib: '18:44' },
  { day: 24, fajr: '05:01', sunrise: '06:36', dhuhr: '12:31', maghrib: '18:45' },
  { day: 25, fajr: '04:59', sunrise: '06:34', dhuhr: '12:31', maghrib: '18:46' },
  { day: 26, fajr: '04:57', sunrise: '06:32', dhuhr: '12:31', maghrib: '18:47' },
  { day: 27, fajr: '04:55', sunrise: '06:31', dhuhr: '12:30', maghrib: '18:48' },
  { day: 28, fajr: '04:53', sunrise: '06:29', dhuhr: '12:30', maghrib: '18:50' },
  { day: 29, fajr: '04:51', sunrise: '06:27', dhuhr: '12:30', maghrib: '18:51' },
  { day: 30, fajr: '04:49', sunrise: '06:25', dhuhr: '12:29', maghrib: '18:52' },
];

// ── helpers ──────────────────────────────────────────────────────

/** Ramadan day → Gregorian Date (Ramadan 1 = Feb 19, 2026). */
function ramadanToGregorian(day) {
  const base = new Date(2026, 1, 19); // Feb 19
  return new Date(base.getTime() + (day - 1) * 86400000);
}

/**
 * Correct timezone for a Gregorian date.
 * DST starts Mar 8 2026 (clocks spring forward).  The API reference file
 * keeps Mar 8 at EST (−5) and switches to EDT (−4) on Mar 9.
 */
function tzForGregorian(date) {
  const m = date.getMonth() + 1; // 1-based
  const d = date.getDate();
  if (m < 3) return -5;
  if (m === 3) return d >= 9 ? -4 : -5;
  return -4; // Apr onward within Ramadan range
}

/** Convert "HH:MM" → total minutes. */
const toMin = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

/** Circular-aware absolute minute difference. */
const minDiff = (a, b) => {
  const raw = Math.abs(toMin(a) - toMin(b));
  return Math.min(raw, 1440 - raw);
};

const PRAYERS = ['fajr', 'sunrise', 'dhuhr', 'maghrib'];

// ── Test 1: Pre-DST days (Ramadan 1-17) — should be very close ──

describe('Ramadan timetable vs calculator — Pre-DST (days 1-17, EST)', () => {
  for (const entry of RAMADAN_TIMETABLE.filter((e) => e.day <= 17)) {
    const gDate = ramadanToGregorian(entry.day);
    const dateStr = `${gDate.getFullYear()}/${String(gDate.getMonth() + 1).padStart(2, '0')}/${String(gDate.getDate()).padStart(2, '0')}`;

    test(`Ramadan ${entry.day} (${dateStr}) — within ±2 min`, () => {
      const calc = calculatePrayerTimes(gDate, LAT, LNG, -5);
      const diffs = {};
      for (const p of PRAYERS) {
        const d = minDiff(entry[p], calc[p]);
        diffs[p] = d;
        if (d > 0) {
          console.log(
            `  R${entry.day} ${dateStr}  ${p.padEnd(8)} Timetable=${entry[p]}  Calc=${calc[p]}  Δ=${d} min`,
          );
        }
      }
      for (const p of PRAYERS) {
        expect(diffs[p]).toBeLessThanOrEqual(2);
      }
    });
  }
});

// ── Test 2: DST day (Ramadan 18, Mar 8) ─────────────────────────

describe('Ramadan 18 (Mar 8) — DST transition day', () => {
  const entry = RAMADAN_TIMETABLE.find((e) => e.day === 18);
  const gDate = ramadanToGregorian(18);

  test('Ramadan 18 timetable uses EST (-5), matches calculator at EST', () => {
    // The timetable shows EST times on the DST day
    const calc = calculatePrayerTimes(gDate, LAT, LNG, -5);
    for (const p of PRAYERS) {
      const d = minDiff(entry[p], calc[p]);
      console.log(
        `  R18 Mar 8 (EST)  ${p.padEnd(8)} Timetable=${entry[p]}  Calc=${calc[p]}  Δ=${d} min`,
      );
      expect(d).toBeLessThanOrEqual(2);
    }
  });
});

// ── Test 3: Post-DST days (Ramadan 19-30) — expose the DST bug ──

describe('Ramadan timetable vs calculator — Post-DST (days 19-30)', () => {
  for (const entry of RAMADAN_TIMETABLE.filter((e) => e.day >= 19)) {
    const gDate = ramadanToGregorian(entry.day);
    const dateStr = `${gDate.getFullYear()}/${String(gDate.getMonth() + 1).padStart(2, '0')}/${String(gDate.getDate()).padStart(2, '0')}`;

    test(`Ramadan ${entry.day} (${dateStr}) — timetable stuck in EST, EDT calc differs by ~60 min`, () => {
      // Calculator with correct EDT (-4)
      const calcEDT = calculatePrayerTimes(gDate, LAT, LNG, -4);
      // Calculator with EST (-5) to match the "buggy" timetable
      const calcEST = calculatePrayerTimes(gDate, LAT, LNG, -5);

      console.log(`  R${entry.day} ${dateStr}:`);
      for (const p of PRAYERS) {
        const diffEDT = minDiff(entry[p], calcEDT[p]);
        const diffEST = minDiff(entry[p], calcEST[p]);
        console.log(
          `    ${p.padEnd(8)} Timetable=${entry[p]}  CalcEDT=${calcEDT[p]}(Δ${diffEDT})  CalcEST=${calcEST[p]}(Δ${diffEST})`,
        );
      }

      // The timetable should be ~60 min off from EDT
      for (const p of PRAYERS) {
        const diffEDT = minDiff(entry[p], calcEDT[p]);
        expect(diffEDT).toBeGreaterThanOrEqual(58); // ~60 min off
      }

      // But matches EST within ±2 min (proving the timetable forgot to switch)
      for (const p of PRAYERS) {
        const diffEST = minDiff(entry[p], calcEST[p]);
        expect(diffEST).toBeLessThanOrEqual(2);
      }
    });
  }
});

// ── Test 4: Summary report ───────────────────────────────────────

describe('Full Ramadan accuracy summary', () => {
  test('print complete comparison table', () => {
    console.log('\n  Ramadan 1447 Timetable vs Calculator (correct TZ):');
    console.log('  Day  Date        TZ   Prayer    Timetable  Calc     Δ');
    console.log('  ───  ──────────  ───  ────────  ─────────  ───────  ──');

    let totalDiffs = 0;
    let count = 0;
    let dstBugDays = 0;

    for (const entry of RAMADAN_TIMETABLE) {
      const gDate = ramadanToGregorian(entry.day);
      const tz = tzForGregorian(gDate);
      const tzLabel = tz === -5 ? 'EST' : 'EDT';
      const dateStr = `${gDate.getFullYear()}/${String(gDate.getMonth() + 1).padStart(2, '0')}/${String(gDate.getDate()).padStart(2, '0')}`;
      const calc = calculatePrayerTimes(gDate, LAT, LNG, tz);

      let dayHasBug = false;
      for (const p of PRAYERS) {
        const d = minDiff(entry[p], calc[p]);
        totalDiffs += d;
        count++;
        if (d > 2) dayHasBug = true;
        const flag = d > 2 ? ' ← DST BUG' : '';
        console.log(
          `  ${String(entry.day).padStart(3)}  ${dateStr}  ${tzLabel}  ${p.padEnd(8)}  ${entry[p].padEnd(9)}  ${calc[p].padEnd(7)}  ${String(d).padStart(2)}${flag}`,
        );
      }
      if (dayHasBug) dstBugDays++;
    }

    const avg = (totalDiffs / count).toFixed(2);
    console.log(`\n  Average Δ across all prayers: ${avg} min`);
    console.log(`  Days with DST bug (>2 min diff): ${dstBugDays} / 30`);

    // Pre-DST days (1-18) should have low average
    expect(dstBugDays).toBe(12); // days 19-30 have the DST bug
  });
});
