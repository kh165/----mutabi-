// ينتظر الوعد، لكن لو الشبكة معلّقة (أوفلاين فعلي) يرجّع 'pending' بدل ما يعلّق الواجهة.
// الأخطاء الحقيقية (مثل permission-denied) تتعامل كالمعتاد.
export function settleOrTimeout(promise, ms = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve('pending'), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); }
    );
  });
}

// يرفض بعد مهلة (يستخدم للقراءات)
export function withTimeout(promise, ms = 6000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const err = new Error('timeout');
      err.code = 'timeout';
      reject(err);
    }, ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); }
    );
  });
}