import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Users2, Pencil, Power, Wallet, HandCoins, Ban, X } from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { customerService, customerDebtService } from '../../services/api';
import DateInput from '../../components/ui/DateInput';

const toISODate = (d) => {
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
};

function Field({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wide">{label}</span>
      <span className="text-slate-900 dark:text-slate-100 text-sm font-medium">{value ?? '—'}</span>
    </div>
  );
}

// Mijoz ma'lumotlarini joyida (inline) tahrirlash formasi — BranchDetailPage.jsx'dagi
// EditBranchInfoForm bilan bir xil naqsh: ro'yxat sahifasidagi yaratish oynasi (CustomerModal)
// dan ATAYLAB alohida. Backend PUT tanasi faqat {fullName, phone, address, note} qabul
// qiladi — isActive shu yerda YO'Q, u alohida activate/deactivate endpointlari orqali
// boshqariladi (pastdagi "Amallar" kartochkasida).
function EditCustomerInfoForm({ customer, onSaved, onCancel }) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      fullName: customer.fullName || '',
      phone: customer.phone || '',
      address: customer.address || '',
      note: customer.note || '',
    },
  });

  const onSubmit = async (data) => {
    try {
      const res = await customerService.update(customer.id, {
        fullName: data.fullName,
        phone: data.phone || null,
        address: data.address || null,
        note: data.note || null,
      });
      onSaved(res.data);
      toast.success(t('customers.updateSuccess'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('customers.updateError'));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="field-label">{t('customers.fullName')}</label>
          <input type="text" className="input-field" autoFocus {...register('fullName', { required: true })} />
          {errors.fullName && <p className="field-error">{t('common.required')}</p>}
        </div>
        <div>
          <label className="field-label">{t('customers.phone')}</label>
          <input type="text" className="input-field" placeholder={t('customers.phonePlaceholder')} {...register('phone')} />
        </div>
        <div>
          <label className="field-label">{t('customers.address')}</label>
          <input type="text" className="input-field" placeholder={t('customers.addressPlaceholder')} {...register('address')} />
        </div>
        <div>
          <label className="field-label">{t('customers.note')}</label>
          <input type="text" className="input-field" placeholder={t('customers.notePlaceholder')} {...register('note')} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn btn-outline">
          {t('common.cancel')}
        </button>
        <button type="submit" disabled={isSubmitting} className="btn btn-primary">
          {t('common.save')}
        </button>
      </div>
    </form>
  );
}

// To'lov qabul qilish (PAYMENT, har qanday rol) va qarzni hisobdan chiqarish (WRITE_OFF,
// faqat OWNER) uchun bitta umumiy modal — AdvancesPage.jsx'dagi CreateTransactionModal
// bilan bir xil shakl, lekin turi tashqaridan `type` prop orqali qat'iy belgilanadi
// (bu yerda foydalanuvchi turini o'zi tanlamaydi, chunki ikkala amal ham alohida tugma).
// WRITE_OFF uchun submitdan oldin qo'shimcha window.confirm — bu qaytarib bo'lmaydigan
// moliyaviy amal.
function DebtTransactionModal({ type, customerId, defaultAmount, onClose, onCreated }) {
  const { t } = useTranslation();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      amount: defaultAmount ?? '',
      transactionDate: toISODate(new Date()),
      note: '',
    },
  });

  const isWriteOff = type === 'WRITE_OFF';

  const onSubmit = async (data) => {
    if (isWriteOff && !window.confirm(t('customers.writeOffConfirm'))) return;
    try {
      await customerDebtService.create({
        customerId,
        type,
        amount: Number(data.amount),
        transactionDate: data.transactionDate,
        note: data.note || null,
      });
      toast.success(isWriteOff ? t('customers.writeOffSuccess') : t('customers.paymentSuccess'));
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.message || (isWriteOff ? t('customers.writeOffError') : t('customers.paymentError')));
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">
            {isWriteOff ? t('customers.writeOffDebt') : t('customers.recordPayment')}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-4">
          <div>
            <label className="field-label">{t('customers.amount')}</label>
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
            <label className="field-label">{t('customers.date')}</label>
            <Controller
              name="transactionDate"
              control={control}
              render={({ field }) => <DateInput value={field.value} onChange={field.onChange} max={toISODate(new Date())} />}
            />
          </div>
          <div>
            <label className="field-label">{t('customers.note')}</label>
            <input type="text" className="input-field" placeholder={t('customers.notePlaceholder')} {...register('note')} />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={onClose} className="btn btn-outline">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={isSubmitting} className={isWriteOff ? 'btn btn-danger' : 'btn btn-primary'}>
              {isWriteOff ? t('customers.writeOffDebt') : t('customers.recordPayment')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CustomerDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOwner, isManager } = useTenantAuthContext();
  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  // Ro'yxat sahifasidagi qalam tugmasi shu holatni yuborib, profilga kirilgan zahoti
  // tahrirlash formasi ochiq bo'lishini ta'minlaydi (BranchDetailPage.jsx bilan bir xil).
  const [editingInfo, setEditingInfo] = useState(() => Boolean(location.state?.autoEdit));
  const [txModalType, setTxModalType] = useState(null); // null | 'PAYMENT' | 'WRITE_OFF'

  const reloadTransactions = useCallback(async () => {
    try {
      const res = await customerDebtService.list({ customerId: id });
      setTransactions(res.data);
    } catch {
      toast.error(t('customers.loadError'));
    }
  }, [id, t]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([customerService.get(id), customerDebtService.list({ customerId: id })])
      .then(([customerRes, txRes]) => {
        if (cancelled) return;
        setCustomer(customerRes.data);
        setTransactions(txRes.data);
      })
      .catch(() => {
        if (cancelled) return;
        setNotFound(true);
        toast.error(t('customers.detailLoadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  // Joriy qarz balansi — allaqachon yuklangan tranzaksiyalar tarixidan hisoblanadi
  // (CREDIT_SALE qo'shadi, PAYMENT/WRITE_OFF ayiradi), backend'dagi CustomerDebtService
  // bilan bir xil formula — alohida /balances so'rovi shart emas.
  const balance = useMemo(
    () =>
      transactions.reduce((sum, tx) => {
        if (tx.type === 'CREDIT_SALE') return sum + Number(tx.amount ?? 0);
        return sum - Number(tx.amount ?? 0);
      }, 0),
    [transactions]
  );

  const handleInfoSaved = (updated) => {
    setCustomer(updated);
    setEditingInfo(false);
  };

  const handleToggleActive = async () => {
    if (!customer) return;
    try {
      const res = customer.isActive ? await customerService.deactivate(customer.id) : await customerService.activate(customer.id);
      setCustomer(res.data);
      toast.success(t('customers.updateSuccess'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('customers.updateError'));
    }
  };

  const handleTxCreated = () => {
    setTxModalType(null);
    reloadTransactions();
  };

  const money = (v) => `${Number(v ?? 0).toLocaleString('uz-UZ')} ${t('reports.currency')}`;
  const dateLabel = (v) => (v ? new Date(v).toLocaleDateString('uz-UZ') : '—');

  const typeBadgeClass = (type) => {
    if (type === 'CREDIT_SALE') return 'badge badge-amber';
    if (type === 'PAYMENT') return 'badge badge-green';
    return 'badge badge-red';
  };

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={() => navigate('/customers')}
        className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 text-sm font-medium w-fit cursor-pointer"
      >
        <ArrowLeft size={16} />
        {t('customers.backToCustomers')}
      </button>

      {loading ? (
        <div className="card py-16 flex flex-col items-center gap-3">
          <span className="w-8 h-8 border-[3px] border-slate-200 dark:border-slate-700 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-slate-400 dark:text-slate-500 text-sm">{t('common.loading')}</p>
        </div>
      ) : notFound || !customer ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <Users2 size={24} className="text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('customers.notFound')}</p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="settings-card-banner settings-card-banner-dark">
              <div className="settings-avatar settings-avatar-square">
                <Users2 size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-white font-bold text-lg truncate">{customer.fullName}</h1>
                  <span
                    className={customer.isActive ? 'badge badge-green' : 'badge badge-slate'}
                    style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
                  >
                    {customer.isActive ? t('customers.active') : t('customers.inactive')}
                  </span>
                </div>
                <p className="text-slate-300 text-xs mt-1 truncate">
                  {customer.phone || t('customers.noPhone')}
                  {customer.address ? ` · ${customer.address}` : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="card p-7 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{t('customers.detail')}</h2>
                  {isManager && !editingInfo && (
                    <button
                      type="button"
                      onClick={() => setEditingInfo(true)}
                      className="flex items-center gap-1.5 text-amber-700 text-xs font-semibold hover:text-amber-800 cursor-pointer"
                    >
                      <Pencil size={13} />
                      {t('common.edit')}
                    </button>
                  )}
                </div>

                {editingInfo ? (
                  <EditCustomerInfoForm customer={customer} onSaved={handleInfoSaved} onCancel={() => setEditingInfo(false)} />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Field label={t('customers.fullName')} value={customer.fullName} />
                    <Field label={t('customers.phone')} value={customer.phone} />
                    <Field label={t('customers.address')} value={customer.address} />
                    <Field label={t('customers.note')} value={customer.note} />
                  </div>
                )}
              </div>

              <div className="card p-6 flex flex-col gap-4">
                <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{t('customers.debtTransactions.title')}</h2>
                {transactions.length === 0 ? (
                  <div className="py-12 flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                      <HandCoins size={20} className="text-slate-400 dark:text-slate-500" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{t('customers.debtTransactions.empty')}</p>
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>{t('customers.date')}</th>
                          <th>{t('customers.debtTransactions.type')}</th>
                          <th>{t('customers.amount')}</th>
                          <th>{t('customers.note')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((tx) => (
                          <tr key={tx.id}>
                            <td className="text-slate-600 dark:text-slate-300 whitespace-nowrap">{dateLabel(tx.transactionDate)}</td>
                            <td>
                              <span className={typeBadgeClass(tx.type)}>{t(`customers.debtTransactions.types.${tx.type}`)}</span>
                            </td>
                            <td className="text-slate-600 dark:text-slate-300 tabular-nums">{money(tx.amount)}</td>
                            <td className="text-slate-600 dark:text-slate-300">
                              {tx.type === 'CREDIT_SALE' && tx.relatedSaleId
                                ? `${t('customers.debtTransactions.relatedSale')} #${tx.relatedSaleId}`
                                : tx.note || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="card p-6 flex flex-col gap-1.5">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide">
                  {t('customers.balance')}
                </span>
                <span className={`text-3xl font-extrabold tabular-nums ${balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {money(balance)}
                </span>
                {balance === 0 && <span className="text-slate-400 dark:text-slate-500 text-xs">{t('customers.noDebt')}</span>}
              </div>

              <div className="card p-6 flex flex-col gap-3">
                <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{t('common.actions')}</h2>
                <div className="flex flex-col gap-2">
                  <button type="button" onClick={() => setTxModalType('PAYMENT')} className="btn btn-primary w-full justify-center">
                    <Wallet size={16} />
                    {t('customers.recordPayment')}
                  </button>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setTxModalType('WRITE_OFF')}
                      disabled={balance <= 0}
                      className="btn btn-outline w-full justify-center"
                    >
                      <Ban size={16} />
                      {t('customers.writeOffDebt')}
                    </button>
                  )}
                  {isManager && (
                    <button type="button" onClick={handleToggleActive} className="btn btn-outline w-full justify-center">
                      <Power size={16} />
                      {customer.isActive ? t('customers.deactivateBtn') : t('customers.activateBtn')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {txModalType && (
        <DebtTransactionModal
          type={txModalType}
          customerId={customer?.id}
          defaultAmount={txModalType === 'WRITE_OFF' ? balance : undefined}
          onClose={() => setTxModalType(null)}
          onCreated={handleTxCreated}
        />
      )}
    </div>
  );
}
