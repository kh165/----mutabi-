import React from 'react';

export class AdminErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Admin dashboard failed to render:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <section
          role="alert"
          className="rounded-3xl border border-rose-200 bg-white p-6 text-right shadow-sm dark:border-rose-900 dark:bg-slate-900"
        >
          <h2 className="font-black text-rose-700 dark:text-rose-300">
            تعذر تحميل لوحة الإدارة
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            واجهت لوحة الإدارة خطأ غير متوقع. بقية الموقع ما زالت متاحة.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            إعادة المحاولة
          </button>
        </section>
      );
    }

    return this.props.children;
  }
}
