import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, Users, ShieldCheck, Sparkles, Wallet, TrendingUp, BarChart3, Package } from 'lucide-react';
import { useTenantAuthContext } from '../hooks/useTenantAuthContext';
import { branchService, userService, reportService } from '../services/api';

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isManager } = useTenantAuthContext();
  const [branchCount, setBranchCount] = useState(null);
  const [staffCount, setStaffCount] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    branchService.list().then((res) => setBranchCount(res.data.length)).catch(() => setBranchCount(null));
    userService.list().then((res) => setStaffCount(res.data.length)).catch(() => setStaffCount(null));
  }, []);

  // OWNER/MANAGER uchun moliyaviy statistika. CASHIER uchun bu so'rov yuborilmaydi —
  // backend baribir 403 qaytaradi, lekin UI darajasida ham yashiramiz.
  useEffect(() => {
    if (!isManager) return undefined;
    let cancelled = false;
    const params = user?.role === 'MANAGER' && user?.branchId ? { branchId: user.branchId } : {};
    reportService
      .dashboard(params)
      .then((res) => {
        if (!cancelled) setStats(res.data);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isManager, user?.role, user?.branchId]);

  const cards = [
    { label: t('dashboard.branchesCard'), value: branchCount, icon: Building2, accent: 'bg-blue-50 text-blue-600' },
    { label: t('dashboard.staffCard'), value: staffCount, icon: Users, accent: 'bg-emerald-50 text-emerald-600' },
    {
      label: t('dashboard.roleCard'),
      value: user?.role ? t(`staff.roles.${user.role}`) : '—',
      icon: ShieldCheck,
      accent: 'bg-violet-50 text-violet-600',
    },
  ];

  const money = (v) => `${Number(v ?? 0).toLocaleString('uz-UZ')} ${t('dashboard.currency')}`;

  const statCards = stats
    ? [
        { label: t('dashboard.todayRevenueCard'), value: money(stats.todayRevenue), icon: Wallet, accent: 'bg-blue-50 text-blue-600' },
        { label: t('dashboard.todayProfitCard'), value: money(stats.todayProfit), icon: TrendingUp, accent: 'bg-emerald-50 text-emerald-600' },
        { label: t('dashboard.monthRevenueCard'), value: money(stats.monthRevenue), icon: BarChart3, accent: 'bg-violet-50 text-violet-600' },
      ]
    : [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          {t('dashboard.welcome')}, {user?.fullName}
          <Sparkles size={20} className="text-amber-400" />
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('dashboard.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {cards.map((card) => (
          <div key={card.label} className="card p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${card.accent}`}>
              <card.icon size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide truncate">{card.label}</p>
              <p className="text-slate-900 dark:text-slate-100 text-2xl font-bold mt-0.5">{card.value ?? '—'}</p>
            </div>
          </div>
        ))}
      </div>

      {isManager && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {statCards.map((card) => (
            <div key={card.label} className="card p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${card.accent}`}>
                <card.icon size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide truncate">{card.label}</p>
                <p className="text-slate-900 dark:text-slate-100 text-xl font-bold mt-0.5 truncate">{card.value}</p>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => navigate('/inventory/stock')}
            className="card p-5 flex items-center gap-4 w-full text-left hover:border-amber-300 transition-colors cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-amber-50 text-amber-600">
              <Package size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide truncate">{t('dashboard.lowStockCard')}</p>
              <p className="text-slate-900 dark:text-slate-100 text-xl font-bold mt-0.5">{stats.lowStockCount ?? '—'}</p>
            </div>
          </button>
        </div>
      )}

      <div className="card p-8 flex flex-col items-center justify-center gap-3 text-center py-16">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
          <Sparkles size={22} className="text-slate-400 dark:text-slate-500" />
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md">{t('dashboard.placeholder')}</p>
      </div>
    </div>
  );
}
