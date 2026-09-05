import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Plus, Receipt, Trash2, X } from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { branchService, expenseService } from '../../services/api';
import DateInput from '../../components/ui/DateInput';
import AccountingTabs from './AccountingTabs';

const CATEGORIES = ['RENT', 'UTILITIES', 'TRANSPORT', 'MAINTENANCE', 'MARKETING', 'TAX', 'SUPPLIES', 'OTHER'];

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

// Filial tanlash: OWNER o'zining istalgan filialiga YOKI "Barcha filiallar (umumiy)"
// (branchId: null, kompaniya bo'ylab xarajat) yarata oladi; MANAGER uchun butunlay
// yashiriladi — backend baribir MANAGER'ning umumiy xarajat yaratishiga yo'l qo'ymaydi
// (assertIsOwner), shuning uchun 403 ko'rmasin deb select o'zi ko'rsatilmaydi.
function CreateExpenseModal({ isOwner, userBranchId, branches, onClose, onCreated }) {
  const { t } = useTranslation();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      category: 'RENT',
      amount: '',
      expenseDate: toISODate(new Date()),
      description: '',
      branchId: isOwner ? '' : String(userBranchId ?? ''),
    },
  });

  const onSubmit = async (data) => {
    try {
      const payload = {
        branchId: isOwner ? (data.branchId ? Number(data.branchId) : null) : userBranchId ?? null,
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
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`expenses.categories.${c}`)}
                </option>
              ))}
            </select>
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
            {errors.amount && <p className="field-error">{t('common.required')}</p>}
          </div>
          <div>
            <label className="field-label">{t('expenses.date')}</label>
            <Controller
              name="expenseDate"
              control={control}
              render={({ field }) => <DateInput value={field.value} onChange={field.onChange} max={toISODate(new Date())} />}
            />
          </div>
          {isOwner && (
            <div>
              <label className="field-label">{t('expenses.branch')}</label>
              <select className="input-field" {...register('branchId')}>
                <option value="">{t('expenses.allBranchesOption')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
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

  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(isOwner ? '' : (user?.branchId ?? ''));

  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return toISODate(d);
  });
  const [to, setTo] = useState(() => toISODate(new Date()));

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!isOwner) return undefined;
    let cancelled = false;
    branchService
      .list()
      .then((res) => {
        if (!cancelled) setBranches(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOwner]);

  const buildParams = useCallback(() => {
    const params = { from, to };
    if (branchId) params.branchId = branchId;
    return params;
  }, [branchId, from, to]);

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

  return (
    <div className="flex flex-col gap-6">
      <AccountingTabs />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('expenses.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('expenses.subtitle')}</p>
        </div>
        <button type="button" onClick={() => setCreateOpen(true)} className="btn btn-primary">
          <Plus size={16} />
          {t('expenses.newExpense')}
        </button>
      </div>

      <div className="card p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {quickRanges.map((r) => (
            <button key={r.key} type="button" onClick={() => setQuickRange(r.key)} className="btn btn-outline">
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="field-label">{t('reports.from')}</label>
            <DateInput value={from} max={to} onChange={setFrom} />
          </div>
          <div>
            <label className="field-label">{t('reports.to')}</label>
            <DateInput value={to} min={from} onChange={setTo} />
          </div>
          {isOwner && (
            <div>
              <label className="field-label">{t('reports.branch')}</label>
              <select className="input-field min-w-[200px]" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                <option value="">{t('reports.allBranches')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="card p-5 flex items-center gap-4 max-w-xs">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-red-50 text-red-600">
          <Receipt size={22} />
        </div>
        <div className="min-w-0">
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide truncate">{t('expenses.totalTitle')}</p>
          <p className="text-slate-900 dark:text-slate-100 text-xl font-bold mt-0.5 truncate">{money(total)}</p>
        </div>
      </div>

      <div className="card p-6">
        {loading ? (
          <div className="text-slate-500 dark:text-slate-400 text-sm">{t('common.loading')}</div>
        ) : expenses.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <Receipt size={24} className="text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('expenses.empty')}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('expenses.date')}</th>
                  <th>{t('expenses.category')}</th>
                  <th>{t('expenses.branch')}</th>
                  <th>{t('expenses.amount')}</th>
                  <th>{t('expenses.description')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td className="text-slate-600 dark:text-slate-300 whitespace-nowrap">{dateLabel(e.expenseDate)}</td>
                    <td className="font-medium text-slate-900 dark:text-slate-100">{t(`expenses.categories.${e.category}`)}</td>
                    <td className="text-slate-600 dark:text-slate-300">{e.branchName || '—'}</td>
                    <td className="text-slate-600 dark:text-slate-300 tabular-nums">{money(e.amount)}</td>
                    <td className="text-slate-600 dark:text-slate-300">{e.description || '—'}</td>
                    <td>
                      <button type="button" onClick={() => handleDelete(e)} className="btn-icon danger" title={t('common.delete')}>
                        <Trash2 size={15} />
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
          branches={branches}
          onClose={() => setCreateOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
