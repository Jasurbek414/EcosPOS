import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { HandCoins } from 'lucide-react';
import { customerService, customerDebtService } from '../../services/api';
import CustomerTabs from './CustomerTabs';

export default function CustomerDebtorsPage() {
  const { t } = useTranslation();
  const [balances, setBalances] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([customerDebtService.balances(), customerService.list()])
      .then(([balancesRes, customersRes]) => {
        if (cancelled) return;
        setBalances(balancesRes.data);
        setCustomers(customersRes.data);
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

  // Telefon raqamini balanslar ro'yxatiga (unda customerFullName bor, lekin phone yo'q)
  // to'liq mijozlar ro'yxatidan bog'lab qo'shish — eng oddiy to'g'ri yechim: bitta map.
  const phoneByCustomerId = useMemo(() => {
    const map = {};
    customers.forEach((c) => {
      map[c.id] = c.phone;
    });
    return map;
  }, [customers]);

  const debtors = useMemo(
    () =>
      balances
        .filter((b) => Number(b.balance ?? 0) > 0)
        .sort((a, b) => Number(b.balance ?? 0) - Number(a.balance ?? 0)),
    [balances]
  );

  const money = (v) => `${Number(v ?? 0).toLocaleString('uz-UZ')} ${t('reports.currency')}`;

  return (
    <div className="flex flex-col gap-6">
      <CustomerTabs />

      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('customers.debtorsTitle')}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('customers.debtorsSubtitle')}</p>
      </div>

      {loading ? (
        <div className="text-slate-500 dark:text-slate-400 text-sm">{t('common.loading')}</div>
      ) : debtors.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <HandCoins size={24} className="text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('customers.noDebtors')}</p>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('customers.fullName')}</th>
                <th>{t('customers.phone')}</th>
                <th>{t('customers.balance')}</th>
              </tr>
            </thead>
            <tbody>
              {debtors.map((b) => (
                <tr key={b.customerId}>
                  <td className="font-medium">
                    <Link to={`/customers/${b.customerId}`} className="text-amber-700 hover:text-amber-800 hover:underline">
                      {b.customerFullName}
                    </Link>
                  </td>
                  <td className="text-slate-600 dark:text-slate-300">{phoneByCustomerId[b.customerId] || '—'}</td>
                  <td className="font-semibold tabular-nums text-amber-600">{money(b.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
