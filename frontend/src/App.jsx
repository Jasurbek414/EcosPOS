import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { TenantAuthProvider } from './hooks/useTenantAuthContext';
import { SuperAdminAuthProvider } from './hooks/useSuperAdminAuthContext';
import { ThemeProvider } from './hooks/useThemeContext';
import ProtectedRoute from './components/ui/ProtectedRoute';
import PlatformProtectedRoute from './components/ui/PlatformProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import SuperAdminLayout from './components/layout/SuperAdminLayout';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BranchListPage from './pages/branches/BranchListPage';
import StaffListPage from './pages/staff/StaffListPage';
import ProductsPage from './pages/inventory/ProductsPage';
import CategoriesPage from './pages/inventory/CategoriesPage';
import SuppliersPage from './pages/inventory/SuppliersPage';
import StockPage from './pages/inventory/StockPage';
import ReceiptsPage from './pages/inventory/ReceiptsPage';
import ReceiptCreatePage from './pages/inventory/ReceiptCreatePage';
import POSPage from './pages/pos/POSPage';
import ReportsPage from './pages/reports/ReportsPage';
import SettingsPage from './pages/settings/SettingsPage';

import SuperAdminLoginPage from './pages/superadmin/SuperAdminLoginPage';
import SuperAdminDashboardPage from './pages/superadmin/DashboardPage';
import CompanyListPage from './pages/superadmin/CompanyListPage';
import CompanyCreatePage from './pages/superadmin/CompanyCreatePage';
import CompanyDetailPage from './pages/superadmin/CompanyDetailPage';
import AuditLogPage from './pages/superadmin/AuditLogPage';
import SuperAdminProfilePage from './pages/superadmin/ProfilePage';

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
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              {/* Superadmin (platform) — tenant tizimidan butunlay alohida */}
              <Route path="/spd" element={<SuperAdminLoginPage />} />
              <Route element={<PlatformProtectedRoute><SuperAdminLayout /></PlatformProtectedRoute>}>
                <Route path="/spd/dashboard" element={<SuperAdminDashboardPage />} />
                <Route path="/spd/companies" element={<CompanyListPage />} />
                <Route path="/spd/companies/new" element={<CompanyCreatePage />} />
                <Route path="/spd/companies/:id" element={<CompanyDetailPage />} />
                <Route path="/spd/audit-log" element={<AuditLogPage />} />
                <Route path="/spd/profile" element={<SuperAdminProfilePage />} />
              </Route>

              {/* Tenant (do'kon) ilovasi */}
              <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/branches" element={<BranchListPage />} />
                <Route path="/staff" element={<StaffListPage />} />
                <Route path="/inventory" element={<Navigate to="/inventory/products" replace />} />
                <Route path="/inventory/products" element={<ProductsPage />} />
                <Route path="/inventory/categories" element={<CategoriesPage />} />
                <Route path="/inventory/suppliers" element={<SuppliersPage />} />
                <Route path="/inventory/stock" element={<StockPage />} />
                <Route path="/inventory/receipts" element={<ReceiptsPage />} />
                <Route path="/inventory/receipts/new" element={<ReceiptCreatePage />} />
                <Route path="/pos" element={<POSPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </SuperAdminAuthProvider>
        </TenantAuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
