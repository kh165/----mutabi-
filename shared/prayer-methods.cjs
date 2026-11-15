const TIMEZONE_METHODS = Object.freeze({
  'Africa/Cairo': 5,
  'Asia/Riyadh': 4,
  'Asia/Dubai': 16,
  'Asia/Amman': 23,
  'Africa/Casablanca': 21,
  'Europe/London': 3,
  'America/New_York': 2,
});

const METHOD_NAMES = Object.freeze({
  2: 'NorthAmerica',
  3: 'MoonsightingCommittee',
  4: 'UmmAlQura',
  5: 'Egyptian',
  16: 'Dubai',
  21: 'MuslimWorldLeague',
  23: 'MuslimWorldLeague',
});

// Aladhan's API uses 15 for Moonsighting Committee; its code 3 means MWL.
const ALADHAN_API_METHODS = Object.freeze({ 3: 15 });

function resolvePrayerMethod(method, timezone) {
  if (method === 'auto' || method === undefined || method === null || method === '') {
    return TIMEZONE_METHODS[timezone] || 5;
  }
  const numericMethod = Number(method);
  return METHOD_NAMES[numericMethod] ? numericMethod : 5;
}

module.exports = { TIMEZONE_METHODS, METHOD_NAMES, ALADHAN_API_METHODS, resolvePrayerMethod };
