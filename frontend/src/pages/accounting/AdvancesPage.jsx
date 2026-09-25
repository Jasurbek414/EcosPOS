import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
  HandCoins,
  Plus,
  Trash2,
  X,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Layers,
  Users,
  AlertCircle,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { employeeAdvanceService, userService } from '../../services/api';
import DateInput from '../../components/ui/DateInput';
import AccountingTabs from './AccountingTabs';

const TYPES = ['ADVANCE_GIVEN', 'ADVANCE_REPAYMENT'];

const toISODate = (d) => {
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
};

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

// Faqat OWNER ochadi — backend POST/DELETE'ni MANAGER uchun 403 bilan rad etadi
// (EmployeeAdvanceController.assertIsOwner, SalaryPaymentController'dagi bilan bir xil).
function CreateTransactionModal({ employees, onClose, onCreated }) {
  const { t } = useTranslation();
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      userId: '',
      type: 'ADVANCE_GIVEN',
      amount: '',
      transactionDate: toISODate(new Date()),
      note: '',
    },
  });

  const type = watch('type');

  const onSubmit = async (data) => {
    try {
      await employeeAdvanceService.create({
        userId: Number(data.userId),
        type: data.type,
        amount: Number(data.amount),
        transactionDate: data.transactionDate,
        note: data.note || null,
      });
      toast.success(t('advances.createSuccess'));
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.message || t('advances.createError'));
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">{t('advances.newTransaction')}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-4">
          <div>
            <label className="field-label">{t('advances.employee')}</label>
            <select className="input-field" autoFocus {...register('userId', { required: true })}>
              <option value="">{t('advances.selectEmployee')}</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </select>
            {errors.userId && <p className="field-error">{t('common.required')}</p>}
          </div>
          <div>
            <label className="field-label">{t('advances.type')}</label>
            <div className="flex items-center gap-2">
              {TYPES.map((tp) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => setValue('type', tp)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm font-semibold transition-colors cursor-pointer ${
                    type === tp
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  {t(`advances.actions.${tp}`)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="field-label">{t('advances.amount')}</label>
            <input
              type="number"
              step="0.01"
              className="input-field"
              placeholder="0"
              {...register('amount', { required: true, min: 0.01, valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="field-error">{errors.amount.type === 'min' ? t('common.mustBePositive') : t('common.required')}</p>
            )}
          </div>
          <div>
            <label className="field-label">{t('advances.date')}</label>
            <Controller
              name="transactionDate"
              control={control}
              render={({ field }) => <DateInput value={field.value} onChange={field.onChange} max={toISODate(new Date())} />}
            />
          </div>
          <div>
            <label className="field-label">{t('advances.note')}</label>
            <input type="text" className="input-field" placeholder={t('advances.notePlaceholder')} {...register('note')} />
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

export default function AdvancesPage() {
  const { t } = useTranslation();
  const { isOwner } = useTenantAuthContext();

  const [employees, setEmployees] = useState([]);

  const [from, setFrom] = useState(() => toISODate(startOfMonth(new Date())));
  const [to, setTo] = useState(() => toISODate(new Date()));

  const [balances, setBalances] = useState([]);
  const [balancesLoading, setBalancesLoading] = useState(true);

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    userService
      .list()
      .then((res) => {
        if (!cancelled) setEmployees(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    employeeAdvanceService
      .balances({})
      .then((res) => {
        if (!cancelled) setBalances(res.data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('advances.loadError'));
      })
      .finally(() => {
        if (!cancelled) setBalancesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const reloadBalances = useCallback(async () => {
    try {
      const res = await employeeAdvanceService.balances({});
      setBalances(res.data);
    } catch {
      toast.error(t('advances.loadError'));
    }
  }, [t]);

  const buildParams = useCallback(() => {
    return { from, to };
  }, [from, to]);

  useEffect(() => {
    let cancelled = false;
    employeeAdvanceService
      .list(buildParams())
      .then((res) => {
        if (!cancelled) setTransactions(res.data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('advances.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [buildParams, t]);

  const reloadTransactions = useCallback(async () => {
    try {
      const res = await employeeAdvanceService.list(buildParams());
      setTransactions(res.data);
    } catch {
      toast.error(t('advances.loadError'));
    }
  }, [buildParams, t]);

  const handleCreated = () => {
    setCreateOpen(false);
    reloadTransactions();
    reloadBalances();
  };

  const handleDelete = async (tx) => {
    if (!window.confirm(t('advances.confirmDelete'))) return;
    try {
      await employeeAdvanceService.remove(tx.id);
      toast.success(t('advances.deleteSuccess'));
      reloadTransactions();
      reloadBalances();
    } catch (err) {
      toast.error(err.response?.data?.message || t('advances.deleteError'));
    }
  };

  // KPI Hisob-kitoblari
  const totalGiven = useMemo(
    () => transactions.filter((tx) => tx.type === 'ADVANCE_GIVEN').reduce((s, tx) => s + Number(tx.amount || 0), 0),
    [transactions]
  );
  const totalRepaid = useMemo(
    () => transactions.filter((tx) => tx.type === 'ADVANCE_REPAYMENT').reduce((s, tx) => s + Number(tx.amount || 0), 0),
    [transactions]
  );
  const totalOutstanding = useMemo(
    () => balances.reduce((s, b) => s + Math.max(0, Number(b.balance || 0)), 0),
    [balances]
  );
  const employeesWithDebt = useMemo(
    () => balances.filter((b) => Number(b.balance || 0) > 0).length,
    [balances]
  );

  const daysDiff = useMemo(() => {
    if (!from || !to) return 0;
    const diffTime = Math.abs(new Date(to) - new Date(from));
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [from, to]);

  const setQuickRange = (rangeType) => {
    const today = new Date();
    if (rangeType === 'today') {
      const d = toISODate(today);
      setFrom(d);
      setTo(d);
    } else if (rangeType === 'week') {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      setFrom(toISODate(start));
      setTo(toISODate(today));
    } else if (rangeType === 'month') {
      setFrom(toISODate(startOfMonth(today)));
      setTo(toISODate(today));
    } else if (rangeType === 'last30') {
      const start = new Date(today);
      start.setDate(today.getDate() - 29);
      setFrom(toISODate(start));
      setTo(toISODate(today));
    }
  };

  // Excel (CSV UTF-8 BOM) eksport
  const exportAdvancesToCSV = () => {
    try {
      let csv = '\uFEFF';
      // 1. Balanslar bo'limi
      csv += 'XODIMLARNING JORIY AVANS QARZDORLIKLARI AUDITI\n';
      csv += 'Xodim ismi;Berilgan jami avans;Qaytarilgan jami;Hozirgi qoldiq qarzdorlik\n';
      balances.forEach((b) => {
        csv += `"${b.userFullName || ''}";"${Number(b.totalGiven || 0)}";"${Number(b.totalRepaid || 0)}";"${Number(b.balance || 0)}"\n`;
      });
      csv += '\n\n';

      // 2. Tranzaksiyalar bo'limi
      csv += `AVANS VA QAYTARISHLAR JURNALI (${from} - ${to})\n`;
      csv += 'Sana;Xodim;Operatsiya turi;Summa;Izoh\n';
      transactions.forEach((tx) => {
        const typeStr = tx.type === 'ADVANCE_GIVEN' ? "Avans berildi" : "Qaytarildi (Ushlab qolindi)";
        csv += `"${tx.transactionDate || ''}";"${tx.userFullName || ''}";"${typeStr}";"${Number(tx.amount || 0)}";"${(tx.note || '').replace(/"/g, '""')}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Avanslar_va_Qarzlar_${from}_${to}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Avanslar hisoboti Excel fayli yuklab olindi");
    } catch {
      toast.error("Faylni yuklab bo'lmadi");
    }
  };

  const money = (v) => `${Number(v ?? 0).toLocaleString('uz-UZ')} ${t('reports.currency')}`;
  const dateLabel = (v) => (v ? new Date(v).toLocaleDateString('uz-UZ') : '—');

  return (
    <div className="flex flex-col gap-6">
      <AccountingTabs />

      {/* 1. SARLAVHA VA AMALLAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <HandCoins size={20} />
            </div>
            {t('advances.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('advances.subtitle')}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={exportAdvancesToCSV}
            disabled={balances.length === 0 && transactions.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
            title="Excel formatida yuklab olish"
          >
            <FileSpreadsheet size={14} />
            <span>Excel yuklab olish</span>
          </button>

          {isOwner && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="btn btn-primary !text-xs !py-2 !px-3.5 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus size={15} />
              <span>{t('advances.newTransaction')}</span>
            </button>
          )}
        </div>
      </div>

      {!isOwner && <p className="text-slate-500 dark:text-slate-400 text-sm">{t('advances.ownerOnlyHint')}</p>}

      {/* 2. EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Jami berilgan avanslar */}
        <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Davrda berilgan avans
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
              <TrendingDown size={17} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
              {money(totalGiven)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Tanlangan davr bo'yicha</p>
          </div>
        </div>

        {/* Qaytarilgan avanslar */}
        <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Qaytarilgan avans
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={17} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
              {money(totalRepaid)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Maoshdan ushlab qolingan / to'langan</p>
          </div>
        </div>

        {/* Umumiy qoldiq qarzdorlik */}
        <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Joriy qoldiq qarzdorlik
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
              <Layers size={17} />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-xl font-black tabular-nums ${totalOutstanding > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
              {money(totalOutstanding)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Xodimlardagi umumiy qarz</p>
          </div>
        </div>

        {/* Qarzli xodimlar soni */}
        <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Qarzdor xodimlar
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
              <Users size={17} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
              {employeesWithDebt} <span className="text-sm font-medium text-slate-400">/ {balances.length}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Avans qoldig'i mavjud</p>
          </div>
        </div>
      </div>

      {/* 3. XODIMLAR JORIY QOLDIQLARI JADVALI */}
      <div className="card p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <AlertCircle size={18} className="text-amber-500" />
              {t('advances.balancesTitle')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Har bir xodimning umumiy avans olingan va qaytarilgan holati
            </p>
          </div>
        </div>

        {balancesLoading ? (
          <div className="text-slate-500 dark:text-slate-400 text-sm py-4">{t('common.loading')}</div>
        ) : balances.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-sm py-4">{t('advances.empty')}</p>
        ) : (
          <div className="table-wrap">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700/60 text-xs text-slate-400 uppercase tracking-wider">
                  <th className="pb-3">{t('advances.employee')}</th>
                  <th className="pb-3 text-right">Jami berilgan</th>
                  <th className="pb-3 text-right">Qaytarilgan</th>
                  <th className="pb-3 text-right">{t('advances.balance')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {balances.map((b) => {
                  const amount = Number(b.balance ?? 0);
                  const given = Number(b.totalGiven ?? 0);
                  const repaid = Number(b.totalRepaid ?? 0);
                  return (
                    <tr key={b.userId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 font-semibold text-slate-900 dark:text-slate-100">
                        {b.userFullName}
                      </td>
                      <td className="py-3.5 text-right font-medium text-slate-600 dark:text-slate-300 tabular-nums">
                        {money(given)}
                      </td>
                      <td className="py-3.5 text-right font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {money(repaid)}
                      </td>
                      <td className="py-3.5 text-right">
                        {amount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 tabular-nums">
                            {money(amount)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            <CheckCircle2 size={12} className="text-emerald-500" />
                            {t('advances.noDebt')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. FILTRLAR PANELI */}
      <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">{t('reports.from')}:</span>
            <DateInput value={from} max={to} onChange={setFrom} />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">{t('reports.to')}:</span>
            <DateInput value={to} min={from} onChange={setTo} />
          </div>
          <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
            {daysDiff} {t('reports.daysCount', 'kunlik davr')}
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
          <button
            type="button"
            onClick={() => setQuickRange('today')}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer whitespace-nowrap"
          >
            Bugun
          </button>
          <button
            type="button"
            onClick={() => setQuickRange('week')}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer whitespace-nowrap"
          >
            Hafta
          </button>
          <button
            type="button"
            onClick={() => setQuickRange('month')}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer whitespace-nowrap"
          >
            Oy
          </button>
          <button
            type="button"
            onClick={() => setQuickRange('last30')}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer whitespace-nowrap"
          >
            Oxirgi 30 kun
          </button>
        </div>
      </div>

      {/* 5. TRANZAKSIYALAR TARIXI */}
      <div className="card p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">{t('advances.historyTitle')}</h2>
        {loading ? (
          <div className="text-slate-500 dark:text-slate-400 text-sm py-4">{t('common.loading')}</div>
        ) : transactions.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <HandCoins size={24} className="text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('advances.empty')}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700/60 text-xs text-slate-400 uppercase tracking-wider">
                  <th className="pb-3">{t('advances.date')}</th>
                  <th className="pb-3">{t('advances.employee')}</th>
                  <th className="pb-3">{t('advances.type')}</th>
                  <th className="pb-3 text-right">{t('advances.amount')}</th>
                  <th className="pb-3">{t('advances.note')}</th>
                  {isOwner && <th className="pb-3 text-right">{t('common.actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{dateLabel(tx.transactionDate)}</td>
                    <td className="py-3.5 font-semibold text-slate-900 dark:text-slate-100">{tx.userFullName}</td>
                    <td className="py-3.5">
                      <span className={tx.type === 'ADVANCE_GIVEN' ? 'badge badge-amber' : 'badge badge-green'}>
                        {t(`advances.types.${tx.type}`)}
                      </span>
                    </td>
                    <td className="py-3.5 text-right font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                      {money(tx.amount)}
                    </td>
                    <td className="py-3.5 text-slate-500 dark:text-slate-400 text-xs max-w-[200px] truncate">{tx.note || '—'}</td>
                    {isOwner && (
                      <td className="py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(tx)}
                          className="btn-icon danger cursor-pointer"
                          title={t('common.delete')}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {createOpen && (
        <CreateTransactionModal employees={employees} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
