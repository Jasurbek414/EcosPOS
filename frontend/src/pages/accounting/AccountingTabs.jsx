import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Receipt, CalendarCheck, Wallet, HandCoins } from 'lucide-react';

// InventoryTabs.jsx bilan bir xil naqsh — barcha tablar OWNER ham, MANAGER ham
// ko'radi (CASHIER "Bugalteriya" bo'limining o'ziga sidebar orqali kirmaydi).
export default function AccountingTabs() {
  const { t } = useTranslation();

  const tabs = [
    { path: '/accounting', icon: LayoutDashboard, label: t('accounting.tabs.overview') },
    { path: '/accounting/expenses', icon: Receipt, label: t('accounting.tabs.expenses') },
    { path: '/accounting/attendance', icon: CalendarCheck, label: t('accounting.tabs.attendance') },
    { path: '/accounting/payroll', icon: Wallet, label: t('accounting.tabs.payroll') },
    { path: '/accounting/advances', icon: HandCoins, label: t('accounting.tabs.advances') },
  ];

  return (
    <div className="flex items-center gap-1 flex-wrap border-b border-slate-200 dark:border-slate-700">
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end={tab.path === '/accounting'}
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              isActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`
          }
        >
          <tab.icon size={16} />
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}
