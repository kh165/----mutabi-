const PRAYER_NAMES_AR = {
  fajr: 'الفجر',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
};

export function getPrayerArabicName(id, fallback = '') {
  const candidate = String(id || '').trim().toLowerCase();
  const fallbackCandidate = String(fallback || '').trim().replace(/^صلاة\s*/u, '').toLowerCase();
  return PRAYER_NAMES_AR[candidate] || PRAYER_NAMES_AR[fallbackCandidate] || fallbackCandidate || 'الصلاة';
}
