import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Package, Tag, Truck, Layers, ClipboardList, ArrowLeftRight, History } from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';

export default function InventoryTabs() {
  const { t } = useTranslation();
  const { isManager } = useTenantAuthContext();

  const tabs = [
    { path: '/inventory/products', icon: Package, label: t('inventory.tabs.products') },
    { path: '/inventory/categories', icon: Tag, label: t('inventory.tabs.categories') },
    { path: '/inventory/suppliers', icon: Truck, label: t('inventory.tabs.suppliers') },
    { path: '/inventory/stock', icon: Layers, label: t('inventory.tabs.stock') },
  ];

  if (isManager) {
    tabs.push({ path: '/inventory/receipts', icon: ClipboardList, label: t('inventory.tabs.receipts') });
  }

  // Filiallar orasida ko'chirish va harakatlar tarixi — hammaga ko'rinadi (CASHIER
  // uchun ko'chirish sahifasida faqat tarix, yaratish formasi yashiriladi; harakatlar
  // tarixi esa boshidanoq faqat ko'rish uchun).
  tabs.push({ path: '/inventory/transfers', icon: ArrowLeftRight, label: t('inventory.tabs.transfers') });
  tabs.push({ path: '/inventory/movements', icon: History, label: t('inventory.tabs.movements') });

  return (
    <div className="flex items-center gap-1 flex-wrap border-b border-slate-200 dark:border-slate-700">
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
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
