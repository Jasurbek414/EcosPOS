/**
 * Asosiy sahifalarni fonda yoki menyu ustiga sichqoncha olib borilganda
 * (hover prefetch) oldindan yuklab qo'yuvchi modul.
 * Bu orqali foydalanuvchi menyuni bosishi bilan sahifa kechikishsiz (0 ms) ochiladi.
 */

const routeLoaders = {
  '/dashboard': () => import('../pages/DashboardPage'),
  '/staff': () => import('../pages/staff/StaffListPage'),
  '/inventory': () => import('../pages/inventory/ProductsPage'),
  '/inventory/products': () => import('../pages/inventory/ProductsPage'),
  '/inventory/categories': () => import('../pages/inventory/CategoriesPage'),
  '/inventory/suppliers': () => import('../pages/inventory/SuppliersPage'),
  '/inventory/stock': () => import('../pages/inventory/StockPage'),
  '/inventory/receipts': () => import('../pages/inventory/ReceiptsPage'),
  '/inventory/receipts/new': () => import('../pages/inventory/ReceiptCreatePage'),
  '/inventory/movements': () => import('../pages/inventory/MovementsPage'),
  '/pos': () => import('../pages/pos/POSPage'),
  '/reports': () => import('../pages/reports/ReportsPage'),
  '/accounting': () => import('../pages/accounting/AccountingPage'),
  '/accounting/expenses': () => import('../pages/accounting/ExpensesPage'),
  '/accounting/attendance': () => import('../pages/accounting/AttendancePage'),
  '/accounting/payroll': () => import('../pages/accounting/PayrollPage'),
  '/accounting/advances': () => import('../pages/accounting/AdvancesPage'),
  '/customers': () => import('../pages/customers/CustomerListPage'),
  '/customers/debtors': () => import('../pages/customers/CustomerDebtorsPage'),
  '/settings': () => import('../pages/settings/SettingsPage'),
};

const preloadedRoutes = new Set();

export function preloadRoute(path) {
  try {
    if (!path || preloadedRoutes.has(path)) return;

    const loader = routeLoaders[path];
    if (loader) {
      preloadedRoutes.add(path);
      loader().catch(() => {
        preloadedRoutes.delete(path);
      });
    }
  } catch {
    // Preload xatosi asosiy oqimga xalaqit bermasligi kerak
  }
}

export function preloadAllMainRoutes() {
  if (typeof window === 'undefined') return;

  // Foydalanuvchi sahifaga kirgach, 1 soniyadan keyin asosiy bo'limlarni navbati bilan yuklaymiz
  setTimeout(() => {
    const priorityPaths = [
      '/pos',
      '/inventory/products',
      '/inventory/stock',
      '/staff',
      '/accounting',
      '/customers',
      '/reports',
      '/settings',
    ];

    priorityPaths.forEach((path, idx) => {
      setTimeout(() => {
        preloadRoute(path);
      }, idx * 250);
    });
  }, 1000);
}
