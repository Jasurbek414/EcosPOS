import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users2, HandCoins } from 'lucide-react';

// AccountingTabs.jsx bilan bir xil naqsh — 2 ta tab, ikkalasi ham barcha rollar uchun
// ko'rinadi (Sidebar'da "Mijozlar" havolasi allaqachon CASHIER'dan yashirilgan).
// Birinchi tab uchun `end` shart — aks holda "/customers/debtors" va "/customers/:id"
// kabi ko'proq aniq (specific) qo'shni yo'llar ham "/customers" bilan mos kelib, uni
// doim faol qilib qo'yardi.
export default function CustomerTabs() {
  const { t } = useTranslation();

  const tabs = [
    { path: '/customers', icon: Users2, label: t('customers.tabs.all') },
    { path: '/customers/debtors', icon: HandCoins, label: t('customers.tabs.debtors') },
  ];

  return (
    <div className="flex items-center gap-1 flex-wrap border-b border-slate-200 dark:border-slate-700">
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end={tab.path === '/customers'}
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
