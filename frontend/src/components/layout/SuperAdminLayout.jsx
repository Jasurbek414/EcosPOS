import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSuperAdminAuthContext } from '../../hooks/useSuperAdminAuthContext';
import { ShieldCheck, LayoutDashboard, Building2, History, LogOut } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/spd/dashboard', icon: LayoutDashboard, label: 'Boshqaruv paneli' },
  { path: '/spd/companies', icon: Building2, label: 'Kompaniyalar' },
  { path: '/spd/audit-log', icon: History, label: 'Amallar tarixi' },
];

export default function SuperAdminLayout() {
  const { user, logout } = useSuperAdminAuthContext();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/spd', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-72 shrink-0 flex flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-200">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-slate-900 font-bold text-sm truncate">Superadmin</h1>
            <p className="text-slate-500 text-xs truncate">{user?.fullName || user?.username || 'Admin'}</p>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-4 py-5">
          {NAV_ITEMS.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors"
          >
            <LogOut size={16} />
            Tizimdan chiqish
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-x-auto">
        <div className="max-w-5xl mx-auto px-10 py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
