import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Plus, Receipt, Trash2, X, FileSpreadsheet, Layers, TrendingDown, Tag } from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { useExpenseCategories } from '../../hooks/useExpenseCategories';
import { expenseService } from '../../services/api';
import DateInput from '../../components/ui/DateInput';
import AccountingTabs from './AccountingTabs';

// AccountingPage.jsx'dagi bilan bir xil sana yordamchilari — alohida umumiy util
// fayl yo'q bo'lgani uchun har bir sahifada shu tarzda takrorlanadi (konvensiya).
const toISODate = (d) => {
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
};

const startOfWeek = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - diff);
  return date;
};

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

function CreateExpenseModal({ isOwner, userBranchId, categories, onClose, onCreated }) {
  const { t } = useTranslation();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      category: categories[0]?.code || '',
      amount: '',
      expenseDate: toISODate(new Date()),
      description: '',
    },
  });

  const onSubmit = async (data) => {
    try {
      const payload = {
        branchId: isOwner ? null : userBranchId ?? null,
        category: data.category,
        amount: Number(data.amount),
        description: data.description || null,
        expenseDate: data.expenseDate,
      };
      await expenseService.create(payload);
      toast.success(t('expenses.createSuccess'));
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.message || t('expenses.createError'));
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">{t('expenses.newExpense')}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-4">
          <div>
            <label className="field-label">{t('expenses.category')}</label>
            <select className="input-field" {...register('category', { required: true })}>
              {categories
                .filter((c) => c.isActive)
                .map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.name}
                  </option>
                ))}
            </select>
            {errors.category && <p className="field-error">{t('common.required')}</p>}
          </div>
          <div>
            <label className="field-label">{t('expenses.amount')}</label>
            <input
              type="number"
              step="0.01"
              className="input-field"
              placeholder="0"
              autoFocus
              {...register('amount', { required: true, min: 0.01, valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="field-error">{errors.amount.type === 'min' ? t('common.mustBePositive') : t('common.required')}</p>
            )}
          </div>
          <div>
            <label className="field-label">{t('expenses.date')}</label>
            <Controller
              name="expenseDate"
              control={control}
              render={({ field }) => <DateInput value={field.value} onChange={field.onChange} max={toISODate(new Date())} />}
            />
          </div>
          <div>
            <label className="field-label">{t('expenses.description')}</label>
            <input type="text" className="input-field" placeholder={t('expenses.descriptionPlaceholder')} {...register('description')} />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={onClose} className="btn btn-outline">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const { t } = useTranslation();
  const { user, isOwner } = useTenantAuthContext();
  const { categories, categoryLabel, loading: categoriesLoading } = useExpenseCategories();

  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return toISODate(d);
  });
  const [to, setTo] = useState(() => toISODate(new Date()));

  const [activeRange, setActiveRange] = useState('last30');
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const daysDiff = useMemo(() => {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return Math.max(1, Math.round((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1);
  }, [from, to]);

  const buildParams = useCallback(() => {
    return { from, to };
  }, [from, to]);

  // Diqqat: `loading` filtr o'zgarganda qaytadan `true`ga o'rnatilmaydi (faqat dastlabki
  // useState(true)'dan boshlanadi) — effekt tanasida sinxron setState chaqirish React
  // Compiler'ning set-state-in-effect qoidasini buzadi (ProductsPage.jsx'dagi filtr
  // effekti bilan bir xil konvensiya: ro'yxat jimgina yangi ma'lumot bilan almashadi).
  useEffect(() => {
    let cancelled = false;
    expenseService
      .list(buildParams())
      .then((res) => {
        if (!cancelled) setExpenses(res.data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('expenses.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [buildParams, t]);

  const reload = useCallback(async () => {
    try {
      const res = await expenseService.list(buildParams());
      setExpenses(res.data);
    } catch {
      toast.error(t('expenses.loadError'));
    }
  }, [buildParams, t]);

  const handleCreated = () => {
    setCreateOpen(false);
    reload();
  };

  const handleDelete = async (expense) => {
    if (!window.confirm(t('expenses.confirmDelete'))) return;
    try {
      await expenseService.remove(expense.id);
      toast.success(t('expenses.deleteSuccess'));
      reload();
    } catch (err) {
      // Backend'ning aniq huquq matritsasi mijoz tomonida takrorlanmaydi — MANAGER
      // o'ziga tegishli bo'lmagan filialning xarajatini o'chirishga urinsa, server
      // 403 qaytaradi va shu xabar to'g'ridan-to'g'ri ko'rsatiladi.
      toast.error(err.response?.data?.message || t('expenses.deleteError'));
    }
  };

  const setQuickRange = (range) => {
    setActiveRange(range);
    const now = new Date();
    if (range === 'today') {
      setFrom(toISODate(now));
      setTo(toISODate(now));
    } else if (range === 'week') {
      setFrom(toISODate(startOfWeek(now)));
      setTo(toISODate(now));
    } else if (range === 'month') {
      setFrom(toISODate(startOfMonth(now)));
      setTo(toISODate(now));
    } else if (range === 'last30') {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      setFrom(toISODate(d));
      setTo(toISODate(now));
    }
  };

  const quickRanges = [
    { key: 'today', label: t('reports.today') },
    { key: 'week', label: t('reports.thisWeek') },
    { key: 'month', label: t('reports.thisMonth') },
    { key: 'last30', label: t('reports.last30Days') },
  ];

  const money = (v) => `${Number(v ?? 0).toLocaleString('uz-UZ')} ${t('reports.currency')}`;
  const dateLabel = (v) => (v ? new Date(v).toLocaleDateString('uz-UZ') : '—');

  const total = useMemo(() => expenses.reduce((sum, e) => sum + Number(e.amount ?? 0), 0), [expenses]);

  const topCategory = useMemo(() => {
    if (!expenses || expenses.length === 0) return null;
    const catMap = {};
    expenses.forEach((e) => {
      const cat = e.category || 'OTHER';
      catMap[cat] = (catMap[cat] || 0) + Number(e.amount || 0);
    });
    const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return null;
    return { code: sorted[0][0], amount: sorted[0][1] };
  }, [expenses]);

  const exportExpensesToCSV = () => {
    try {
      const bom = '\uFEFF';
      let csv = bom;
      csv += `"KORXONA OPERATSION XARAJATLARI (BUXGALTERIYA)"\n`;
      csv += `"Davr:";"${from} dan ${to} gacha (${daysDiff} kun)"\n`;
      csv += `"Jami xarajat summasi:";"${total}"\n`;
      csv += `"Yaratilgan sana:";"${new Date().toLocaleString('uz-UZ')}"\n\n`;

      csv += `"№";"Sana";"Toifa";"Summa (so'm)";"Izoh"\n`;
      expenses.forEach((e, idx) => {
        const catName = categoryLabel(e.category);
        const descClean = (e.description || '').replace(/"/g, '""');
        csv += `"${idx + 1}";"${e.expenseDate}";"${catName}";"${e.amount}";"${descClean}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Xarajatlar_${from}_${to}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Xarajatlar ro'yxati Excel fayli yuklab olindi");
    } catch {
      toast.error("Faylni yuklab bo'lmadi");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <AccountingTabs />

      {/* 1. SAHIFA SARLAVHASI VA HARAKATLAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Receipt size={20} />
            </div>
            {t('expenses.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('expenses.subtitle')}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Excel yuklab olish */}
          <button
            type="button"
            onClick={exportExpensesToCSV}
            disabled={expenses.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
            title="Excel formatida yuklab olish"
          >
            <FileSpreadsheet size={14} />
            <span>Excel yuklab olish</span>
          </button>

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            disabled={categoriesLoading || categories.filter((c) => c.isActive).length === 0}
            title={
              categoriesLoading
                ? t('common.loading')
                : categories.filter((c) => c.isActive).length === 0
                  ? t('expenses.noActiveCategoriesHint')
                  : undefined
            }
            className="btn btn-primary !text-xs !py-2 !px-3.5 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus size={15} />
            <span>{t('expenses.newExpense')}</span>
          </button>
        </div>
      </div>

      {/* 2. SANA VA DAVRNI TANLASH PANELI */}
      <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          {quickRanges.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setQuickRange(r.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeRange === r.key
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">{t('reports.from')}:</span>
            <DateInput
              value={from}
              max={to}
              onChange={(val) => {
                setFrom(val);
                setActiveRange('');
              }}
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">{t('reports.to')}:</span>
            <DateInput
              value={to}
              min={from}
              onChange={(val) => {
                setTo(val);
                setActiveRange('');
              }}
            />
          </div>
          <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
            {daysDiff} {t('reports.daysCount', 'kunlik davr')}
          </span>
        </div>
      </div>

      {/* 3. 3 TA KPI SUMMARY CARD */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1) Jami xarajat */}
        <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t('expenses.totalTitle')}
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Receipt size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
            {money(total)}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
            <span>Operatsion va ma'muriy sarflar</span>
          </div>
        </div>

        {/* 2) Xarajatlar soni */}
        <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Xarajatlar soni
            </span>
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
              <Layers size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {expenses.length}
            </p>
            <span className="text-xs text-slate-400 font-medium">ta operatsiya</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
            <span>Davr ichidagi cheklar</span>
          </div>
        </div>

        {/* 3) Eng katta xarajat toifasi */}
        <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Eng yirik xarajat toifasi
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Tag size={18} />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
            {topCategory ? categoryLabel(topCategory.code) : '—'}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2 truncate">
            {topCategory ? (
              <span className="font-semibold text-rose-600 dark:text-rose-400">{money(topCategory.amount)}</span>
            ) : (
              <span>Ma'lumot yo'q</span>
            )}
          </div>
        </div>
      </div>

      {/* 4. XARAJATLAR RO'YXATI JADVALI */}
      <div className="card p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Receipt size={18} className="text-rose-600 dark:text-rose-400" />
              Barcha qayd etilgan xarajatlar
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Davr bo'yicha filial yoki kompaniya sarf-xarajatlari tafsiloti
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {expenses.length} ta yozuv
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
            <Receipt size={24} className="animate-spin text-rose-500" />
            <span>{t('common.loading')}</span>
          </div>
        ) : expenses.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <Receipt size={26} />
            </div>
            <p className="text-sm font-medium">{t('expenses.empty')}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3 w-28">{t('expenses.date')}</th>
                  <th className="py-2.5 px-3">{t('expenses.category')}</th>
                  <th className="py-2.5 px-3 text-right">{t('expenses.amount')}</th>
                  <th className="py-2.5 px-3">{t('expenses.description')}</th>
                  <th className="py-2.5 px-3 text-center w-16">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{dateLabel(e.expenseDate)}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40">
                        {categoryLabel(e.category)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {money(e.amount)}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{e.description || '—'}</td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDelete(e)}
                        className="btn-icon danger !w-7 !h-7 inline-flex items-center justify-center cursor-pointer"
                        title={t('common.delete')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {createOpen && (
        <CreateExpenseModal
          isOwner={isOwner}
          userBranchId={user?.branchId}
          categories={categories}
          onClose={() => setCreateOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
