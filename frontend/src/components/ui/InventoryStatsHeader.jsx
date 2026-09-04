import { useTranslation } from 'react-i18next';
import { Package, Truck, AlertTriangle } from 'lucide-react';

// DashboardPage.jsx'dagi stat-card vizual naqshi (rangli dumaloq katakchadagi ikonka +
// yorliq + katta raqam) — Ombor bo'limining eng ko'p tashrif buyuriladigan ikki
// sahifasi (Mahsulotlar, Qoldiqlar) uchun umumiy statistika sarlavhasi.
// lowStockCount === null/undefined bo'lsa "—" ko'rsatiladi (masalan OWNER hali
// filial tanlamaganida) — chaqiruvchi sahifa bu holatni o'zi hal qiladi.
export default function InventoryStatsHeader({ productsCount, suppliersCount, lowStockCount }) {
  const { t } = useTranslation();

  const cards = [
    {
      key: 'products',
      label: t('inventory.stats.activeProducts'),
      value: productsCount ?? '—',
      icon: Package,
      accent: 'bg-blue-50 text-blue-600',
    },
    {
      key: 'suppliers',
      label: t('inventory.stats.suppliers'),
      value: suppliersCount ?? '—',
      icon: Truck,
      accent: 'bg-emerald-50 text-emerald-600',
    },
    {
      key: 'lowStock',
      label: t('inventory.stats.lowStock'),
      value: lowStockCount ?? '—',
      icon: AlertTriangle,
      accent: 'bg-amber-50 text-amber-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
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
