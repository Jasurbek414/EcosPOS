import { useTranslation } from 'react-i18next';
import { Users, ShieldCheck, UserCog, UserRound } from 'lucide-react';

// InventoryStatsHeader.jsx bilan bir xil vizual naqsh (rangli dumaloq katakchadagi
// ikonka + yorliq + katta raqam) — Xodimlar sahifasi uchun. Barcha qiymatlar allaqachon
// yuklangan `staff` massividan mijoz tomonida hisoblanadi, yangi so'rov yuborilmaydi.
export default function StaffStatsHeader({ staff }) {
  const { t } = useTranslation();

  const active = staff.filter((s) => s.isActive ?? true);
  const countByRole = (role) => active.filter((s) => s.role === role).length;

  const cards = [
    {
      key: 'total',
      label: t('staff.stats.total'),
      value: active.length,
      icon: Users,
      accent: 'bg-blue-50 text-blue-600',
    },
    {
      key: 'owners',
      label: t('staff.stats.owners'),
      value: countByRole('OWNER'),
      icon: ShieldCheck,
      accent: 'bg-amber-50 text-amber-600',
    },
    {
      key: 'managers',
      label: t('staff.stats.managers'),
      value: countByRole('MANAGER'),
      icon: UserCog,
      accent: 'bg-indigo-50 text-indigo-600',
    },
    {
      key: 'cashiers',
      label: t('staff.stats.cashiers'),
      value: countByRole('CASHIER'),
      icon: UserRound,
      accent: 'bg-emerald-50 text-emerald-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
      {cards.map((card) => (
        <div key={card.key} className="card p-5 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${card.accent}`}>
            <card.icon size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide truncate">{card.label}</p>
            <p className="text-slate-900 dark:text-slate-100 text-2xl font-bold mt-0.5">{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
