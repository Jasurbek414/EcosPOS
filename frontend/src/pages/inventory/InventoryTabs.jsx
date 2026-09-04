import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Package, Tag, Truck, Layers, ClipboardList } from 'lucide-react';
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

  return (
    <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto">
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              isActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'
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
