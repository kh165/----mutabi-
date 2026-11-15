# سجل التغييرات

## ما تم

- حذف تكرار تنبيه مواقيت الصلاة، ونقل ثوابت قارئ القرآن وإنشاء وحدات hooks/components مخصصة له.
- إضافة fallback محلي لمواقيت الصلاة باستخدام `adhan`، ومصدر بديل لنص القرآن، ورسائل أوفلاين مميزة للأحاديث.
- إضافة Vitest وبيئة `jsdom` واختبارات للمنطق الأساسي، مع سكربتات الاختبار والبناء.
- تنظيف dependencies وتحديث اسم المشروع والـ README و`.env.example`.
- إضافة ESLint flat config وJSDoc و`typecheck` وGitHub Actions CI.
- إضافة تسجيل FCM متعدد الأجهزة في `users/{uid}/fcmTokens/{tokenHash}`، وservice-worker background handler، وCloud Function مجدولة تمنع التكرار عبر `notificationLog` وتحذف التوكنات غير الصالحة.
- إضافة قواعد Firestore للمالك فقط على `fcmTokens` ومنع وصول العملاء إلى `notificationLog`.

## ما لم يتم أو يحتاج إعداداً يدوياً

- يحتاج FCM إلى تفعيل Cloud Messaging وإنشاء Web Push certificate (VAPID) في مشروع Firebase، ثم ضبط `VITE_FIREBASE_VAPID_KEY` في بيئة البناء.
- نشر `functions/` يحتاج Firebase CLI، تسجيل الدخول، ربط المشروع الصحيح، وخطة Blaze: `firebase deploy --only functions,firestore:rules,firestore:indexes`.
- يتطلب إرسال الإشعارات المجدولة أن تكون إعدادات الإشعارات والموقع والمنطقة الزمنية محفوظة للمستخدم، وأن يسمح المتصفح بالإشعارات.
- typecheck يفحص JavaScript الموجود مسبقاً مع `checkJs: true`؛ توجد أخطاء أنواع legacy موثقة في مخرجات الفحص ولم أغيّر منطق Firebase أو المحتوى الديني لمعالجتها عشوائياً.
- الاختبارات الحالية تغطي المنطق الحرج الأساسي. اختبارات `offlineSync` وواجهة FCM/Functions التكاملية تحتاج Firebase Emulator لأنها تعتمد على Browser APIs وFirestore الحقيقيين.

## مخاطر وقرارات

- أبقيت `vite-plugin-pwa` على `generateSW` واستخدمت `importScripts` لإضافة FCM حفاظاً على أسماء runtime caches الحالية؛ التحويل الكامل إلى `injectManifest` يتطلب إعادة دمج إعدادات Workbox الحالية واختبار دورة تحديث PWA على أجهزة فعلية.
- fallback المحلي لمواقيت الصلاة يحافظ على شكل الإخراج `{fajr,dhuhr,asr,maghrib,isha}`؛ لا يضيف حقلاً يغيّر شكل البيانات الحالي.
- Cloud Function تعتمد على `notifications.enabled` و`notifications.{prayer}.enabled` وتتعامل مع توقيت المستخدم، بينما إعدادات الأذكار المحفوظة تحتاج توسيعاً لاحقاً إذا أريد إرسالها من الخادم وفق مخطط بيانات موحد.
