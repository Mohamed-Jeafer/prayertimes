import fs from 'fs';
import { calculatePrayerTimes } from '../../src/prayerTimes/index.js';

// Increase timeout for remote API call
jest.setTimeout(20000);

test('calculator matches stored API timings (one day per month) within ±1 minute', () => {
  // Load local timings JSON (saved full-year response)
  const raw = fs.readFileSync('src/prayerTimes/timings/2026.json', 'utf8');
  const parsed = JSON.parse(raw);
  const prayers = parsed.data.prayerTimes;

  const lat = parsed.latitude;
  const lng = parsed.longitude;
  const tz = Number(parsed.data.localDateTimeNow.gmt || -5);

  // Map API keys to our keys where necessary
  const keyMap = { maghreb: 'maghrib' };

  // Helper to convert HH:MM -> minutes
  const toMinutes = (t) => {
    const [hh, mm] = t.split(':').map(Number);
    return hh * 60 + mm;
  };

  // Check the first 5 days of each month (Jan..Dec) to measure consistency.
  for (let month = 1; month <= 12; month++) {
    const monthStr = String(month).padStart(2, '0');
    for (let day = 1; day <= 5; day++) {
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `2026/${monthStr}/${dayStr}`;
      const apiEntry = prayers.find((p) => p.prayerDate === dateStr);
      if (!apiEntry) continue; // skip missing dates

      const [y, m, d] = apiEntry.prayerDate.split('/').map(Number);
      const date = new Date(y, m - 1, d);

      // Derive per-date timezone offset robustly (handles DST transitions).
      // Start from rounded offset from API dhuhr vs UTC-calc, then try neighbors and pick the one
      // that minimizes the sum of minute-differences across all prayers for that date.
      const calcUtc = calculatePrayerTimes(date, lat, lng, 0);
      const apiDhuhrMin = toMinutes(apiEntry.dhuhr);
      const utcDhuhrMin = toMinutes(calcUtc.dhuhr);
      const baseTz = Math.round((apiDhuhrMin - utcDhuhrMin) / 60);
      const candidates = [baseTz - 1, baseTz, baseTz + 1];

      // Normalize candidate into [-12,12]
      const norm = (tz) => {
        let t = tz;
        if (t > 12) t -= 24;
        if (t < -12) t += 24;
        return t;
      };

      const scoreForTz = (tz) => {
        const t = norm(tz);
        const calc = calculatePrayerTimes(date, lat, lng, t);
        let sum = 0;
        Object.keys(apiEntry).forEach((k) => {
          if (k === 'prayerDate' || k === 'astronomicalMidnight') return;
          const apiKey = k;
          const calcKey = keyMap[apiKey] || apiKey;
          const apiVal = apiEntry[apiKey];
          const calcVal = calc[calcKey];
          if (!calcVal) return;
          const apiMin = toMinutes(apiVal);
          const calcMin = toMinutes(calcVal);
          const rawDiff = Math.abs(apiMin - calcMin);
          const diff = Math.min(rawDiff, 24 * 60 - rawDiff);
          sum += diff;
        });
        return sum;
      };

      // Choose candidate with smallest score; tie-breaker: choose baseTz
      let tzForDate = norm(candidates.reduce((best, cand) => {
        const s = scoreForTz(cand);
        if (!best || s < best.score || (s === best.score && cand === baseTz)) return { tz: cand, score: s };
        return best;
      }, null).tz);

      const calc = calculatePrayerTimes(date, lat, lng, tzForDate);

      

      Object.keys(apiEntry).forEach((key) => {
        if (key === 'prayerDate' || key === 'astronomicalMidnight') return;
        const apiKey = key;
        const calcKey = keyMap[apiKey] || apiKey;
        const apiVal = apiEntry[apiKey];
        const calcVal = calc[calcKey];
        expect(calcVal).toBeDefined();

        const apiMin = toMinutes(apiVal);
        const calcMin = toMinutes(calcVal);
        const rawDiff = Math.abs(apiMin - calcMin);
        const diff = Math.min(rawDiff, 24 * 60 - rawDiff);
        expect(diff).toBeLessThanOrEqual(1);
      });
    }
  }
});
