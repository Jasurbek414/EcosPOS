import { useTranslation } from 'react-i18next';
import { Users, Package, AlertTriangle, Receipt, TrendingUp } from 'lucide-react';

// InventoryStatsHeader.jsx / StaffStatsHeader.jsx bilan bir xil vizual naqsh —
// BranchDetailPage.jsx uchun. `stats` GET /branches/{id}/stats javobi
// ({staffCount, productCount, lowStockCount, todaySalesTotal, todaySalesCount,
// monthSalesTotal}) — hali yuklanmagan bo'lsa (null) barcha qiymatlar "—" ko'rsatiladi.
// Bugungi savdo soni+summasi bitta katakka birlashtirilgan (5 ta xom maydon, 5 ta karta).
export default function BranchStatsHeader({ stats }) {
  const { t } = useTranslation();

  const money = (v) => `${Number(v ?? 0).toLocaleString('uz-UZ')} ${t('dashboard.currency')}`;
  const lowStock = stats?.lowStockCount ?? 0;

  const cards = [
    {
      key: 'staff',
      label: t('branches.stats.staff'),
      value: stats ? stats.staffCount ?? 0 : '—',
      icon: Users,
      accent: 'bg-blue-50 text-blue-600',
    },
    {
      key: 'products',
      label: t('branches.stats.products'),
      value: stats ? stats.productCount ?? 0 : '—',
      icon: Package,
      accent: 'bg-indigo-50 text-indigo-600',
    },
    {
      key: 'lowStock',
      label: t('branches.stats.lowStock'),
      value: stats ? stats.lowStockCount ?? 0 : '—',
      icon: AlertTriangle,
      accent: lowStock > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400',
    },
    {
      key: 'todaySales',
      label: t('branches.stats.todaySales'),
      value: stats ? money(stats.todaySalesTotal) : '—',
      sub: stats ? `${stats.todaySalesCount ?? 0} ${t('branches.stats.checks')}` : null,
      icon: Receipt,
      accent: 'bg-emerald-50 text-emerald-600',
    },
    {
      key: 'monthSales',
      label: t('branches.stats.monthSales'),
      value: stats ? money(stats.monthSalesTotal) : '—',
      icon: TrendingUp,
      accent: 'bg-purple-50 text-purple-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
      {cards.map((card) => (
        <div key={card.key} className="card p-5 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${card.accent}`}>
            <card.icon size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide truncate">{card.label}</p>
            <p className="text-slate-900 dark:text-slate-100 text-xl font-bold mt-0.5 truncate">{card.value}</p>
            {card.sub && <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-0.5 truncate">{card.sub}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
