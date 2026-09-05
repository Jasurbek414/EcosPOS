import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

// Brauzerning native <input type="date"> kalendar oynasi sahifaning o'zi emas,
// BRAUZER/OS tilini ishlatadi (Chrome'ning "lang" atributiga ham bog'liq emas) —
// shu sabab ilova tili o'zbekcha bo'lsa ham kalendar ruscha chiqib qolardi. Bu
// komponent to'liq o'zimiz chizadigan kalendar bo'lgani uchun oy/hafta kunlari
// nomlari doim joriy ilova tilidan (calendar.months/weekdaysShort) olinadi.

function toISODate(date) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
}

function parseISODate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function isSameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Oy panelidagi 6x7 kunlar to'rini quradi (dushanbadan boshlanadi, oldingi/keyingi
// oydan "xira" kunlar bilan to'ldiriladi) — bu ilovadagi boshqa joylardagi
// "dushanbadan boshlanadi" konvensiyasiga mos (qarang: ReportsPage.jsx startOfWeek).
function buildMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // 0=dushanba
  const start = new Date(year, month, 1 - firstWeekday);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/**
 * Sanani tanlash uchun to'liq o'zimiz chizgan (native <input type="date"> emas)
 * kalendar — dizayni ilovaning umumiy .card/.input-field uslubiga mos, tili
 * har doim joriy i18n tiliga bog'liq (brauzer/OS tiliga qaramasdan).
 * `value`/`onChange` ISO ("YYYY-MM-DD") satr sifatida ishlaydi — native date
 * input bilan bir xil shartnoma, shuning uchun chaqiruvchi joylarda deyarli
 * hech narsa o'zgarmaydi.
 */
export default function DateInput({ value, onChange, min, max, className = '', placeholder }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selected = parseISODate(value);
  const minDate = parseISODate(min);
  const maxDate = parseISODate(max);

  const [viewDate, setViewDate] = useState(() => selected || new Date());

  // Panelni ochish tugmasi bosilganda tanlangan (yoki bugungi) oyga qaytaramiz —
  // useEffect emas, chunki bu faqat foydalanuvchi harakatiga bevosita javob
  // (effekt ichida setState chaqirish keraksiz qayta-render zanjiriga olib keladi).
  const toggleOpen = () => {
    setOpen((prevOpen) => {
      const next = !prevOpen;
      if (next) setViewDate(selected || new Date());
      return next;
    });
  };

  const months = t('calendar.months', { returnObjects: true });
  const weekdays = t('calendar.weekdaysShort', { returnObjects: true });

  const isDisabled = (d) => (minDate && d < minDate) || (maxDate && d > maxDate);

  const handlePick = (d) => {
    if (isDisabled(d)) return;
    onChange(toISODate(d));
    setOpen(false);
  };

  const goToday = () => {
    const now = new Date();
    // isDisabled min/max bilan to'g'ridan-to'g'ri solishtiradi — `now` esa soat/daqiqa
    // ham o'z ichiga oladi, shuning uchun `max` aynan "bugun"ga teng bo'lsa, vaqt
    // qismi tufayli noto'g'ri "band" deb hisoblanishi mumkin edi. Faqat sanani (kun
    // boshi) solishtiramiz.
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (isDisabled(today)) return;
    onChange(toISODate(today));
    setOpen(false);
  };

  const grid = buildMonthGrid(viewDate.getFullYear(), viewDate.getMonth());

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggleOpen}
        className={`input-field flex items-center justify-between gap-2 text-left cursor-pointer ${className}`}
      >
        <span className={value ? '' : 'text-slate-400 dark:text-slate-500'}>
          {selected ? selected.toLocaleDateString('uz-UZ') : placeholder || t('calendar.placeholder')}
        </span>
        <Calendar size={15} className="text-slate-400 dark:text-slate-500 shrink-0" />
      </button>

      {open && (
        <>
          {/* Ko'rinmas backdrop — tashqariga bosilganda yopish uchun (modal-overlay'dagi
              bilan bir xil naqsh, lekin qorong'ilashtirmaydi, chunki bu dropdown, modal emas). */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1.5 p-3 w-72 card shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                className="btn-icon"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {months[viewDate.getMonth()]} {viewDate.getFullYear()}
              </span>
              <button
                type="button"
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                className="btn-icon"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {weekdays.map((w) => (
                <div key={w} className="text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500 py-1">
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {grid.map((d) => {
                const inMonth = d.getMonth() === viewDate.getMonth();
                const disabled = isDisabled(d);
                const isSelected = isSameDay(d, selected);
                const isToday = isSameDay(d, new Date());
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    disabled={disabled}
                    onClick={() => handlePick(d)}
                    className={`text-xs h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold'
                        : disabled
                          ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                          : inMonth
                            ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                            : 'text-slate-300 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                    } ${isToday && !isSelected ? 'ring-1 ring-inset ring-slate-300 dark:ring-slate-600' : ''}`}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-700 mt-3 pt-2.5 flex justify-center">
              <button type="button" onClick={goToday} className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer">
                {t('calendar.today')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
