import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Wallet, X } from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { branchService, salaryPaymentService, userService } from '../../services/api';
import DateInput from '../../components/ui/DateInput';
import AccountingTabs from './AccountingTabs';

const toISODate = (d) => {
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
};

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const toMonthValue = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// Faqat OWNER ochadi (PayrollPage'da tugma o'zi OWNER'ga cheklangan) — backend
// POST/DELETE'ni MANAGER uchun 403 bilan rad etadi (SalaryPaymentController.assertIsOwner).
function CreatePaymentModal({ employees, onClose, onCreated }) {
  const { t } = useTranslation();
  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      userId: '',
      amount: '',
      periodMonth: toMonthValue(new Date()),
      paymentDate: toISODate(new Date()),
      note: '',
    },
  });

  const selectedUserId = watch('userId');

  // Xodim tanlanganda bazaviy maoshini (agar belgilangan bo'lsa) qulaylik uchun
  // summa maydoniga oldindan to'ldiramiz — foydalanuvchi baribir tahrirlashi mumkin.
  useEffect(() => {
    if (!selectedUserId) return;
    const emp = employees.find((e) => String(e.id) === String(selectedUserId));
    if (emp?.baseSalary != null) {
      setValue('amount', Number(emp.baseSalary));
    }
  }, [selectedUserId, employees, setValue]);

  const onSubmit = async (data) => {
    try {
      await salaryPaymentService.create({
        userId: Number(data.userId),
        amount: Number(data.amount),
        periodMonth: data.periodMonth,
        paymentDate: data.paymentDate,
        note: data.note || null,
      });
      toast.success(t('payroll.createSuccess'));
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.message || t('payroll.createError'));
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">{t('payroll.newPayment')}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-4">
          <div>
            <label className="field-label">{t('payroll.employee')}</label>
            <select className="input-field" autoFocus {...register('userId', { required: true })}>
              <option value="">{t('payroll.selectEmployee')}</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </select>
            {errors.userId && <p className="field-error">{t('common.required')}</p>}
          </div>
          <div>
            <label className="field-label">{t('payroll.amount')}</label>
            <input
              type="number"
              step="0.01"
              className="input-field"
              placeholder="0"
              {...register('amount', { required: true, min: 0.01, valueAsNumber: true })}
            />
            {errors.amount && <p className="field-error">{t('common.required')}</p>}
          </div>
          <div>
            <label className="field-label">{t('payroll.periodMonth')}</label>
            <input type="month" className="input-field" {...register('periodMonth', { required: true })} />
          </div>
          <div>
            <label className="field-label">{t('payroll.date')}</label>
            <Controller
              name="paymentDate"
              control={control}
              render={({ field }) => <DateInput value={field.value} onChange={field.onChange} max={toISODate(new Date())} />}
            />
          </div>
          <div>
            <label className="field-label">{t('payroll.note')}</label>
            <input type="text" className="input-field" placeholder={t('payroll.notePlaceholder')} {...register('note')} />
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

export default function PayrollPage() {
  const { t } = useTranslation();
  const { user, isOwner } = useTenantAuthContext();

  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(isOwner ? '' : (user?.branchId ?? ''));
  const [employees, setEmployees] = useState([]);
  const [employeeFilter, setEmployeeFilter] = useState('');

  const [from, setFrom] = useState(() => toISODate(startOfMonth(new Date())));
  const [to, setTo] = useState(() => toISODate(new Date()));

  const [payments, setPayments] = useState([]);
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

  // Xodimlar ro'yxati — filial filtri va (OWNER uchun) to'lov yaratish modalidagi
  // xodim tanlagichi uchun kerak.
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

  // Filial select'ining onChange'ida to'g'ridan-to'g'ri tozalanadi (pastda) — effekt
  // ichida sinxron setState React Compiler'ning set-state-in-effect qoidasini buzadi.
  const handleBranchChange = (value) => {
    setBranchId(value);
    setEmployeeFilter('');
  };

  const buildParams = useCallback(() => {
    const params = { from, to };
    if (branchId) params.branchId = branchId;
    if (employeeFilter) params.userId = employeeFilter;
    return params;
  }, [branchId, from, to, employeeFilter]);

  // Diqqat: `loading` filtr o'zgarganda qaytadan `true`ga o'rnatilmaydi (faqat dastlabki
  // useState(true)'dan boshlanadi) — AccountingPage.jsx/ExpensesPage.jsx'dagi bilan bir
  // xil konvensiya (set-state-in-effect qoidasini buzmaslik uchun).
  useEffect(() => {
    let cancelled = false;
    salaryPaymentService
      .list(buildParams())
      .then((res) => {
        if (!cancelled) setPayments(res.data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('payroll.loadError'));
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
      const res = await salaryPaymentService.list(buildParams());
      setPayments(res.data);
    } catch {
      toast.error(t('payroll.loadError'));
    }
  }, [buildParams, t]);

  const handleCreated = () => {
    setCreateOpen(false);
    reload();
  };

  const handleDelete = async (payment) => {
    if (!window.confirm(t('payroll.confirmDelete'))) return;
    try {
      await salaryPaymentService.remove(payment.id);
      toast.success(t('payroll.deleteSuccess'));
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || t('payroll.deleteError'));
    }
  };

  const money = (v) => `${Number(v ?? 0).toLocaleString('uz-UZ')} ${t('reports.currency')}`;
  const dateLabel = (v) => (v ? new Date(v).toLocaleDateString('uz-UZ') : '—');

  return (
    <div className="flex flex-col gap-6">
      <AccountingTabs />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('payroll.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('payroll.subtitle')}</p>
        </div>
        {isOwner && (
          <button type="button" onClick={() => setCreateOpen(true)} className="btn btn-primary">
            <Plus size={16} />
            {t('payroll.newPayment')}
          </button>
        )}
      </div>

      {!isOwner && <p className="text-slate-500 dark:text-slate-400 text-sm">{t('payroll.ownerOnlyHint')}</p>}

      <div className="card p-4 flex flex-col gap-4">
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
              <select className="input-field min-w-[200px]" value={branchId} onChange={(e) => handleBranchChange(e.target.value)}>
                <option value="">{t('reports.allBranches')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="field-label">{t('payroll.employee')}</label>
            <select className="input-field min-w-[200px]" value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}>
              <option value="">{t('payroll.allEmployeesOption')}</option>
              {employeesInBranch.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card p-6">
        {loading ? (
          <div className="text-slate-500 dark:text-slate-400 text-sm">{t('common.loading')}</div>
        ) : payments.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <Wallet size={24} className="text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('payroll.empty')}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('payroll.date')}</th>
                  <th>{t('payroll.employee')}</th>
                  <th>{t('payroll.periodMonth')}</th>
                  <th>{t('payroll.amount')}</th>
                  <th>{t('payroll.note')}</th>
                  {isOwner && <th>{t('common.actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="text-slate-600 dark:text-slate-300 whitespace-nowrap">{dateLabel(p.paymentDate)}</td>
                    <td className="font-medium text-slate-900 dark:text-slate-100">{p.userFullName}</td>
                    <td className="text-slate-600 dark:text-slate-300">{p.periodMonth}</td>
                    <td className="text-slate-600 dark:text-slate-300 tabular-nums">{money(p.amount)}</td>
                    <td className="text-slate-600 dark:text-slate-300">{p.note || '—'}</td>
                    {isOwner && (
                      <td>
                        <button type="button" onClick={() => handleDelete(p)} className="btn-icon danger" title={t('common.delete')}>
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
        <CreatePaymentModal employees={employeesInBranch} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
