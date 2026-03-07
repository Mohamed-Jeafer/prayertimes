import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const timings = JSON.parse(readFileSync(join(__dirname, "2026.json"), "utf-8"));

/**
 * Convert 24-hour "HH:MM" to 12-hour "h:mm AM/PM" (no seconds).
 */
function to12Hour(time24) {
	const [h, m] = time24.split(":").map(Number);
	const period = h >= 12 ? "PM" : "AM";
	const hour12 = h % 12 || 12;
	const minute = String(m).padStart(2, "0");
	return `${hour12}:${minute} ${period}`;
}

const PLACEHOLDER = "";

/**
 * CSV columns (no header row):
 *  1. Date          — YYYY-MM-DD
 *  2. Fajr          — h:mm AM/PM
 *  3. Sunrise       — h:mm AM/PM
 *  4. Dhuhr         — h:mm AM/PM
 *  5. Asr           — placeholder (not in Nojumi data)
 *  6. Sunset        — h:mm AM/PM
 *  7. Maghrib (calc)— h:mm AM/PM
 *  8. Isha          — placeholder (not in Nojumi data)
 *  9. Midnight      — h:mm AM/PM
 * 10. Maghrib (flat)— h:mm AM/PM  (same as col 7, no separate raw value)
 */
const rows = timings.data.prayerTimes.map((day) => {
	const date = day.prayerDate.replace(/\//g, "-");
	const fajr = to12Hour(day.fajr);
	const sunrise = to12Hour(day.sunrise);
	const dhuhr = to12Hour(day.dhuhr);
	const asr = PLACEHOLDER;
	const sunset = to12Hour(day.sunset);
	const maghrib = to12Hour(day.maghreb);
	const isha = PLACEHOLDER;
	const midnight = to12Hour(day.midnight);
	const maghribFlat = maghrib;

	return [date, fajr, sunrise, dhuhr, asr, sunset, maghrib, isha, midnight, maghribFlat].join(",");
});

const csvContent = rows.join("\n");
const outPath = join(__dirname, "..", "..", "..", "Kitchener 2026 Nojumi.csv");
writeFileSync(outPath, csvContent, "utf-8");

console.log(`CSV written to ${outPath} (${rows.length} rows)`);
