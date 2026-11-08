/**
 * Quran Division Helper (الأجزاء والأحزاب والأرباع)
 * Provides precise mapping of every page (1 to 604) and Surah in the Holy Quran
 * to its exact:
 * - Juz (الجزء ١ إلى ٣٠)
 * - Hizb (الحزب ١ إلى ٦٠)
 * - Rub' al-Hizb (الربع ١ إلى ٤ داخل الحزب، و١ إلى ٢٤٠ إجمالاً)
 */

import { SURAHS } from '../data/quran.js';

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
 * Standard starting pages of each of the 30 Juz in the 604-page Madinah Mushaf
 */
export const JUZ_START_PAGES = [
  0,   // index 0 unused
  1,   // Juz 1
  22,  // Juz 2
  42,  // Juz 3
  62,  // Juz 4
  82,  // Juz 5
  102, // Juz 6
  121, // Juz 7
  142, // Juz 8
  162, // Juz 9
  182, // Juz 10
  201, // Juz 11
  222, // Juz 12
  242, // Juz 13
  262, // Juz 14
  282, // Juz 15
  302, // Juz 16
  322, // Juz 17
  342, // Juz 18
  362, // Juz 19
  382, // Juz 20
  402, // Juz 21
  422, // Juz 22
  442, // Juz 23
  462, // Juz 24
  482, // Juz 25
  502, // Juz 26
  522, // Juz 27
  542, // Juz 28
  562, // Juz 29
  582, // Juz 30
];

/**
 * Standard starting pages of each of the 60 Hizbs in the 604-page Madinah Mushaf
 */
export const HIZB_START_PAGES = [
  0,
  1,   11,  // Juz 1 -> Hizb 1, 2
  22,  32,  // Juz 2 -> Hizb 3, 4
  42,  52,  // Juz 3 -> Hizb 5, 6
  62,  72,  // Juz 4 -> Hizb 7, 8
  82,  92,  // Juz 5 -> Hizb 9, 10
  102, 111, // Juz 6 -> Hizb 11, 12
  121, 131, // Juz 7 -> Hizb 13, 14
  142, 151, // Juz 8 -> Hizb 15, 16
  162, 172, // Juz 9 -> Hizb 17, 18
  182, 192, // Juz 10 -> Hizb 19, 20
  201, 211, // Juz 11 -> Hizb 21, 22
  222, 231, // Juz 12 -> Hizb 23, 24
  242, 252, // Juz 13 -> Hizb 25, 26
  262, 272, // Juz 14 -> Hizb 27, 28
  282, 292, // Juz 15 -> Hizb 29, 30
  302, 312, // Juz 16 -> Hizb 31, 32
  322, 332, // Juz 17 -> Hizb 33, 34
  342, 352, // Juz 18 -> Hizb 35, 36
  362, 372, // Juz 19 -> Hizb 37, 38
  382, 392, // Juz 20 -> Hizb 39, 40
  402, 412, // Juz 21 -> Hizb 41, 42
  422, 431, // Juz 22 -> Hizb 43, 44
  442, 451, // Juz 23 -> Hizb 45, 46
  462, 471, // Juz 24 -> Hizb 47, 48
  482, 492, // Juz 25 -> Hizb 49, 50
  502, 512, // Juz 26 -> Hizb 51, 52
  522, 532, // Juz 27 -> Hizb 53, 54
  542, 553, // Juz 28 -> Hizb 55, 56
  562, 572, // Juz 29 -> Hizb 57, 58
  582, 592, // Juz 30 -> Hizb 59, 60
];

/**
 * Get accurate division info (Juz, Hizb, Rub') for any page in the Mushaf (1 to 604)
 */
export function getQuranDivisionByPage(pageNumber) {
  const page = Math.min(604, Math.max(1, Number(pageNumber) || 1));

  // 1. Determine Juz
  let juz = 1;
  for (let j = 1; j <= 30; j++) {
    if (page >= JUZ_START_PAGES[j]) {
      juz = j;
    } else {
      break;
    }
  }

  // 2. Determine Hizb
  let hizb = 1;
  for (let h = 1; h <= 60; h++) {
    if (page >= HIZB_START_PAGES[h]) {
      hizb = h;
    } else {
      break;
    }
  }

  // 3. Determine Rub' within Hizb (Each Hizb has 4 quarters, approx ~2.5 pages per quarter)
  const currentHizbStart = HIZB_START_PAGES[hizb];
  const nextHizbStart = hizb < 60 ? HIZB_START_PAGES[hizb + 1] : 605;
  const hizbTotalPages = Math.max(1, nextHizbStart - currentHizbStart);
  const pageOffset = page - currentHizbStart;

  // Fraction within the Hizb (0.0 to 1.0)
  const fraction = pageOffset / hizbTotalPages;
  let rubInHizb = 1;
  if (fraction >= 0.75) {
    rubInHizb = 4;
  } else if (fraction >= 0.50) {
    rubInHizb = 3;
  } else if (fraction >= 0.25) {
    rubInHizb = 2;
  } else {
    rubInHizb = 1;
  }

  const rubTotal = (hizb - 1) * 4 + rubInHizb;

  const rubName = RUB_NAMES[rubInHizb] || `الربع ${rubInHizb}`;
  const hizbOrdinal = ARABIC_ORDINALS[hizb] || String(hizb);
  const juzOrdinal = ARABIC_ORDINALS[juz] || String(juz);

  return {
    page,
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
    badgeText: `الجزء ${juz} • الحزب ${hizb} • الربع ${rubInHizb}`,
    fullArabicDescription: `${rubName} من الحزب ${hizbOrdinal} (الجزء ${juzOrdinal})`,
    shortDescription: `الربع ${rubInHizb} من الحزب ${hizb} • الجزء ${juz}`,
  };
}

/**
 * Get division info for a Surah number (uses its start page)
 */
export function getQuranDivisionBySurah(surahNumber) {
  const surah = SURAHS.find((s) => s.number === Number(surahNumber)) || SURAHS[0];
  return getQuranDivisionByPage(surah.startPage);
}
