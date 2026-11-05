import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { TenantAuthProvider } from './hooks/useTenantAuthContext';
import { SuperAdminAuthProvider } from './hooks/useSuperAdminAuthContext';
import { ThemeProvider } from './hooks/useThemeContext';
import ProtectedRoute from './components/ui/ProtectedRoute';
import PlatformProtectedRoute from './components/ui/PlatformProtectedRoute';
import ErrorBoundary from './components/ui/ErrorBoundary';
import MainLayout from './components/layout/MainLayout';
import PageSkeletonLoader from './components/ui/PageSkeletonLoader';

// Kirish sahifasi va boshqaruv paneli darhol kerak — ular to'g'ridan-to'g'ri yuklanadi.
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

// Qolgan hamma narsa KECHIKTIRIB yuklanadi. Avval barcha 35 sahifa, grafik
// kutubxonasi va butun superadmin paneli bitta 1.14 MB faylga yig'ilardi —
// kassir hech qachon ochmaydigan kodni ham har safar yuklab olardi.
const StaffListPage = lazy(() => import('./pages/staff/StaffListPage'));
const ProductsPage = lazy(() => import('./pages/inventory/ProductsPage'));
const CategoriesPage = lazy(() => import('./pages/inventory/CategoriesPage'));
const SuppliersPage = lazy(() => import('./pages/inventory/SuppliersPage'));
const StockPage = lazy(() => import('./pages/inventory/StockPage'));
const ReceiptsPage = lazy(() => import('./pages/inventory/ReceiptsPage'));
const ReceiptCreatePage = lazy(() => import('./pages/inventory/ReceiptCreatePage'));
const MovementsPage = lazy(() => import('./pages/inventory/MovementsPage'));
const POSPage = lazy(() => import('./pages/pos/POSPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const AccountingPage = lazy(() => import('./pages/accounting/AccountingPage'));
const ExpensesPage = lazy(() => import('./pages/accounting/ExpensesPage'));
const AttendancePage = lazy(() => import('./pages/accounting/AttendancePage'));
const PayrollPage = lazy(() => import('./pages/accounting/PayrollPage'));
const AdvancesPage = lazy(() => import('./pages/accounting/AdvancesPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const CustomerListPage = lazy(() => import('./pages/customers/CustomerListPage'));
const CustomerDebtorsPage = lazy(() => import('./pages/customers/CustomerDebtorsPage'));
const CustomerDetailPage = lazy(() => import('./pages/customers/CustomerDetailPage'));

// Superadmin paneli — oddiy foydalanuvchi uni umuman ochmaydi.
const SuperAdminLayout = lazy(() => import('./components/layout/SuperAdminLayout'));
const SuperAdminLoginPage = lazy(() => import('./pages/superadmin/SuperAdminLoginPage'));
const SuperAdminDashboardPage = lazy(() => import('./pages/superadmin/DashboardPage'));
const CompanyListPage = lazy(() => import('./pages/superadmin/CompanyListPage'));
const CompanyCreatePage = lazy(() => import('./pages/superadmin/CompanyCreatePage'));
const CompanyDetailPage = lazy(() => import('./pages/superadmin/CompanyDetailPage'));
const PlansPage = lazy(() => import('./pages/superadmin/PlansPage'));
const AdminsPage = lazy(() => import('./pages/superadmin/AdminsPage'));
const AuditLogPage = lazy(() => import('./pages/superadmin/AuditLogPage'));
const SuperAdminProfilePage = lazy(() => import('./pages/superadmin/ProfilePage'));

export default function App() {
  return (
    <BrowserRouter>
      {/* ThemeProvider eng tashqarida — tenant (/...) HAM, superadmin (/spd/...) HAM
          bitta brauzerga bog'liq yorug'/qorong'i/rang sozlamasini baham ko'radi. */}
      <ThemeProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { borderRadius: '10px', background: '#1e293b', color: '#fff', fontSize: '14px' },
          }}
        />
        <TenantAuthProvider>
          <SuperAdminAuthProvider>
            <ErrorBoundary>
            <Suspense fallback={<PageSkeletonLoader />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              {/* Superadmin (platform) — tenant tizimidan butunlay alohida */}
              <Route path="/spd" element={<SuperAdminLoginPage />} />
              <Route element={<PlatformProtectedRoute><SuperAdminLayout /></PlatformProtectedRoute>}>
                <Route path="/spd/dashboard" element={<SuperAdminDashboardPage />} />
                <Route path="/spd/companies" element={<CompanyListPage />} />
                <Route path="/spd/companies/new" element={<CompanyCreatePage />} />
                <Route path="/spd/companies/:id" element={<CompanyDetailPage />} />
                <Route path="/spd/plans" element={<PlansPage />} />
                <Route path="/spd/admins" element={<AdminsPage />} />
                <Route path="/spd/audit-log" element={<AuditLogPage />} />
                <Route path="/spd/profile" element={<SuperAdminProfilePage />} />
              </Route>

              {/* Tenant (do'kon) ilovasi */}
              <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/staff" element={<StaffListPage />} />
                <Route path="/inventory" element={<Navigate to="/inventory/products" replace />} />
                <Route path="/inventory/products" element={<ProductsPage />} />
                <Route path="/inventory/categories" element={<CategoriesPage />} />
                <Route path="/inventory/suppliers" element={<SuppliersPage />} />
                <Route path="/inventory/stock" element={<StockPage />} />
                <Route path="/inventory/receipts" element={<ReceiptsPage />} />
                <Route path="/inventory/receipts/new" element={<ReceiptCreatePage />} />
                <Route path="/inventory/movements" element={<MovementsPage />} />
                <Route path="/pos" element={<POSPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/accounting" element={<AccountingPage />} />
                <Route path="/accounting/expenses" element={<ExpensesPage />} />
                <Route path="/accounting/attendance" element={<AttendancePage />} />
                <Route path="/accounting/payroll" element={<PayrollPage />} />
                <Route path="/accounting/advances" element={<AdvancesPage />} />
                <Route path="/customers" element={<CustomerListPage />} />
                <Route path="/customers/debtors" element={<CustomerDebtorsPage />} />
                <Route path="/customers/:id" element={<CustomerDetailPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            </Suspense>
            </ErrorBoundary>
          </SuperAdminAuthProvider>
        </TenantAuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
