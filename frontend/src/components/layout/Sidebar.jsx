import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { changeLanguage } from '../../i18n';
import {
  LayoutDashboard, Building2, Users, ShoppingCart, Package, BarChart3, LogOut, Store, Settings,
} from 'lucide-react';

export default function Sidebar() {
  const { user, role, logout } = useTenantAuthContext();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: t('sidebar.dashboard') },
    { path: '/branches', icon: Building2, label: t('sidebar.branches') },
    { path: '/staff', icon: Users, label: t('sidebar.staff') },
    { path: '/inventory', icon: Package, label: t('sidebar.warehouse') },
    { path: '/pos', icon: ShoppingCart, label: t('sidebar.pos') },
    // Hisobotlar moliyaviy ma'lumot — CASHIER'ga backend ham 403 qaytaradi, shuning uchun bu yerda ham yashiramiz.
    ...(role !== 'CASHIER' ? [{ path: '/reports', icon: BarChart3, label: t('sidebar.reports') }] : []),
    // Sozlamalar — har bir foydalanuvchi o'z profilini boshqara oladi, shuning uchun rolga qarab yashirilmaydi.
    { path: '/settings', icon: Settings, label: t('sidebar.settings') },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const roleDotClass = { OWNER: 'bg-amber-400', MANAGER: 'bg-blue-400', CASHIER: 'bg-slate-400' }[role] || 'bg-slate-400';

  return (
    <aside className="sidebar-shell">
      {/* Logo + til */}
      <div className="sidebar-header">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="sidebar-logo-mark">
            <Store size={17} className="text-white" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <h2 className="text-slate-900 font-extrabold text-sm leading-tight tracking-tight truncate">SAVDO</h2>
            <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider truncate">POS Terminal</p>
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
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('sidebar.main')}</p>
        <div className="flex flex-col gap-0.5">
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}>
              <span className="sidebar-link-icon">
                <item.icon size={17} strokeWidth={2.1} />
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Profil */}
      <div className="p-3 border-t border-slate-200">
        <div className="sidebar-profile-card">
          <div className="sidebar-avatar">
            {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
            <span className={`sidebar-avatar-dot ${roleDotClass}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-900 text-sm font-semibold truncate">{user?.fullName}</p>
            <p className="text-slate-500 text-xs truncate">{user?.role ? t(`staff.roles.${user.role}`) : ''}</p>
          </div>
          <button type="button" onClick={handleLogout} title={t('sidebar.logout')} className="sidebar-logout-btn">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
