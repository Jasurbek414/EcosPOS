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
    <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 overflow-x-auto no-scrollbar w-fit max-w-full shadow-2xs">
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end={tab.path === '/accounting'}
          className={({ isActive }) =>
            `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
              isActive
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-700/40'
            }`
          }
        >
          <tab.icon size={15} className="shrink-0" />
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </div>
  );
}
