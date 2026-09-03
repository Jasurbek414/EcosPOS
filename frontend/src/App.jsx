import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { TenantAuthProvider } from './hooks/useTenantAuthContext';
import { SuperAdminAuthProvider } from './hooks/useSuperAdminAuthContext';
import ProtectedRoute from './components/ui/ProtectedRoute';
import PlatformProtectedRoute from './components/ui/PlatformProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import SuperAdminLayout from './components/layout/SuperAdminLayout';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BranchListPage from './pages/branches/BranchListPage';
import StaffListPage from './pages/staff/StaffListPage';

import SuperAdminLoginPage from './pages/superadmin/SuperAdminLoginPage';
import SuperAdminDashboardPage from './pages/superadmin/DashboardPage';
import CompanyListPage from './pages/superadmin/CompanyListPage';
import CompanyCreatePage from './pages/superadmin/CompanyCreatePage';
import CompanyDetailPage from './pages/superadmin/CompanyDetailPage';

export default function App() {
  return (
    <BrowserRouter>
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
            </Route>

            {/* Tenant (do'kon) ilovasi */}
            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/branches" element={<BranchListPage />} />
              <Route path="/staff" element={<StaffListPage />} />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </SuperAdminAuthProvider>
      </TenantAuthProvider>
    </BrowserRouter>
  );
}
