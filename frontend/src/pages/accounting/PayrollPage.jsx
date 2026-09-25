import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Wallet, X, FileSpreadsheet, Layers, Users } from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { salaryPaymentService, userService } from '../../services/api';
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
    formState: { errors, isSubmitting, dirtyFields },
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
  // summa maydoniga oldindan to'ldiramiz. Lekin foydalanuvchi summani QO'LDA
  // tahrirlagan bo'lsa (dirtyFields.amount), boshqa xodim tanlansa ham bu qiymatning
  // ustidan yozilmaydi — aks holda qo'lda kiritilgan summa sirtqi yo'qolib qolar edi.
  useEffect(() => {
    if (!selectedUserId || dirtyFields.amount) return;
    const emp = employees.find((e) => String(e.id) === String(selectedUserId));
    if (emp?.baseSalary != null) {
      setValue('amount', Number(emp.baseSalary));
    }
  }, [selectedUserId, employees, setValue, dirtyFields.amount]);

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
            {errors.amount && (
              <p className="field-error">{errors.amount.type === 'min' ? t('common.mustBePositive') : t('common.required')}</p>
            )}
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
  const { isOwner } = useTenantAuthContext();

  const [employees, setEmployees] = useState([]);
  const [employeeFilter, setEmployeeFilter] = useState('');

  const [from, setFrom] = useState(() => toISODate(startOfMonth(new Date())));
  const [to, setTo] = useState(() => toISODate(new Date()));

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

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

  const buildParams = useCallback(() => {
    const params = { from, to };
    if (employeeFilter) params.userId = employeeFilter;
    return params;
  }, [from, to, employeeFilter]);

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

  const totalPayroll = useMemo(() => payments.reduce((sum, p) => sum + Number(p.amount ?? 0), 0), [payments]);
  const daysDiff = useMemo(() => Math.max(1, Math.round((new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24)) + 1), [from, to]);
  const activeEmployeesCount = useMemo(() => new Set(payments.map((p) => p.userId)).size, [payments]);

  const exportPayrollToCSV = () => {
    try {
      const bom = '\uFEFF';
      let csv = bom;
      csv += `"XODIMLAR ISH HAQI TO'LOVLARI (BUXGALTERIYA)"\n`;
      csv += `"Davr:";"${from} dan ${to} gacha (${daysDiff} kun)"\n`;
      csv += `"Jami to'langan maosh:";"${totalPayroll}"\n`;
      csv += `"Yaratilgan sana:";"${new Date().toLocaleString('uz-UZ')}"\n\n`;

      csv += `"№";"To'lov sanasi";"Xodim F.I.Sh";"Davr (oy)";"Summa (so'm)";"Izoh"\n`;
      payments.forEach((p, idx) => {
        const noteClean = (p.note || '').replace(/"/g, '""');
        csv += `"${idx + 1}";"${p.paymentDate}";"${(p.userFullName || '').replace(/"/g, '""')}";"${p.periodMonth}";"${p.amount}";"${noteClean}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Ish_Haqi_${from}_${to}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Ish haqi to'lovlari Excel fayli yuklab olindi");
    } catch {
      toast.error("Faylni yuklab bo'lmadi");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <AccountingTabs />

      {/* 1. SARLAVHA VA AMALLAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Wallet size={20} />
            </div>
            {t('payroll.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('payroll.subtitle')}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={exportPayrollToCSV}
            disabled={payments.length === 0}
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
              <span>{t('payroll.newPayment')}</span>
            </button>
          )}
        </div>
      </div>

      {!isOwner && <p className="text-slate-500 dark:text-slate-400 text-sm">{t('payroll.ownerOnlyHint')}</p>}

      {/* 2. FILTRLAR PANELI */}
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
          <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
            {daysDiff} {t('reports.daysCount', 'kunlik davr')}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">{t('payroll.employee')}:</span>
          <select
            className="input-field !py-1.5 !text-xs min-w-[200px]"
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
          >
            <option value="">{t('payroll.allEmployeesOption')}</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.fullName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1) Jami ish haqi */}
        <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Jami to'langan ish haqi
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Wallet size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
            {money(totalPayroll)}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
            <span>Davr bo'yicha to'lovlar summasi</span>
          </div>
        </div>

        {/* 2) To'lovlar soni */}
        <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              To'lovlar soni
            </span>
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
              <Layers size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {payments.length}
            </p>
            <span className="text-xs text-slate-400 font-medium">ta to'lov</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
            <span>Amalga oshirilgan tranzaksiyalar</span>
          </div>
        </div>

        {/* 3) Xodimlar qamrovi */}
        <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Qamrab olingan xodimlar
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Users size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {activeEmployeesCount}
            </p>
            <span className="text-xs text-slate-400 font-medium">nafar xodim</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
            <span>Maosh olgan xodimlar soni</span>
          </div>
        </div>
      </div>

      {/* 4. TO'LOVLAR JADVALI */}
      <div className="card p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Wallet size={18} className="text-indigo-600 dark:text-indigo-400" />
              Ish haqi to'lovlari jurnali
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Xodimlarga to'langan oylik ish haqi va mukofotlar hisobi
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {payments.length} ta yozuv
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
            <Wallet size={24} className="animate-spin text-indigo-500" />
            <span>{t('common.loading')}</span>
          </div>
        ) : payments.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <Wallet size={26} />
            </div>
            <p className="text-sm font-medium">{t('payroll.empty')}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3 w-28">{t('payroll.date')}</th>
                  <th className="py-2.5 px-3">{t('payroll.employee')}</th>
                  <th className="py-2.5 px-3 w-28 text-center">{t('payroll.periodMonth')}</th>
                  <th className="py-2.5 px-3 text-right">{t('payroll.amount')}</th>
                  <th className="py-2.5 px-3">{t('payroll.note')}</th>
                  {isOwner && <th className="py-2.5 px-3 text-center w-16">{t('common.actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{dateLabel(p.paymentDate)}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">{p.userFullName}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {p.periodMonth}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {money(p.amount)}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{p.note || '—'}</td>
                    {isOwner && (
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDelete(p)}
                          className="btn-icon danger !w-7 !h-7 inline-flex items-center justify-center cursor-pointer"
                          title={t('common.delete')}
                        >
                          <Trash2 size={14} />
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
        <CreatePaymentModal employees={employees} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
