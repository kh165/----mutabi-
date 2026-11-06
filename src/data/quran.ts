/**
 * Complete Quran Static Data (114 Surahs, 604 Pages, 30 Juz)
 * Bundled statically for offline and zero-external-dependency reliability.
 */

export interface Surah {
  number: number;
  name: string; // Arabic name
  englishName: string;
  ayahsCount: number;
  startPage: number;
  type: 'meccan' | 'medinan';
}

export const TOTAL_PAGES = 604;
export const TOTAL_JUZ = 30;
export const TOTAL_SURAHS = 114;

export const SURAHS: Surah[] = [
  { number: 1, name: "الفاتحة", englishName: "Al-Fatihah", ayahsCount: 7, startPage: 1, type: "meccan" },
  { number: 2, name: "البقرة", englishName: "Al-Baqarah", ayahsCount: 286, startPage: 2, type: "medinan" },
  { number: 3, name: "آل عمران", englishName: "Ali 'Imran", ayahsCount: 200, startPage: 50, type: "medinan" },
  { number: 4, name: "النساء", englishName: "An-Nisa", ayahsCount: 176, startPage: 77, type: "medinan" },
  { number: 5, name: "المائدة", englishName: "Al-Ma'idah", ayahsCount: 120, startPage: 106, type: "medinan" },
  { number: 6, name: "الأنعام", englishName: "Al-An'am", ayahsCount: 165, startPage: 128, type: "meccan" },
  { number: 7, name: "الأعراف", englishName: "Al-A'raf", ayahsCount: 206, startPage: 151, type: "meccan" },
  { number: 8, name: "الأنفال", englishName: "Al-Anfal", ayahsCount: 75, startPage: 177, type: "medinan" },
  { number: 9, name: "التوبة", englishName: "At-Tawbah", ayahsCount: 129, startPage: 187, type: "medinan" },
  { number: 10, name: "يونس", englishName: "Yunus", ayahsCount: 109, startPage: 208, type: "meccan" },
  { number: 11, name: "هود", englishName: "Hud", ayahsCount: 123, startPage: 221, type: "meccan" },
  { number: 12, name: "يوسف", englishName: "Yusuf", ayahsCount: 111, startPage: 235, type: "meccan" },
  { number: 13, name: "الرعد", englishName: "Ar-Ra'd", ayahsCount: 43, startPage: 249, type: "medinan" },
  { number: 14, name: "إبراهيم", englishName: "Ibrahim", ayahsCount: 52, startPage: 255, type: "meccan" },
  { number: 15, name: "الحجر", englishName: "Al-Hijr", ayahsCount: 99, startPage: 262, type: "meccan" },
  { number: 16, name: "النحل", englishName: "An-Nahl", ayahsCount: 128, startPage: 267, type: "meccan" },
  { number: 17, name: "الإسراء", englishName: "Al-Isra", ayahsCount: 111, startPage: 282, type: "meccan" },
  { number: 18, name: "الكهف", englishName: "Al-Kahf", ayahsCount: 110, startPage: 293, type: "meccan" },
  { number: 19, name: "مريم", englishName: "Maryam", ayahsCount: 98, startPage: 305, type: "meccan" },
  { number: 20, name: "طه", englishName: "Taha", ayahsCount: 135, startPage: 312, type: "meccan" },
  { number: 21, name: "الأنبياء", englishName: "Al-Anbiya", ayahsCount: 112, startPage: 322, type: "meccan" },
  { number: 22, name: "الحج", englishName: "Al-Hajj", ayahsCount: 78, startPage: 332, type: "medinan" },
  { number: 23, name: "المؤمنون", englishName: "Al-Mu'minun", ayahsCount: 118, startPage: 342, type: "meccan" },
  { number: 24, name: "النور", englishName: "An-Nur", ayahsCount: 64, startPage: 350, type: "medinan" },
  { number: 25, name: "الفرقان", englishName: "Al-Furqan", ayahsCount: 77, startPage: 359, type: "meccan" },
  { number: 26, name: "الشعراء", englishName: "Ash-Shu'ara", ayahsCount: 227, startPage: 367, type: "meccan" },
  { number: 27, name: "النمل", englishName: "An-Naml", ayahsCount: 93, startPage: 377, type: "meccan" },
  { number: 28, name: "القصص", englishName: "Al-Qasas", ayahsCount: 88, startPage: 385, type: "meccan" },
  { number: 29, name: "العنكبوت", englishName: "Al-'Ankabut", ayahsCount: 69, startPage: 396, type: "meccan" },
  { number: 30, name: "الروم", englishName: "Ar-Rum", ayahsCount: 60, startPage: 404, type: "meccan" },
  { number: 31, name: "لقمان", englishName: "Luqman", ayahsCount: 34, startPage: 411, type: "meccan" },
  { number: 32, name: "السجدة", englishName: "As-Sajdah", ayahsCount: 30, startPage: 415, type: "meccan" },
  { number: 33, name: "الأحزاب", englishName: "Al-Ahzab", ayahsCount: 73, startPage: 418, type: "medinan" },
  { number: 34, name: "سبأ", englishName: "Saba", ayahsCount: 54, startPage: 428, type: "meccan" },
  { number: 35, name: "فاطر", englishName: "Fatir", ayahsCount: 45, startPage: 434, type: "meccan" },
  { number: 36, name: "يس", englishName: "Ya-Sin", ayahsCount: 83, startPage: 440, type: "meccan" },
  { number: 37, name: "الصافات", englishName: "As-Saffat", ayahsCount: 182, startPage: 446, type: "meccan" },
  { number: 38, name: "ص", englishName: "Sad", ayahsCount: 88, startPage: 453, type: "meccan" },
  { number: 39, name: "الزمر", englishName: "Az-Zumar", ayahsCount: 75, startPage: 458, type: "meccan" },
  { number: 40, name: "غافر", englishName: "Ghafir", ayahsCount: 85, startPage: 467, type: "meccan" },
  { number: 41, name: "فصلت", englishName: "Fussilat", ayahsCount: 54, startPage: 477, type: "meccan" },
  { number: 42, name: "الشورى", englishName: "Ash-Shura", ayahsCount: 53, startPage: 483, type: "meccan" },
  { number: 43, name: "الزخرف", englishName: "Az-Zukhruf", ayahsCount: 89, startPage: 489, type: "meccan" },
  { number: 44, name: "الدخان", englishName: "Ad-Dukhan", ayahsCount: 59, startPage: 496, type: "meccan" },
  { number: 45, name: "الجاثية", englishName: "Al-Jathiyah", ayahsCount: 37, startPage: 499, type: "meccan" },
  { number: 46, name: "الأحقاف", englishName: "Al-Ahqaf", ayahsCount: 35, startPage: 502, type: "meccan" },
  { number: 47, name: "محمد", englishName: "Muhammad", ayahsCount: 38, startPage: 507, type: "medinan" },
  { number: 48, name: "الفتح", englishName: "Al-Fath", ayahsCount: 29, startPage: 511, type: "medinan" },
  { number: 49, name: "الحجرات", englishName: "Al-Hujurat", ayahsCount: 18, startPage: 515, type: "medinan" },
  { number: 50, name: "ق", englishName: "Qaf", ayahsCount: 45, startPage: 518, type: "meccan" },
  { number: 51, name: "الذاريات", englishName: "Adh-Dhariyat", ayahsCount: 60, startPage: 520, type: "meccan" },
  { number: 52, name: "الطور", englishName: "At-Tur", ayahsCount: 49, startPage: 523, type: "meccan" },
  { number: 53, name: "النجم", englishName: "An-Najm", ayahsCount: 62, startPage: 526, type: "meccan" },
  { number: 54, name: "القمر", englishName: "Al-Qamar", ayahsCount: 55, startPage: 528, type: "meccan" },
  { number: 55, name: "الرحمن", englishName: "Ar-Rahman", ayahsCount: 78, startPage: 531, type: "medinan" },
  { number: 56, name: "الواقعة", englishName: "Al-Waqi'ah", ayahsCount: 96, startPage: 534, type: "meccan" },
  { number: 57, name: "الحديد", englishName: "Al-Hadid", ayahsCount: 29, startPage: 537, type: "medinan" },
  { number: 58, name: "المجادلة", englishName: "Al-Mujadilah", ayahsCount: 22, startPage: 542, type: "medinan" },
  { number: 59, name: "الحشر", englishName: "Al-Hashr", ayahsCount: 24, startPage: 545, type: "medinan" },
  { number: 60, name: "الممتحنة", englishName: "Al-Mumtahanah", ayahsCount: 13, startPage: 549, type: "medinan" },
  { number: 61, name: "الصف", englishName: "As-Saff", ayahsCount: 14, startPage: 551, type: "medinan" },
  { number: 62, name: "الجمعة", englishName: "Al-Jumu'ah", ayahsCount: 11, startPage: 553, type: "medinan" },
  { number: 63, name: "المنافقون", englishName: "Al-Munafiqun", ayahsCount: 11, startPage: 554, type: "medinan" },
  { number: 64, name: "التغابن", englishName: "At-Taghabun", ayahsCount: 18, startPage: 556, type: "medinan" },
  { number: 65, name: "الطلاق", englishName: "At-Talaq", ayahsCount: 12, startPage: 558, type: "medinan" },
  { number: 66, name: "التحريم", englishName: "At-Tahrim", ayahsCount: 12, startPage: 560, type: "medinan" },
  { number: 67, name: "الملك", englishName: "Al-Mulk", ayahsCount: 30, startPage: 562, type: "meccan" },
  { number: 68, name: "القلم", englishName: "Al-Qalam", ayahsCount: 52, startPage: 564, type: "meccan" },
  { number: 69, name: "الحاقة", englishName: "Al-Haqqah", ayahsCount: 52, startPage: 566, type: "meccan" },
  { number: 70, name: "المعارج", englishName: "Al-Ma'arij", ayahsCount: 44, startPage: 568, type: "meccan" },
  { number: 71, name: "نوح", englishName: "Nuh", ayahsCount: 28, startPage: 570, type: "meccan" },
  { number: 72, name: "الجن", englishName: "Al-Jinn", ayahsCount: 28, startPage: 572, type: "meccan" },
  { number: 73, name: "المزمل", englishName: "Al-Muzzammil", ayahsCount: 20, startPage: 574, type: "meccan" },
  { number: 74, name: "المدثر", englishName: "Al-Muddaththir", ayahsCount: 56, startPage: 575, type: "meccan" },
  { number: 75, name: "القيامة", englishName: "Al-Qiyamah", ayahsCount: 40, startPage: 577, type: "meccan" },
  { number: 76, name: "الإنسان", englishName: "Al-Insan", ayahsCount: 31, startPage: 578, type: "medinan" },
  { number: 77, name: "المرسلات", englishName: "Al-Mursalat", ayahsCount: 50, startPage: 580, type: "meccan" },
  { number: 78, name: "النبأ", englishName: "An-Naba", ayahsCount: 40, startPage: 582, type: "meccan" },
  { number: 79, name: "النازعات", englishName: "An-Nazi'at", ayahsCount: 46, startPage: 583, type: "meccan" },
  { number: 80, name: "عبس", englishName: "'Abasa", ayahsCount: 42, startPage: 585, type: "meccan" },
  { number: 81, name: "التكوير", englishName: "At-Takwir", ayahsCount: 29, startPage: 586, type: "meccan" },
  { number: 82, name: "الانفطار", englishName: "Al-Infitar", ayahsCount: 19, startPage: 587, type: "meccan" },
  { number: 83, name: "المطففين", englishName: "Al-Mutaffifin", ayahsCount: 36, startPage: 587, type: "meccan" },
  { number: 84, name: "الانشقاق", englishName: "Al-Inshiqaq", ayahsCount: 25, startPage: 589, type: "meccan" },
  { number: 85, name: "البروج", englishName: "Al-Buruj", ayahsCount: 22, startPage: 590, type: "meccan" },
  { number: 86, name: "الطارق", englishName: "At-Tariq", ayahsCount: 17, startPage: 591, type: "meccan" },
  { number: 87, name: "الأعلى", englishName: "Al-A'la", ayahsCount: 19, startPage: 591, type: "meccan" },
  { number: 88, name: "الغاشية", englishName: "Al-Ghashiyah", ayahsCount: 26, startPage: 592, type: "meccan" },
  { number: 89, name: "الفجر", englishName: "Al-Fajr", ayahsCount: 30, startPage: 593, type: "meccan" },
  { number: 90, name: "البلد", englishName: "Al-Balad", ayahsCount: 20, startPage: 594, type: "meccan" },
  { number: 91, name: "الشمس", englishName: "Ash-Shams", ayahsCount: 15, startPage: 595, type: "meccan" },
  { number: 92, name: "الليل", englishName: "Al-Layl", ayahsCount: 21, startPage: 595, type: "meccan" },
  { number: 93, name: "الضحى", englishName: "Ad-Duha", ayahsCount: 11, startPage: 596, type: "meccan" },
  { number: 94, name: "الشرح", englishName: "Ash-Sharh", ayahsCount: 8, startPage: 596, type: "meccan" },
  { number: 95, name: "التين", englishName: "At-Tin", ayahsCount: 8, startPage: 597, type: "meccan" },
  { number: 96, name: "العلق", englishName: "Al-'Alaq", ayahsCount: 19, startPage: 597, type: "meccan" },
  { number: 97, name: "القدر", englishName: "Al-Qadr", ayahsCount: 5, startPage: 598, type: "meccan" },
  { number: 98, name: "البينة", englishName: "Al-Bayyinah", ayahsCount: 8, startPage: 598, type: "medinan" },
  { number: 99, name: "الزلزلة", englishName: "Az-Zalzalah", ayahsCount: 8, startPage: 599, type: "medinan" },
  { number: 100, name: "العاديات", englishName: "Al-'Adiyat", ayahsCount: 11, startPage: 599, type: "meccan" },
  { number: 101, name: "القارعة", englishName: "Al-Qari'ah", ayahsCount: 11, startPage: 600, type: "meccan" },
  { number: 102, name: "التكاثر", englishName: "At-Takathur", ayahsCount: 8, startPage: 600, type: "meccan" },
  { number: 103, name: "العصر", englishName: "Al-'Asr", ayahsCount: 3, startPage: 601, type: "meccan" },
  { number: 104, name: "الهمزة", englishName: "Al-Humazah", ayahsCount: 9, startPage: 601, type: "meccan" },
  { number: 105, name: "الفيل", englishName: "Al-Fil", ayahsCount: 5, startPage: 601, type: "meccan" },
  { number: 106, name: "قريش", englishName: "Quraysh", ayahsCount: 4, startPage: 602, type: "meccan" },
  { number: 107, name: "الماعون", englishName: "Al-Ma'un", ayahsCount: 7, startPage: 602, type: "meccan" },
  { number: 108, name: "الكوثر", englishName: "Al-Kawthar", ayahsCount: 3, startPage: 602, type: "meccan" },
  { number: 109, name: "الكافرون", englishName: "Al-Kafirun", ayahsCount: 6, startPage: 603, type: "meccan" },
  { number: 110, name: "النصر", englishName: "An-Nasr", ayahsCount: 3, startPage: 603, type: "medinan" },
  { number: 111, name: "المسد", englishName: "Al-Masad", ayahsCount: 5, startPage: 603, type: "meccan" },
  { number: 112, name: "الإخلاص", englishName: "Al-Ikhlas", ayahsCount: 4, startPage: 604, type: "meccan" },
  { number: 113, name: "الفلق", englishName: "Al-Falaq", ayahsCount: 5, startPage: 604, type: "meccan" },
  { number: 114, name: "الناس", englishName: "An-Nas", ayahsCount: 6, startPage: 604, type: "meccan" },
];

export function getSurah(number: number): Surah | undefined {
  return SURAHS.find(s => s.number === number);
}

export function validateAyahRange(surahNumber: number, fromAyah: number, toAyah: number): { valid: boolean; error?: string } {
  const surah = getSurah(surahNumber);
  if (!surah) {
    return { valid: false, error: 'السورة غير موجودة' };
  }
  if (fromAyah < 1) {
    return { valid: false, error: 'رقم الآية يبدأ من 1' };
  }
  if (toAyah > surah.ayahsCount) {
    return { valid: false, error: `سورة ${surah.name} تحوي ${surah.ayahsCount} آية فقط` };
  }
  if (fromAyah > toAyah) {
    return { valid: false, error: 'بداية الآيات يجب أن تسبق أو تساوي نهايتها' };
  }
  return { valid: true };
}
