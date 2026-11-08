# نقل بيانات مُتابِع من Realtime Database إلى Cloud Firestore

هذه أداة استيراد لمرة واحدة، مبنية على ملف JSON الذي أرسلته.

## ما الذي ستفعله؟

- تستورد بيانات ملف `rtdb-export.json` إلى قاعدة Firestore الافتراضية في مشروع `mutabi-acb51`.
- تحافظ على مفاتيح السجلات كمعرّفات Documents.
- تحتفظ ببيانات `activities` بما فيها `items` و`subItems` داخل مستند النشاط كما هي.
- تنقل تقدم الأذكار إلى مسار قابل للتوسع: `adhkarProgress/{uid}/days/{date}`.
- تتخطى أي Document موجود مسبقًا افتراضيًا.
- لا تحذف ولا تعدّل أي بيانات في Realtime Database.
- لا تغيّر ملفات التطبيق أو Firebase Rules أو Indexes.

## 1) جهّز الملفات

ضع الملفات التالية في مجلد `firestore-migration`:

- `rtdb-export.json` — نسخة JSON المصدّرة من Realtime Database.
- `serviceAccountKey.json` — مفتاح Service Account الخاص بمشروع `mutabi-acb51`.

لا ترفع هذين الملفين إلى GitHub أو ترسلهما لأي شخص. يحتوي تصدير قاعدة البيانات على معلومات حسابات وبيانات مستخدمين.

## 2) جهّز مفتاح Service Account

من Firebase Console افتح:

Project settings → Service accounts → Generate new private key

تأكد أن المفتاح تابع للمشروع `mutabi-acb51`، واحفظه باسم `serviceAccountKey.json` داخل هذا المجلد.

## 3) نفّذ الفحص التجريبي أولًا

افتح PowerShell داخل هذا المجلد ونفّذ:

```powershell
npm install
node .\import-rtdb-to-firestore.cjs --dry-run
```

هذا الأمر يفحص ملف JSON ويعرض عدد المستندات ومساراتها، ولا يكتب شيئًا إلى Firestore.

## 4) ابدأ الاستيراد

بعد مراجعة نتيجة الفحص:

```powershell
node .\import-rtdb-to-firestore.cjs --apply
```

المستندات الموجودة مسبقًا سيتم تخطيها. لن يستبدلها السكريبت.

لا تستخدم `--overwrite` إلا إذا كنت تقصد استبدال المستندات الموجودة بنفس المسارات والـ IDs:

```powershell
node .\import-rtdb-to-firestore.cjs --apply --overwrite
```

## 5) بعد نجاح النقل

- راجع Collections في Firestore Console.
- اختبر قراءة وكتابة التطبيق بعد تعديل كود التطبيق لاستخدام Firestore.
- احتفظ بنسخة JSON الأصلية في مكان آمن.
- احذف `serviceAccountKey.json` من مجلد العمل بعد انتهاء النقل، أو خزّنه خارج مجلد المشروع.

## ملاحظات مهمة

- هذا ينقل مستندات البيانات الموجودة في ملف JSON فقط. لا ينقل كلمات مرور أو حسابات Firebase Authentication؛ ملف Realtime Database يحتوي على بيانات ملف المستخدم فقط.
- استخدام Admin SDK يحتاج مفتاحًا سريًا ويمنح صلاحيات مرتفعة. لا تضعه في `src` أو `public` ولا تستخدمه داخل المتصفح.
- قواعد Firestore لا تتحول تلقائيًا من قواعد Realtime Database؛ راجع `firestore.rules` لتقييد الوصول إلى بيانات المستخدمين.
- الاستيراد لا يحوّل كود التطبيق تلقائيًا من `firebase/database` إلى `firebase/firestore`.
