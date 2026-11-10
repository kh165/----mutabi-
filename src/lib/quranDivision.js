/**
 * Quran Division Helper (الأجزاء والأحزاب والأرباع)
 * Provides precise mapping of every page (1 to 604) and Surah in the Holy Quran
 * to its exact:
 * - Juz (الجزء ١ إلى ٣٠)
 * - Hizb (الحزب ١ إلى ٦٠)
 * - Rub' al-Hizb (الربع ١ إلى ٤ داخل الحزب، و١ إلى ٢٤٠ إجمالاً)
 */

// Arabic ordinal names
export const ARABIC_ORDINALS = [
  '',
  'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس',
  'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر',
  'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر',
  'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر', 'العشرون',
  'الحادي والعشرون', 'الثاني والعشرون', 'الثالث والعشرون', 'الرابع والعشرون', 'الخامس والعشرون',
  'السادس والعشرون', 'السابع والعشرون', 'الثامن والعشرون', 'التاسع والعشرون', 'الثلاثون',
];

export const RUB_NAMES = [
  '',
  'الربع الأول',
  'الربع الثاني (نصف الحزب)',
  'الربع الثالث (ثلاثة أرباع الحزب)',
  'الربع الرابع (تمام الحزب)',
];

/**
 * Get the exact division attached to a Quran Foundation verse.
 * Returns null until the verse metadata is available rather than guessing.
 */
export function getQuranDivisionByAyah(ayah) {
  const page = Number(ayah?.pageNumber ?? ayah?.page_number);
  const juz = Number(ayah?.juzNumber ?? ayah?.juz_number);
  const hizb = Number(ayah?.hizbNumber ?? ayah?.hizb_number);
  const rubTotal = Number(ayah?.rubElHizbNumber ?? ayah?.rub_el_hizb_number);

  if (
    !Number.isInteger(page) || page < 1 || page > 604 ||
    !Number.isInteger(juz) || juz < 1 || juz > 30 ||
    !Number.isInteger(hizb) || hizb < 1 || hizb > 60 ||
    !Number.isInteger(rubTotal) || rubTotal < 1 || rubTotal > 240
  ) {
    return null;
  }

  const rubInHizb = ((rubTotal - 1) % 4) + 1;
  const rubName = RUB_NAMES[rubInHizb];
  const hizbOrdinal = ARABIC_ORDINALS[hizb] || String(hizb);
  const juzOrdinal = ARABIC_ORDINALS[juz] || String(juz);

  return {
    page,
    juz,
    hizb,
    rub: rubInHizb,
    rubNameInHizb: rubName,
    juzNumber: juz,
    hizbNumber: hizb,
    rubInHizb,
    rubTotal,
    juzOrdinal,
    hizbOrdinal,
    rubName,
    juzTitle: `الجزء ${juz}`,
    hizbTitle: `الحزب ${hizb}`,
    rubTitle: `الربع ${rubInHizb}`,
    badgeText: `الجزء ${juz} • الحزب ${hizb} • ${rubName}`,
    fullArabicDescription: `${rubName} من الحزب ${hizbOrdinal} (الجزء ${juzOrdinal})`,
    shortDescription: `${rubName} من الحزب ${hizb} • الجزء ${juz}`,
  };
}
