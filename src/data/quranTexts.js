import { getSurah } from './quran.js';

/**
 * Quran text and Tafseer accessors.
 * Quran verses are loaded through the Quran Foundation client, which provides
 * caching and a local verified-text fallback.
 */

import { getChapterVerses } from '../lib/quranFoundationApi.js';

/**
 * جلب آيات السورة الكريمة كاملة بالرسم العثماني المعتمد من Quran Foundation API الرسمي
 *
 * @param {number|string} surahNumber رقم السورة من 1 إلى 114
 * @returns {Promise<{number: number, name: string, englishName: string, revelationType: string, ayahsCount: number, bismillahPre: boolean, bismillahText: string|null, ayahs: Array<{number: number, text: string}>}>}
 */
export async function getSurahAyahs(surahNumber) {
  return getChapterVerses(surahNumber);
}

// Pre-bundled Authentic Tafseer Al-Muyassar (مجمع الملك فهد لطباعة المصحف الشريف) for instant 0ms offline access
export const AUTHENTIC_TAFSEER_SURAHS = {
  1: {
    1: 'أبتدئ قراءة القرآن باسم الله مستعينا به، (اللهِ) علم على الرب -تبارك وتعالى- المعبود بحق دون سواه، وهو أخص أسماء الله تعالى، ولا يسمى به غيره سبحانه. (الرَّحْمَنِ) ذي الرحمة العامة الذي وسعت رحمته جميع الخلق، (الرَّحِيمِ) بالمؤمنين، وهما اسمان من أسمائه تعالى، يتضمنان إثبات صفة الرحمة لله تعالى كما يليق بجلاله.',
    2: 'الثناء الكامل المطلق لله تعالى وحده، المستحق للحمد والشكر بما أسدى من النعم الظاهرة والباطنة الدينية والدنيوية، وهو المربي لجميع خلقه بتدبيره وتصريفه ورعايته.',
    3: '(الرَّحْمَنِ) ذي الرحمة الواسعة العظيمة التي وسعت كل شيء، (الرَّحِيمِ) بعباده المؤمنين.',
    4: 'وهو سبحانه وتعالى المالك الوحيد المتصرف بيوم الجزاء والحساب، وهو يوم القيامة، وتخصيص الملك بيوم الدين؛ لأنه لا يدَّعي أحد في ذلك اليوم ملكًا أو حكمًا، فكل الخلق خاضعون لعظمته وجبروته.',
    5: 'نخصك وحدك بالعبادة، ونستعين بك وحدك في جميع أمورنا؛ فالأمر كله بيدك لا يملك منه أحد مثقال ذرة.',
    6: 'دُلَّنا وأرشدنا، ووفقنا وثبتنا على الطريق المستقيم الواضح الموصل إلى رضاك وجنتك، وهو الإسلام الذي بعثت به رسلك وأنزلت به كتبك.',
    7: 'طريق الذين أنعمت عليهم من النبيين والصدِّيقين والشهداء والصالحين، غير طريق المغضوب عليهم الذين عرفوا الحق فلم يعملوا به كاليهود، وغير طريق الضالين الذين لم يهتدوا إلى الحق لجهلهم وضلالهم كالنصارى.'
  },
  112: {
    1: 'قل -أيها الرسول-: هو الله المتفرد بالألوهية والربوبية والأسماء والصفات، لا يشاركه أحد فيها.',
    2: 'الله المقصود وحده في الحوائج والرغائب، المستغني عن كل خلقه، والمفتقر إليه كل من سواه.',
    3: 'ليس له ولد، ولم يولد من أحد، فليس له مثيل ولا شبيه ولا نظير.',
    4: 'ولم يكن له مماثل أو مساوٍ أو شبيه في أسمائه وصفاته وأفعاله سبحانه وتعالى.'
  },
  113: {
    1: 'قل -أيها الرسول-: أعوذ وأعتصم برب الصبح وفالقه بعد ظلمة الليل.',
    2: 'من شر جميع مخلوقات الله تعالى وإيذائها وأضرارها.',
    3: 'ومن شر ليل شديد الظلام إذا دخل وظلمته وما ينتشر فيه من الشرور والسباع واللصوص.',
    4: 'ومن شر السواحر اللاتي ينفثن في عقد السحر للإضرار بالناس والتفريق بينهم.',
    5: 'ومن شر حاسد مبغض للنعمة إذا حسد الناس على ما آتاهم الله من فضله وتمنى زوالها عنهم وسعى في ذلك.'
  },
  114: {
    1: 'قل -أيها الرسول-: أعوذ وأعتصم برب الناس وخالقهم ومدبر أمورهم ومربيهم بنعمه.',
    2: 'ملك الناس المتصرف فيهم بسلطانه وقضائه وقدره، الذي لا ملك غيره بحق.',
    3: 'إله الناس ومعبودهم الحق، الذي لا معبود سواه ولا يستحق العبادة إلا هو.',
    4: 'من شر الشيطان الذي يلقي وسوسته عند الغفلة، ويخنس ويتأخر ويختفي عند ذكر الله تعالى.',
    5: 'الذي يبث الشر والشكوك والشبهات والشهوات في صدور الناس وقلوبهم.',
    6: 'من شياطين الإنس والجن الذين يوسوسون للناس بالشر ويدعونهم إلى الباطل.'
  },
  108: {
    1: 'إنا أعطيناك -أيها الرسول- الخير الكثير في الدنيا والآخرة، ومنه نهر الكوثر العظيم في الجنة الذي حافتاه قباب اللؤلؤ المجوف وترابه المسك.',
    2: 'فأخلص لربك صلاتك كلها، واذبح ذبيحتك له وحده شكرًا على ما أنعم به عليك، خلافًا لما يفعله المشركون من الصلاة والذبح لأوثانهم.',
    3: 'إن مبغضك وشانئك ومبغض ما جئت به من الهدى والنور هو المقطوع أثره وذكره من كل خير.'
  },
  103: {
    1: 'أقسم الله تعالى بالدهر والزمان لما فيه من العبر والدلالات على قدرة الخالق وحكمته وتصريفه للأمور.',
    2: 'إن كل إنسان لفي خسران ونقصان وهلاك في تجارته وسعيه في هذه الدنيا.',
    3: 'إلا الذين آمنوا بالله ورسله، وعملوا الصالحات، وتواصوا بالحق من الإيمان والعمل بطاعة الله، وتواصوا بالصبر على طاعة الله وعن معصيته وعلى أقداره المؤلمة.'
  }
};

async function fetchTafseerJson(url) {
  const cache = typeof caches !== 'undefined' ? await caches.open('quran-text-cache') : null;
  const cachedResponse = await cache?.match(url);
  if (cachedResponse) return cachedResponse.json();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);
  let response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response.ok) throw new Error(`Tafseer request failed with HTTP ${response.status}.`);
  if (cache) {
    try {
      await cache.put(url, response.clone());
    } catch (cacheError) {
      console.warn('Could not cache Quran tafseer:', cacheError);
    }
  }
  return response.json();
}

/**
 * جلب تفسير ميسر للسورة الكريمة مع التخزين المحلي الفوري والمرايا الاحتياطية الموثوقة
 */
export async function getSurahTafseer(surahNumber) {
  const surahNum = Number(surahNumber);
  const surah = getSurah(surahNum);
  if (!surah) {
    throw new Error('رقم السورة غير صالح.');
  }

  // 1. Check pre-bundled text when it contains every verse in the chapter.
  const bundledTafseer = AUTHENTIC_TAFSEER_SURAHS[surahNum];
  if (bundledTafseer && Object.keys(bundledTafseer).length >= surah.ayahsCount) {
    return bundledTafseer;
  }

  // 2. Check persistent localStorage cache
  const cacheKey = `mutabi_tafseer_arabic_moyassar_v1_${surahNum}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const saved = JSON.parse(cached);
      if (saved && typeof saved === 'object' && Object.keys(saved).length >= surah.ayahsCount) {
        return saved;
      }
      localStorage.removeItem(cacheKey);
    }
  } catch (error) {
    console.warn('Could not read cached tafsir:', error);
  }

  // 3. Primary Mirror: QuranEnc official Arabic Al-Muyassar API
  try {
    const data = await fetchTafseerJson(
      `https://quranenc.com/api/v1/translation/sura/arabic_moyassar/${surahNum}`,
    );
    if (Array.isArray(data?.result) && data.result.length > 0) {
      const map = {};
      for (const verse of data.result) {
        const ayaNum = Number(verse.aya);
        if (Number.isInteger(ayaNum) && verse.translation) {
          map[ayaNum] = String(verse.translation).trim();
        }
      }
      if (Object.keys(map).length > 0) return map;
    }
  } catch (err) {
    console.warn('Primary Tafseer mirror failed, trying secondary mirror:', err);
  }

  // 4. Secondary Mirror: Al-Quran Cloud verified Arabic Al-Muyassar
  try {
    const json = await fetchTafseerJson(
      `https://api.alquran.cloud/v1/surah/${surahNum}/ar.muyassar`,
    );
    if (Array.isArray(json?.data?.ayahs) && json.data.ayahs.length > 0) {
      const map = {};
      for (const item of json.data.ayahs) {
        const ayaNum = Number(item.numberInSurah);
        if (Number.isInteger(ayaNum) && item.text) {
          map[ayaNum] = String(item.text).trim();
        }
      }
      if (Object.keys(map).length > 0) return map;
    }
  } catch (err) {
    console.warn('Secondary Tafseer mirror failed:', err);
  }

  if (bundledTafseer) return bundledTafseer;
  throw new Error(`تعذر تحميل تفسير سورة ${surah.name}، ولا توجد نسخة محفوظة للعمل دون اتصال.`);
}
