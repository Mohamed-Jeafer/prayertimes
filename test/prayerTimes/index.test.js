const axios = require('axios');
const { calculatePrayerTimes } = require('../../src/prayerTimes/index');

// Increase timeout for remote API call
jest.setTimeout(20000);

test('calculator matches external API exactly for same day/location', async () => {
  const date = new Date(2026, 1, 16); // Feb 16, 2026
  const lat = 43.40638888888889;
  const lng = -80.52194444444444;
  const tz = -5;

  // Call remote API
  const body = { lat, lng, date: '2026/02/16' };
  const res = await axios.post(
    'https://arabic.nojumi.org/WebPages/PrayerTimes.aspx/GetPrayerTimesFromAPI',
    body,
    { headers: { 'Content-Type': 'application/json' } }
  );

  // The API returns a string payload in `d` which is JSON; parse it
  const parsed = JSON.parse(res.data.d);
  const apiPrayer = parsed.data.prayerTimes[0];

  const calc = calculatePrayerTimes(date, lat, lng, tz);

  // Map API keys to our keys where necessary
  const keyMap = { maghreb: 'maghrib' };

  Object.keys(apiPrayer).forEach((key) => {
    if (key === 'prayerDate' || key === 'astronomicalMidnight') return;
    const apiKey = key;
    const calcKey = keyMap[apiKey] || apiKey;
    const apiVal = apiPrayer[apiKey];
    const calcVal = calc[calcKey];
    expect(calcVal).toBeDefined();
    expect(calcVal).toEqual(apiVal);
  });
});
