/**
 * Prayer Time Calculator (Astronomical)
 * ES2026 / Node 24 compatible
 * Pure math – no APIs, no CSV files
 */

/* ==============================
   Utility Functions
================================ */

/**
 * Convert degrees to radians.
 * @param {number} degrees
 * @returns {number}
 */
function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

/**
 * Convert radians to degrees.
 * @param {number} radians
 * @returns {number}
 */
function radiansToDegrees(radians) {
  return radians * 180 / Math.PI;
}

/**
 * Get day of year (1–365/366).
 * @param {Date} date
 * @returns {number}
 */
function getDayOfYear(date) {
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const millisecondsSinceStart = date - startOfYear;
  return Math.floor(millisecondsSinceStart / (1000 * 60 * 60 * 24));
}

/* ==============================
   Solar Position Calculations
================================ */

/**
 * Calculate solar declination (δ).
 * @param {Date} date
 * @returns {number} Declination in degrees
 */
function calculateSolarDeclination(date) {
  const dayOfYear = getDayOfYear(date);
  const meanAnomaly = degreesToRadians((360 / 365) * (dayOfYear - 81));
  return 23.44 * Math.sin(meanAnomaly);
}

/**
 * Calculate Equation of Time (EoT).
 * @param {Date} date
 * @returns {number} Minutes difference from clock noon
 */
function calculateEquationOfTime(date) {
  const dayOfYear = getDayOfYear(date);
  const meanAnomaly = degreesToRadians((360 / 365) * (dayOfYear - 81));

  return (
    9.87 * Math.sin(2 * meanAnomaly) -
    7.53 * Math.cos(meanAnomaly) -
    1.5 * Math.sin(meanAnomaly)
  );
}

/**
 * Calculate solar noon (Dhuhr).
 * @param {number} longitude
 * @param {number} timezoneOffset
 * @param {number} equationOfTime
 * @returns {number} Time in decimal hours
 */
function calculateSolarNoon(longitude, timezoneOffset, equationOfTime) {
  return 12 + timezoneOffset - (longitude / 15) - (equationOfTime / 60);
}

/**
 * Calculate hour angle for a given sun altitude.
 * @param {number} sunAltitude
 * @param {number} latitude
 * @param {number} declination
 * @returns {number} Hours from solar noon
 */
function calculateHourAngle(sunAltitude, latitude, declination) {
  const latitudeRad = degreesToRadians(latitude);
  const declinationRad = degreesToRadians(declination);
  const altitudeRad = degreesToRadians(-sunAltitude);

  const cosineHourAngle =
    (Math.sin(altitudeRad) -
      Math.sin(latitudeRad) * Math.sin(declinationRad)) /
    (Math.cos(latitudeRad) * Math.cos(declinationRad));

  return radiansToDegrees(Math.acos(cosineHourAngle)) / 15;
}

/**
 * Format decimal hours to HH:MM.
 * @param {number} decimalHours
 * @returns {string}
 */
function formatTime(decimalHours) {
  const hours = Math.floor(decimalHours);
  const minutes = Math.floor((decimalHours - hours) * 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/* ==============================
   Asr Calculation (Shia)
================================ */

/**
 * Calculate Asr time (shadow = 1).
 * @param {number} latitude
 * @param {number} declination
 * @param {number} solarNoon
 * @returns {number}
 */
function calculateAsr(latitude, declination, solarNoon) {
  const latitudeRad = degreesToRadians(latitude);
  const declinationRad = degreesToRadians(declination);

  const shadowAngle =
    Math.atan(1 / (1 + Math.tan(Math.abs(latitudeRad - declinationRad))));

  const cosineHourAngle =
    (Math.sin(shadowAngle) -
      Math.sin(latitudeRad) * Math.sin(declinationRad)) /
    (Math.cos(latitudeRad) * Math.cos(declinationRad));

  const hourAngle = radiansToDegrees(Math.acos(cosineHourAngle)) / 15;

  return solarNoon + hourAngle;
}

/* ==============================
   Main Prayer Time Calculator
================================ */

/**
 * Calculate daily prayer times.
 * @param {Date} date
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} timezoneOffset
 * @returns {object}
 */
function calculatePrayerTimes(date, latitude, longitude, timezoneOffset) {
  const solarDeclination = calculateSolarDeclination(date);
  const equationOfTime = calculateEquationOfTime(date);
  const solarNoon = calculateSolarNoon(longitude, timezoneOffset, equationOfTime);

  // CONFIGURABLE ANGLES
  const FAJR_ANGLE = 18;     // Astronomical twilight
  const MAGHRIB_ANGLE = 3.7;  // Verified estimate

  const fajrTime = solarNoon - calculateHourAngle(FAJR_ANGLE, latitude, solarDeclination);
  const sunriseTime = solarNoon - calculateHourAngle(0.833, latitude, solarDeclination);
  const sunsetTime = solarNoon + calculateHourAngle(0.833, latitude, solarDeclination);
  const maghribTime = solarNoon + calculateHourAngle(MAGHRIB_ANGLE, latitude, solarDeclination);
  const asrTime = calculateAsr(latitude, solarDeclination, solarNoon);

  const midnightTime = sunsetTime + ((fajrTime + 24 - sunsetTime) / 2);

  return {
    fajr: formatTime(fajrTime),
    sunrise: formatTime(sunriseTime),
    dhuhr: formatTime(solarNoon),
    asr: formatTime(asrTime),
    sunset: formatTime(sunsetTime),
    maghrib: formatTime(maghribTime),
    midnight: formatTime(midnightTime),
  };
}

/* ==============================
   Example Usage (only when run directly)
================================ */

if (typeof require !== 'undefined' && require.main === module) {
  const date = new Date(2026, 1, 15); // Feb 15, 2026
  const latitude = 43.4296;
  const longitude = -80.4214;
  const timezoneOffset = -5; // EST

  const prayerTimes = calculatePrayerTimes(date, latitude, longitude, timezoneOffset);
  console.log(prayerTimes);
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculatePrayerTimes };
}