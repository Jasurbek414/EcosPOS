import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Users2, Plus, Search, CheckCircle2, Wallet, X } from 'lucide-react';
import { customerService, customerDebtService } from '../../services/api';
import CustomerTabs from './CustomerTabs';

// Faqat yaratish uchun — tahrirlash CustomerDetailPage.jsx'da joyida (inline) amalga
// oshiriladi (EditCustomerInfoForm), BranchListPage.jsx/BranchModal bilan bir xil
// naqsh. Backend kontraktiga ko'ra yaratishni HAR QANDAY rol (CASHIER ham) qila oladi —
// checkout paytida tez qo'shish uchun ataylab shunday, shuning uchun bu yerda rol
// tekshiruvi yo'q.
function CustomerModal({ onClose, onCreated }) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { fullName: '', phone: '', address: '', note: '' } });

  const onSubmit = async (data) => {
    try {
      await customerService.create({
        fullName: data.fullName,
        phone: data.phone || null,
        address: data.address || null,
        note: data.note || null,
      });
      toast.success(t('customers.createSuccess'));
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.message || t('customers.createError'));
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">{t('customers.newCustomer')}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-4">
          <div>
            <label className="field-label">{t('customers.fullName')}</label>
            <input
              type="text"
              className="input-field"
              placeholder={t('customers.fullNamePlaceholder')}
              autoFocus
              {...register('fullName', { required: true })}
            />
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

export default function CustomerListPage() {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  // Balanslar — ro'yxatdan MUSTAQIL, o'z alohida useState/useEffect'i (AccountingPage.jsx/
  // AdvancesPage.jsx'dagi "har bir bo'lim o'zining holatini mustaqil yuklaydi" konvensiyasiga
  // muvofiq). Jadvaldagi har bir qatorda joriy qarzni ko'rsatish va statistika kartochkasidagi
  // "Jami qarzdorlik"ni hisoblash uchun ishlatiladi.
  const [balances, setBalances] = useState([]);
  const [balancesLoading, setBalancesLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await customerService.list();
      setCustomers(res.data);
    } catch {
      toast.error(t('customers.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    customerService
      .list()
      .then((res) => {
        if (!cancelled) setCustomers(res.data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('customers.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    customerDebtService
      .balances()
      .then((res) => {
        if (!cancelled) setBalances(res.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setBalancesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const balanceByCustomerId = useMemo(() => {
    const map = {};
    balances.forEach((b) => {
      map[b.customerId] = Number(b.balance ?? 0);
    });
    return map;
  }, [balances]);

  const totalDebt = useMemo(
    () => balances.reduce((sum, b) => sum + Math.max(0, Number(b.balance ?? 0)), 0),
    [balances]
  );

  const handleCreated = () => {
    setModalOpen(false);
    reload();
  };

  // Qidiruv — allaqachon yuklangan `customers` massividan mijoz tomonida, BranchListPage.jsx
  // bilan bir xil konvensiya.
  const filteredCustomers = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.fullName?.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q)
    );
  }, [customers, searchInput]);

  const activeCount = useMemo(() => customers.filter((c) => c.isActive ?? true).length, [customers]);
  const money = (v) => `${Number(v ?? 0).toLocaleString('uz-UZ')} ${t('reports.currency')}`;

  return (
    <div className="flex flex-col gap-6">
      <CustomerTabs />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('customers.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('customers.subtitle')}</p>
        </div>
        <button type="button" onClick={() => setModalOpen(true)} className="btn btn-primary">
          <Plus size={16} />
          {t('customers.newCustomer')}
        </button>
      </div>

      {!loading && customers.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 max-w-2xl">
          <div className="card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
              <Users2 size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide truncate">
                {t('customers.stats.total')}
              </p>
              <p className="text-slate-900 dark:text-slate-100 text-2xl font-bold mt-0.5">{customers.length}</p>
            </div>
          </div>
          <div className="card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide truncate">
                {t('customers.stats.active')}
              </p>
              <p className="text-slate-900 dark:text-slate-100 text-2xl font-bold mt-0.5">{activeCount}</p>
            </div>
          </div>
          <div className="card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-amber-50 text-amber-600">
              <Wallet size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide truncate">
                {t('customers.stats.totalDebt')}
              </p>
              <p className="text-slate-900 dark:text-slate-100 text-2xl font-bold mt-0.5">
                {balancesLoading ? '—' : money(totalDebt)}
              </p>
            </div>
          </div>
        </div>
      )}

      {!loading && customers.length > 0 && (
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            className="input-field !pl-9"
            placeholder={t('customers.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      )}

      {loading ? (
        <div className="text-slate-500 dark:text-slate-400 text-sm">{t('common.loading')}</div>
      ) : customers.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <Users2 size={24} className="text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('customers.empty')}</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <Search size={24} className="text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('customers.empty')}</p>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('customers.fullName')}</th>
                <th>{t('customers.phone')}</th>
                <th>{t('common.status')}</th>
                <th>{t('customers.balance')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c) => {
                const balance = balanceByCustomerId[c.id] ?? 0;
                return (
                  <tr key={c.id}>
                    <td className="font-medium">
                      <Link to={`/customers/${c.id}`} className="text-amber-700 hover:text-amber-800 hover:underline">
                        {c.fullName}
                      </Link>
                    </td>
                    <td className="text-slate-600 dark:text-slate-300">{c.phone || '—'}</td>
                    <td>
                      <span className={c.isActive ? 'badge badge-green' : 'badge badge-slate'}>
                        {c.isActive ? t('customers.active') : t('customers.inactive')}
                      </span>
                    </td>
                    <td className={`font-semibold tabular-nums ${balance > 0 ? 'text-amber-600' : 'text-slate-400 dark:text-slate-500'}`}>
                      {balancesLoading ? '—' : balance > 0 ? money(balance) : t('customers.noDebt')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && <CustomerModal onClose={() => setModalOpen(false)} onCreated={handleCreated} />}
    </div>
  );
}
