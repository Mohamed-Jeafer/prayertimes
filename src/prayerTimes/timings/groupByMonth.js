import timings2026 from "./2026.json" with { type: "json" };

/**
 * Groups prayer times by month.
 *
 * @param {Array<{prayerDate: string, fajr: string, sunrise: string, dhuhr: string, sunset: string, maghreb: string, midnight: string, astronomicalMidnight: string}>} prayerTimes
 * @returns {Record<string, Array<{prayerDate: string, fajr: string, sunrise: string, dhuhr: string, sunset: string, maghreb: string, midnight: string, astronomicalMidnight: string}>>}
 *   Keys are month names (e.g. "January"), values are arrays of prayer-time entries.
 */
function groupPrayerTimesByMonth(prayerTimes) {
	const monthNames = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December",
	];

	return prayerTimes.reduce((acc, entry) => {
		// prayerDate format: "YYYY/MM/DD"
		const monthIndex = Number.parseInt(entry.prayerDate.split("/")[1], 10) - 1;
		const monthName = monthNames[monthIndex];

		if (!acc[monthName]) {
			acc[monthName] = [];
		}
		acc[monthName].push(entry);

		return acc;
	}, {});
}

const grouped = groupPrayerTimesByMonth(timings2026.data.prayerTimes);
console.log(JSON.stringify(grouped.February)); // Example: log the first entry for February
export { groupPrayerTimesByMonth, grouped };
