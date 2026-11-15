const METHOD_NAMES = {
  0: 'Jafari',
  1: 'Karachi',
  2: 'ISNA',
  3: 'MoonsightingCommittee',
  4: 'UmmAlQura',
  5: 'Egyptian',
  7: 'InstituteOfGeophysics',
  8: 'GulfRegion',
  9: 'Kuwait',
  10: 'Qatar',
  11: 'Singapore',
  12: 'UOfT',
  13: 'Tehran',
  14: 'Turkey',
  15: 'Other',
  16: 'Dubai',
  17: 'MoonsightingCommittee',
  18: 'Morocco',
  19: 'Portugal',
  20: 'France',
  21: 'MuslimWorldLeague',
  22: 'MoonsightingCommittee',
  23: 'MuslimWorldLeague',
};
const ALADHAN_API_METHODS = { 3: 15, 21: 3, 23: 3 };
const TIMEZONE_METHODS = {
  'Africa/Cairo': 5,
  'Asia/Riyadh': 4,
  'Asia/Kuwait': 9,
  'Asia/Qatar': 10,
  'Asia/Dubai': 16,
  'Asia/Singapore': 11,
  'Asia/Karachi': 1,
  'Europe/Istanbul': 14,
  'America/New_York': 2,
  'America/Toronto': 2,
};
function resolvePrayerMethod(method, timezone) {
  if (method !== undefined && method !== null && method !== '' && method !== 'auto') {
    const explicit = Number(method);
    return Number.isInteger(explicit) && METHOD_NAMES[explicit] ? explicit : 5;
  }
  return TIMEZONE_METHODS[timezone] || 5;
}
module.exports = { METHOD_NAMES, ALADHAN_API_METHODS, TIMEZONE_METHODS, resolvePrayerMethod };
