export const RECITERS = [
  {
    id: 'husary',
    name: 'الشيخ محمود خليل الحصري (مرتل)',
    shortName: 'الحصري',
    ayahEdition: 'ar.husary',
    getSurahUrl: (surahNum) =>
      `https://download.quranicaudio.com/quran/mahmood_khaleel_al-husaree/${String(surahNum).padStart(3, '0')}.mp3`,
    getAyahUrl: (globalNum) =>
      `https://cdn.islamic.network/quran/audio/128/ar.husary/${globalNum}.mp3`,
  },
  {
    id: 'alafasy',
    name: 'الشيخ مشاري راشد العفاسي',
    shortName: 'العفاسي',
    ayahEdition: 'ar.alafasy',
    getSurahUrl: (surahNum) =>
      `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${surahNum}.mp3`,
    getAyahUrl: (globalNum) =>
      `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalNum}.mp3`,
  },
  {
    id: 'minshawi',
    name: 'الشيخ محمد صديق المنشاوي',
    shortName: 'المنشاوي',
    ayahEdition: 'ar.minshawi',
    getSurahUrl: (surahNum) =>
      `https://cdn.islamic.network/quran/audio-surah/128/ar.muhammadsiddiqalminshawimujawwad/${surahNum}.mp3`,
    getAyahUrl: (globalNum) =>
      `https://cdn.islamic.network/quran/audio/128/ar.minshawi/${globalNum}.mp3`,
  },
];


// Authentic Uthmani Calligraphy Typefaces optimized for reader eye comfort
export const UTHMANI_FONTS = [
  {
    id: 'hafs',
    name: 'مصحف حفص (عثماني أصيل)',
    shortName: 'حفص عثماني',
    fontFamily: "'Amiri Quran', 'Amiri', serif",
    description: 'الرسم العثماني الملكي المعتمد بمجمع الملك فهد لطباعة المصحف الشريف مع ضبط التشكيل وعلامات الوقف الدقيقة.',
  },
  {
    id: 'scheherazade',
    name: 'النسخ العثماني الميسر (Scheherazade)',
    shortName: 'نسخ ميسر',
    fontFamily: "'Scheherazade New', 'Amiri', serif",
    description: 'خط عثماني واسع ومريح جداً للعين ومصمم خصيصاً للقراءة المتواصلة دون إجهاد بصري.',
  },
  {
    id: 'naskh',
    name: 'النسخ القرآني فائق الوضوح (Noto Naskh)',
    shortName: 'نسخ واضح',
    fontFamily: "'Noto Naskh Arabic', serif",
    description: 'خط عربي حديث عالي الدقة والوضوح لجميع أحجام الشاشات وتسهيل قراءة الحركات.',
  },
  {
    id: 'amiri',
    name: 'الأميري المصحفي (Amiri Classic)',
    shortName: 'أميري كلاسيكي',
    fontFamily: "'Amiri', serif",
    description: 'الخط الطباعي المصري التراثي المأخوذ من مصحف الملك فؤاد التاريخي.',
  },
];

