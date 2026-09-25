import { Component } from 'react';

/**
 * React xatolarini ushlaydi va oq ekran o'rniga tushunarli xabar ko'rsatadi.
 *
 * 2026-09-13 auditida aniqlandiki, Sidebar'dagi bitta yo'qolgan import butun
 * ilovani oq ekranga aylantirgan va foydalanuvchi hech qanday xabar ko'rmagan.
 * Bu chegara shunday nosozlikni lokal holatga keltiradi.
 *
 * DIQQAT: error boundary faqat klass komponent sifatida ishlaydi — React'da
 * bunga mos hook hali yo'q.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Brauzer konsolida to'liq stek qolishi kerak — aks holda nosozlikni
    // keyinchalik tekshirib bo'lmaydi.
    console.error('UI xatosi:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
        <div className="card max-w-md w-full p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
            <span className="text-2xl font-bold text-red-600 dark:text-red-400" aria-hidden="true">!</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Kutilmagan xatolik yuz berdi
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
              Sahifani yangilab ko'ring. Xato takrorlansa, quyidagi texnik ma'lumotni
              dasturchiga yuboring.
            </p>
          </div>
          <pre className="w-full text-left text-[11px] font-mono bg-slate-100 dark:bg-slate-800 rounded-lg p-3 overflow-x-auto text-slate-600 dark:text-slate-300">
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button type="button" onClick={() => window.location.reload()} className="btn btn-primary">
            Sahifani yangilash
          </button>
        </div>
      </div>
    );
  }
}
