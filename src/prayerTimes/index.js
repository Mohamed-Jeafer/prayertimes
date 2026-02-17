/**
 * Prayer Time Calculator (Astronomical)
 * ES2026 / Node 24 compatible
 * Pure math – no APIs, no CSV files
 */

/* ==============================
   Utility Functions
================================ */

function degToRad(d) { return (d * Math.PI) / 180; }
function radToDeg(r) { return (r * 180) / Math.PI; }

function normalizeAngle(deg) {
	let a = deg % 360;
	if (a < 0) a += 360;
	return a;
}

function normalizeToScale(value, size) {
	return value - Math.floor(value / size) * size;
}

function quadrantShiftAngle(angle) {
	let a = angle % 360;
	if (a < -180) a += 360;
	if (a > 180) a -= 360;
	return a;
}

function unwindAngle(angle) {
	let a = angle % 360;
	if (a < 0) a += 360;
	return a;
}

/* ==============================
   Astronomical Calculations
================================ */

function julianDay(year, month, day, hours = 0) {
	const Y = month > 2 ? year : year - 1;
	const M = month > 2 ? month : month + 12;
	const D = day + hours / 24;
	const A = Math.trunc(Y / 100);
	const B = Math.trunc(2 - A + Math.trunc(A / 4));
	const i0 = Math.trunc(365.25 * (Y + 4716));
	const i1 = Math.trunc(30.6001 * (M + 1));
	return i0 + i1 + D + B - 1524.5;
}

function julianCentury(jd) {
	return (jd - 2451545) / 36525;
}

function meanSolarLongitude(T) {
	const term1 = 280.4664567;
	const term2 = 36000.76983 * T;
	const term3 = 0.0003032 * T ** 2;
	return normalizeAngle(term1 + term2 + term3);
}

function meanLunarLongitude(T) {
	const term1 = 218.3165;
	const term2 = 481267.8813 * T;
	return normalizeAngle(term1 + term2);
}

function ascendingLunarNodeLongitude(T) {
	const term1 = 125.04452;
	const term2 = 1934.136261 * T;
	const term3 = 0.0020708 * T ** 2;
	const term4 = T ** 3 / 450000;
	return normalizeAngle(term1 - term2 + term3 + term4);
}

function meanSolarAnomaly(T) {
	const term1 = 357.52911;
	const term2 = 35999.05029 * T;
	const term3 = 0.0001537 * T ** 2;
	return normalizeAngle(term1 + term2 - term3);
}

function solarEquationOfTheCenter(T, meanAnomaly) {
	const Mrad = degToRad(meanAnomaly);
	const term1 = (1.914602 - 0.004817 * T - 0.000014 * T ** 2) * Math.sin(Mrad);
	const term2 = (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad);
	const term3 = 0.000289 * Math.sin(3 * Mrad);
	return term1 + term2 + term3;
}

function apparentSolarLongitude(T, meanLongitude) {
	const longitude = meanLongitude + solarEquationOfTheCenter(T, meanSolarAnomaly(T));
	const Omega = 125.04 - 1934.136 * T;
	const Lambda = longitude - 0.00569 - 0.00478 * Math.sin(degToRad(Omega));
	return normalizeAngle(Lambda);
}

function meanObliquityOfTheEcliptic(T) {
	const term1 = 23.439291;
	const term2 = 0.013004167 * T;
	const term3 = 0.0000001639 * T ** 2;
	const term4 = 0.0000005036 * T ** 3;
	return term1 - term2 - term3 + term4;
}

function apparentObliquityOfTheEcliptic(T, meanObliq) {
	const O = 125.04 - 1934.136 * T;
	return meanObliq + 0.00256 * Math.cos(degToRad(O));
}

function meanSiderealTime(T) {
	const JD = T * 36525 + 2451545;
	const term1 = 280.46061837;
	const term2 = 360.98564736629 * (JD - 2451545);
	const term3 = 0.000387933 * T ** 2;
	const term4 = T ** 3 / 38710000;
	return normalizeAngle(term1 + term2 + term3 - term4);
}

function nutationInLongitude(solarLongitude, lunarLongitude, ascendingNode) {
	const L0 = solarLongitude;
	const Lp = lunarLongitude;
	const Omega = ascendingNode;
	const term1 = (-17.2 / 3600) * Math.sin(degToRad(Omega));
	const term2 = (1.32 / 3600) * Math.sin(2 * degToRad(L0));
	const term3 = (0.23 / 3600) * Math.sin(2 * degToRad(Lp));
	const term4 = (0.21 / 3600) * Math.sin(2 * degToRad(Omega));
	return term1 - term2 - term3 + term4;
}

function nutationInObliquity(solarLongitude, lunarLongitude, ascendingNode) {
	const L0 = solarLongitude;
	const Lp = lunarLongitude;
	const Omega = ascendingNode;
	const term1 = (9.2 / 3600) * Math.cos(degToRad(Omega));
	const term2 = (0.57 / 3600) * Math.cos(2 * degToRad(L0));
	const term3 = (0.1 / 3600) * Math.cos(2 * degToRad(Lp));
	const term4 = (0.09 / 3600) * Math.cos(2 * degToRad(Omega));
	return term1 + term2 + term3 - term4;
}

function altitudeOfCelestialBody(observerLatitude, declination, localHourAngle) {
	const Phi = observerLatitude;
	const delta = declination;
	const H = localHourAngle;
	const term1 = Math.sin(degToRad(Phi)) * Math.sin(degToRad(delta));
	const term2 = Math.cos(degToRad(Phi)) * Math.cos(degToRad(delta)) * Math.cos(degToRad(H));
	return radToDeg(Math.asin(term1 + term2));
}

function approximateTransit(longitude, siderealTime, rightAscension) {
	const Lw = longitude * -1;
	return normalizeToScale((rightAscension + Lw - siderealTime) / 360, 1);
}

function interpolateAngles(y2, y1, y3, n) {
	const a = unwindAngle(y2 - y1);
	const b = unwindAngle(y3 - y2);
	const c = b - a;
	return y2 + (n / 2) * (a + b + n * c);
}

function interpolate(y2, y1, y3, n) {
	const a = y2 - y1;
	const b = y3 - y2;
	const c = b - a;
	return y2 + (n / 2) * (a + b + n * c);
}

function correctedTransit(approximateTransit, longitude, siderealTime, rightAscension, previousRightAscension, nextRightAscension) {
	const m0 = approximateTransit;
	const Lw = longitude * -1;
	const Theta = unwindAngle(siderealTime + 360.985647 * m0);
	const a = unwindAngle(interpolateAngles(rightAscension, previousRightAscension, nextRightAscension, m0));
	const H = quadrantShiftAngle(Theta - Lw - a);
	const dm = H / -360;
	return (m0 + dm) * 24;
}

/**
 * Calculates the corrected hour angle.
 * @param {object} p
 * @returns {number}
 */
function correctedHourAngle(p) {
	const m0 = p.approximateTransit;
	const h0 = p.angle;
	const coordinates = p.coordinates;
	const afterTransit = p.afterTransit;
	const siderealTime = p.siderealTime;
	const rightAscension = p.rightAscension;
	const previousRightAscension = p.previousRightAscension;
	const nextRightAscension = p.nextRightAscension;
	const declination = p.declination;
	const previousDeclination = p.previousDeclination;
	const nextDeclination = p.nextDeclination;

	const Lw = coordinates.longitude * -1;
	const term1 = Math.sin(degToRad(h0)) - Math.sin(degToRad(coordinates.latitude)) * Math.sin(degToRad(declination));
	const term2 = Math.cos(degToRad(coordinates.latitude)) * Math.cos(degToRad(declination));
	const H0 = radToDeg(Math.acos(term1 / term2));
	const m = afterTransit ? m0 + H0 / 360 : m0 - H0 / 360;
	const Theta = unwindAngle(siderealTime + 360.985647 * m);
	const a = unwindAngle(interpolateAngles(rightAscension, previousRightAscension, nextRightAscension, m));
	const delta = interpolate(declination, previousDeclination, nextDeclination, m);
	const H = Theta - Lw - a;
	const h = altitudeOfCelestialBody(coordinates.latitude, delta, H);
	const term3 = h - h0;
	const term4 = 360 * Math.cos(degToRad(delta)) * Math.cos(degToRad(coordinates.latitude)) * Math.sin(degToRad(H));
	const dm = term3 / term4;
	return (m + dm) * 24;
}

/* ==============================
   Formatting Functions
================================ */

function formatTime(decimalHours) {
	const totalMinutes = Math.round(decimalHours * 60);
	const hours = Math.floor((totalMinutes / 60) % 24);
	const minutes = totalMinutes % 60;
	return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatTimeFloor(decimalHours) {
	const hours = Math.floor(decimalHours);
	const minutes = Math.floor((decimalHours - hours) * 60);
	return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatTimeRound(decimalHours) {
	return formatTime(decimalHours);
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
 * @param {object} options
 * @returns {object}
 */
function calculatePrayerTimes(date, latitude, longitude, timezoneOffset, options = {}) {
	// 1. Calculate Julian Day
	const utcYear = date.getUTCFullYear();
	const utcMonth = date.getUTCMonth() + 1;
	const utcDay = date.getUTCDate();
	const jd = julianDay(utcYear, utcMonth, utcDay, 0);

	// 2. Solar coordinates for current, previous, and next day
	const getSolarCoords = (jDay) => {
		const T = julianCentury(jDay);
		const L0 = meanSolarLongitude(T);
		const Lp = meanLunarLongitude(T);
		const Omega = ascendingLunarNodeLongitude(T);
		const Lambda = apparentSolarLongitude(T, L0);
		const Theta0 = meanSiderealTime(T);
		const dPsi = nutationInLongitude(L0, Lp, Omega);
		const dEpsilon = nutationInObliquity(L0, Lp, Omega);
		const Epsilon0 = meanObliquityOfTheEcliptic(T);
		const EpsilonApparent = apparentObliquityOfTheEcliptic(T, Epsilon0);
		const LambdaRad = degToRad(Lambda);
		const EpsAppRad = degToRad(EpsilonApparent);

		return {
			declination: radToDeg(Math.asin(Math.sin(EpsAppRad) * Math.sin(LambdaRad))),
			rightAscension: unwindAngle(radToDeg(Math.atan2(Math.cos(EpsAppRad) * Math.sin(LambdaRad), Math.cos(LambdaRad)))),
			apparentSiderealTime: Theta0 + (dPsi * 3600 * Math.cos(degToRad(Epsilon0 + dEpsilon))) / 3600,
		};
	};

	const solar = getSolarCoords(jd);
	const prevSolar = getSolarCoords(jd - 1);
	const nextSolar = getSolarCoords(jd + 1);

	const coords = { latitude, longitude };
	const m0 = approximateTransit(longitude, solar.apparentSiderealTime, solar.rightAscension);

	// 3. Configuration (Angles)
	const FAJR_ANGLE = options.fajrAngle ?? 17.98; // Best statistical match for 2026 file
	const SUNRISE_ALTITUDE = options.sunriseAltitude ?? 0.833;
	const MAGHRIB_ANGLE = options.maghribAngle ?? 3.79; // Matched to 2026 file (Std Jafari is 4.5)
	const ISHA_ANGLE = options.ishaAngle ?? 14; // Jafari default

	// 4. Calculate Transit (Solar Noon)
	const solarNoon = correctedTransit(
		m0,
		longitude,
		solar.apparentSiderealTime,
		solar.rightAscension,
		prevSolar.rightAscension,
		nextSolar.rightAscension,
	);

	// 5. Calculate Prayer Times
	const commonParams = {
		siderealTime: solar.apparentSiderealTime,
		rightAscension: solar.rightAscension,
		previousRightAscension: prevSolar.rightAscension,
		nextRightAscension: nextSolar.rightAscension,
		declination: solar.declination,
		previousDeclination: prevSolar.declination,
		nextDeclination: nextSolar.declination,
		coordinates: coords,
		approximateTransit: m0
	};

	const sunriseTime = correctedHourAngle({
		...commonParams,
		angle: -SUNRISE_ALTITUDE,
		afterTransit: false
	});

	const sunsetTime = correctedHourAngle({
		...commonParams,
		angle: -SUNRISE_ALTITUDE,
		afterTransit: true
	});

	const fajrTime = correctedHourAngle({
		...commonParams,
		angle: -FAJR_ANGLE,
		afterTransit: false
	});

	const maghribTime = correctedHourAngle({
		...commonParams,
		angle: -MAGHRIB_ANGLE,
		afterTransit: true
	});

	const ishaTime = correctedHourAngle({
		...commonParams,
		angle: -ISHA_ANGLE,
		afterTransit: true
	});

	// Asr (Shadow Ratio = 1)
	const asrTime = (() => {
		const tangent = Math.abs(coords.latitude - solar.declination);
		const inverse = 1 + Math.tan(degToRad(tangent));
		const angle = radToDeg(Math.atan(1 / inverse));
		return correctedHourAngle({
			...commonParams,
			angle,
			afterTransit: true
		});
	})();

	// 6. Convert to Local Time
	const solarNoonLocal = solarNoon + timezoneOffset;
	const sunriseLocal = sunriseTime + timezoneOffset;
	const sunsetLocal = sunsetTime + timezoneOffset;
	const fajrLocal = fajrTime + timezoneOffset;
	const maghribLocal = maghribTime + timezoneOffset;
	const ishaLocal = ishaTime + timezoneOffset;
	const asrLocal = asrTime + timezoneOffset;
	const midnightTime = sunsetLocal + (fajrLocal + 24 - sunsetLocal) / 2;

	// 7. Format Output
	const fmt = options.format || 'mixed';
	const formatter = (t) => {
		if (fmt === 'floor') return formatTimeFloor(t);
		if (fmt === 'round') return formatTimeRound(t);
		// mixed (default): sunrise/sunset/maghrib floor, others round
		// However, we handle mixed explicitly below
		return formatTimeRound(t);
	};

	if (fmt === 'mixed') {
		return {
			fajr: formatTimeRound(fajrLocal),
			sunrise: formatTimeFloor(sunriseLocal),
			dhuhr: formatTimeRound(solarNoonLocal),
			asr: formatTimeRound(asrLocal),
			sunset: formatTimeFloor(sunsetLocal),
			maghrib: formatTimeFloor(maghribLocal),
			isha: formatTimeRound(ishaLocal),
			midnight: formatTimeRound(midnightTime),
		};
	}

	return {
		fajr: formatter(fajrLocal),
		sunrise: formatter(sunriseLocal),
		dhuhr: formatter(solarNoonLocal),
		asr: formatter(asrLocal),
		sunset: formatter(sunsetLocal),
		maghrib: formatter(maghribLocal),
		isha: formatter(ishaLocal),
		midnight: formatter(midnightTime),
	};
}

export { calculatePrayerTimes };
