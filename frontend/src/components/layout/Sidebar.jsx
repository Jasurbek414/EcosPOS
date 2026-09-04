import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { changeLanguage } from '../../i18n';
import {
  LayoutDashboard, Building2, Users, ShoppingCart, Package, BarChart3, LogOut, Store,
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
  ];

  const comingSoonItems = [];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside
      className="fixed top-0 left-0 h-screen w-64 flex flex-col z-40"
      style={{ background: 'var(--bg-sidebar)', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Logo + til */}
      <div className="flex items-center justify-between gap-3 px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <Store size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-white font-bold text-sm leading-tight truncate">SAVDO</h2>
            <p className="text-slate-400 text-[10px] uppercase tracking-wide truncate">POS</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => changeLanguage(i18n.language === 'uz' ? 'ru' : 'uz')}
          className="shrink-0 w-8 h-8 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] font-bold flex items-center justify-center cursor-pointer transition-colors"
          title={i18n.language === 'uz' ? 'Русский' : "O'zbekcha"}
        >
          {i18n.language === 'uz' ? 'UZ' : 'RU'}
        </button>
      </div>

      {/* Navigatsiya */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('sidebar.main')}</p>
        <div className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-600/15 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon size={18} className="shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        {comingSoonItems.length > 0 && (
          <div className="mt-6 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex flex-col gap-1">
              {comingSoonItems.map((item) => (
                <div
                  key={item.label}
                  title={t('common.comingSoon')}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 cursor-not-allowed select-none"
                >
                  <span className="flex items-center gap-3">
                    <item.icon size={18} className="shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wide bg-white/5 text-slate-500 px-1.5 py-0.5 rounded">
                    {t('common.comingSoon')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Profil */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03]">
          <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
            {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 text-sm font-semibold truncate">{user?.fullName}</p>
            <p className="text-slate-500 text-xs">{user?.role ? t(`staff.roles.${user.role}`) : ''}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title={t('sidebar.logout')}
            className="shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-white/5 cursor-pointer transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
