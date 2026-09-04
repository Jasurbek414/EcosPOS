import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSuperAdminAuthContext } from '../../hooks/useSuperAdminAuthContext';
import { changeLanguage } from '../../i18n';
import { ShieldCheck, LayoutDashboard, Building2, History, UserCog, Users, LogOut } from 'lucide-react';

export default function SuperAdminLayout() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useSuperAdminAuthContext();
  const navigate = useNavigate();

  const navItems = [
    { path: '/spd/dashboard', icon: LayoutDashboard, label: t('superadmin.dashboard') },
    { path: '/spd/companies', icon: Building2, label: t('superadmin.companies') },
    { path: '/spd/admins', icon: Users, label: t('superadmin.admins') },
    { path: '/spd/audit-log', icon: History, label: t('auditLog.title') },
    { path: '/spd/profile', icon: UserCog, label: t('superadmin.profile') },
  ];

  const handleLogout = () => {
    logout();
    navigate('/spd', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-800">
      <aside className="superadmin-sidebar">
        {/* Logo + til — tenant Sidebar.jsx bilan bir xil naqsh, amber urg'u rangi bilan */}
        <div className="sidebar-header">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="sidebar-logo-mark superadmin-logo-mark">
              <ShieldCheck size={17} className="text-white" strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <h1 className="text-slate-900 dark:text-slate-100 font-extrabold text-sm leading-tight tracking-tight truncate">SUPERADMIN</h1>
              <p className="text-slate-400 dark:text-slate-500 text-[10px] font-semibold uppercase tracking-wider truncate">{t('superadmin.loginSubtitle')}</p>
            </div>
          </div>
          <div className="sidebar-lang-switch">
            <button
              type="button"
              onClick={() => changeLanguage('uz')}
              className={`sidebar-lang-btn ${i18n.language === 'uz' ? 'sidebar-lang-btn-active' : ''}`}
            >
              UZ
            </button>
            <button
              type="button"
              onClick={() => changeLanguage('ru')}
              className={`sidebar-lang-btn ${i18n.language === 'ru' ? 'sidebar-lang-btn-active' : ''}`}
            >
              RU
            </button>
          </div>
        </div>

        {/* Navigatsiya */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-5">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t('sidebar.main')}</p>
          <div className="flex flex-col gap-0.5">
            {navItems.map(({ path, icon: Icon, label }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) => `sidebar-link ${isActive ? 'superadmin-link-active' : ''}`}
              >
                <span className="sidebar-link-icon">
                  <Icon size={17} strokeWidth={2.1} />
                </span>
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Profil */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-700">
          <div className="sidebar-profile-card">
            <div className="sidebar-avatar superadmin-avatar">
              {(user?.fullName || user?.username)?.charAt(0)?.toUpperCase() || 'A'}
              {/* Statik "platforma administratori" indikatori — tenant tomonidagi rol nuqtasiga o'xshash,
                  lekin superadminda rol yo'q, shuning uchun oddiy "faol" ko'rsatkichi */}
              <span className="sidebar-avatar-dot bg-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-900 dark:text-slate-100 text-sm font-semibold truncate">{user?.fullName || user?.username || 'Admin'}</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs truncate">{t('superadmin.role')}</p>
            </div>
            <button type="button" onClick={handleLogout} title={t('sidebar.logout')} className="sidebar-logout-btn">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-x-auto">
        <div className="w-full px-10 py-10 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
