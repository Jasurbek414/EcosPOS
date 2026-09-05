import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { HandCoins, Plus, Trash2, X } from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { branchService, employeeAdvanceService, userService } from '../../services/api';
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
  const { user, isOwner } = useTenantAuthContext();

  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(isOwner ? '' : (user?.branchId ?? ''));
  const [employees, setEmployees] = useState([]);

  const [from, setFrom] = useState(() => toISODate(startOfMonth(new Date())));
  const [to, setTo] = useState(() => toISODate(new Date()));

  const [balances, setBalances] = useState([]);
  const [balancesLoading, setBalancesLoading] = useState(true);

  const [transactions, setTransactions] = useState([]);
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

  const employeesInBranch = useMemo(() => {
    if (!branchId) return employees;
    return employees.filter((e) => String(e.branchId ?? '') === String(branchId));
  }, [employees, branchId]);

  const branchNameById = useMemo(() => {
    const map = {};
    branches.forEach((b) => {
      map[b.id] = b.name;
    });
    return map;
  }, [branches]);

  // Diqqat: effekt tanasida sinxron setState chaqirish (masalan `setBalancesLoading(true)`)
  // React Compiler'ning set-state-in-effect qoidasini buzadi — shu sabab avtomatik
  // yuklash effekti va qo'lda qayta yuklash (mutatsiyadan keyin) uchun ikkita alohida
  // funksiya: biri faqat .finally()'da `false`ga o'rnatadi, ikkinchisi loading holatini
  // umuman o'zgartirmaydi (ExpensesPage.jsx/PayrollPage.jsx'dagi bilan bir xil konvensiya).
  useEffect(() => {
    let cancelled = false;
    const params = {};
    if (branchId) params.branchId = branchId;
    employeeAdvanceService
      .balances(params)
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
  }, [branchId, t]);

  const reloadBalances = useCallback(async () => {
    try {
      const params = {};
      if (branchId) params.branchId = branchId;
      const res = await employeeAdvanceService.balances(params);
      setBalances(res.data);
    } catch {
      toast.error(t('advances.loadError'));
    }
  }, [branchId, t]);

  const buildParams = useCallback(() => {
    const params = { from, to };
    if (branchId) params.branchId = branchId;
    return params;
  }, [branchId, from, to]);

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

  const money = (v) => `${Number(v ?? 0).toLocaleString('uz-UZ')} ${t('reports.currency')}`;
  const dateLabel = (v) => (v ? new Date(v).toLocaleDateString('uz-UZ') : '—');

  return (
    <div className="flex flex-col gap-6">
      <AccountingTabs />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('advances.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('advances.subtitle')}</p>
        </div>
        {isOwner && (
          <button type="button" onClick={() => setCreateOpen(true)} className="btn btn-primary">
            <Plus size={16} />
            {t('advances.newTransaction')}
          </button>
        )}
      </div>

      {!isOwner && <p className="text-slate-500 dark:text-slate-400 text-sm">{t('advances.ownerOnlyHint')}</p>}

      {isOwner && (
        <div className="card p-4 flex items-center gap-4 flex-wrap">
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
        </div>
      )}

      <div className="card p-6">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">{t('advances.balancesTitle')}</h2>
        {balancesLoading ? (
          <div className="text-slate-500 dark:text-slate-400 text-sm">{t('common.loading')}</div>
        ) : balances.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('advances.empty')}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('advances.employee')}</th>
                  {isOwner && <th>{t('reports.branch')}</th>}
                  <th>{t('advances.balance')}</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((b) => {
                  const amount = Number(b.balance ?? 0);
                  return (
                    <tr key={b.userId}>
                      <td className="font-medium text-slate-900 dark:text-slate-100">{b.userFullName}</td>
                      {isOwner && <td className="text-slate-600 dark:text-slate-300">{branchNameById[b.branchId] || '—'}</td>}
                      <td className={`font-semibold tabular-nums ${amount > 0 ? 'text-amber-600' : 'text-slate-400 dark:text-slate-500'}`}>
                        {amount > 0 ? money(amount) : t('advances.noDebt')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card p-4 flex items-center gap-4 flex-wrap">
        <div>
          <label className="field-label">{t('reports.from')}</label>
          <DateInput value={from} max={to} onChange={setFrom} />
        </div>
        <div>
          <label className="field-label">{t('reports.to')}</label>
          <DateInput value={to} min={from} onChange={setTo} />
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">{t('advances.historyTitle')}</h2>
        {loading ? (
          <div className="text-slate-500 dark:text-slate-400 text-sm">{t('common.loading')}</div>
        ) : transactions.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <HandCoins size={24} className="text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('advances.empty')}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('advances.date')}</th>
                  <th>{t('advances.employee')}</th>
                  <th>{t('advances.type')}</th>
                  <th>{t('advances.amount')}</th>
                  <th>{t('advances.note')}</th>
                  {isOwner && <th>{t('common.actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="text-slate-600 dark:text-slate-300 whitespace-nowrap">{dateLabel(tx.transactionDate)}</td>
                    <td className="font-medium text-slate-900 dark:text-slate-100">{tx.userFullName}</td>
                    <td>
                      <span className={tx.type === 'ADVANCE_GIVEN' ? 'badge badge-amber' : 'badge badge-green'}>
                        {t(`advances.types.${tx.type}`)}
                      </span>
                    </td>
                    <td className="text-slate-600 dark:text-slate-300 tabular-nums">{money(tx.amount)}</td>
                    <td className="text-slate-600 dark:text-slate-300">{tx.note || '—'}</td>
                    {isOwner && (
                      <td>
                        <button type="button" onClick={() => handleDelete(tx)} className="btn-icon danger" title={t('common.delete')}>
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
        <CreateTransactionModal employees={employeesInBranch} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
