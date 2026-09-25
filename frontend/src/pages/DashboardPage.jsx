import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users, ShieldCheck, Sparkles, Wallet, TrendingUp, TrendingDown, BarChart3, Package,
  ShoppingCart, ArrowRight, Clock, Store, Plus, FileText, CheckCircle2, AlertTriangle,
  ArrowUpRight, RefreshCw, ChevronRight, Receipt, Calendar, CreditCard, Layers,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTenantAuthContext } from '../hooks/useTenantAuthContext';
import { useDefaultBranchId } from '../hooks/useDefaultBranchId';
import { useThemeContext } from '../hooks/useThemeContext';
import { userService, reportService, branchService, saleService } from '../services/api';

const toISODate = (d) => {
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
};

const formatPeriod = (p) => {
  if (!p) return '';
  if (p.length === 10) {
    const [, m, d] = p.split('-');
    return `${d}.${m}`;
  }
  return p;
};

const formatTime = (isoString) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isManager, isOwner } = useTenantAuthContext();
  const { branchId } = useDefaultBranchId();
  const { theme } = useThemeContext();
  const isDark = theme === 'dark';

  const [staffCount, setStaffCount] = useState(null);
  const [branches, setBranches] = useState([]);
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sana parametrlari: oxirgi 7 kun
  const { from, to } = useMemo(() => {
    const now = new Date();
    const past = new Date();
    past.setDate(past.getDate() - 6);
    return {
      from: toISODate(past),
      to: toISODate(now),
    };
  }, []);

  const currentDateFormatted = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('uz-UZ', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  // Xodimlar va filiallar soni
  useEffect(() => {
    userService
      .list()
      .then((res) => setStaffCount(res.data.length))
      .catch(() => setStaffCount(null));

    branchService
      .list()
      .then((res) => setBranches(res.data))
      .catch(() => setBranches([]));
  }, []);

  // Dashboard statistikasi, 7 kunlik grafik va oxirgi sotuvlar
  useEffect(() => {
    let cancelled = false;

    const fetchDashboardData = async () => {
      setLoading(true);
      const params = user?.role === 'MANAGER' && user?.branchId ? { branchId: user.branchId } : {};

      try {
        if (isManager) {
          const [dashRes, summaryRes, salesRes] = await Promise.allSettled([
            reportService.dashboard(params),
            reportService.salesSummary({ from, to, groupBy: 'day', ...(branchId ? { branchId } : {}) }),
            saleService.list({ from, to, ...(branchId ? { branchId } : {}) }),
          ]);

          if (!cancelled) {
            if (dashRes.status === 'fulfilled') setStats(dashRes.value.data);
            if (summaryRes.status === 'fulfilled') setChartData(summaryRes.value.data || []);
            if (salesRes.status === 'fulfilled') {
              const list = Array.isArray(salesRes.value.data) ? salesRes.value.data : [];
              setRecentSales(list.slice(0, 5));
            }
          }
        } else {
          // CASHIER uchun oxirgi sotuvlar
          const salesRes = await saleService.list({ from, to, ...(branchId ? { branchId } : {}) });
          if (!cancelled) {
            const list = Array.isArray(salesRes.data) ? salesRes.data : [];
            setRecentSales(list.slice(0, 5));
          }
        }
      } catch {
        // xatolik yuz bersa ham dashboard qolgan qismi ko'rinadi
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDashboardData();

    return () => {
      cancelled = true;
    };
  }, [isManager, user?.role, user?.branchId, branchId, from, to]);

  const money = (v) => `${Number(v ?? 0).toLocaleString('uz-UZ')} ${t('dashboard.currency')}`;

  const isMonthNetPositive = Number(stats?.monthNetProfit ?? 0) >= 0;

  const activeBranchesCount = useMemo(
    () => branches.filter((b) => b.isActive ?? true).length,
    [branches]
  );

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 1. HERO / BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white p-6 md:p-8 shadow-md border border-slate-800">
        {/* Orqa fon nur effekti */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-indigo-200 backdrop-blur-xs flex items-center gap-1.5 border border-white/10">
                <Calendar size={12} />
                <span className="capitalize">{currentDateFormatted}</span>
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                {t(`staff.roles.${user?.role || 'CASHIER'}`)}
              </span>
              {branches.length > 0 && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/10 text-slate-300 border border-white/10 flex items-center gap-1">
                  <Store size={12} />
                  {branchId
                    ? branches.find((b) => b.id === Number(branchId))?.name || 'Filial'
                    : 'Barcha filiallar'}
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2 mt-1">
              {t('dashboard.welcome')}, {user?.fullName || user?.username}!
              <Sparkles size={24} className="text-amber-400 shrink-0" />
            </h1>
            <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
              {t('dashboard.subtitle')}
            </p>
          </div>

          {/* Tezkor amallar tugmalari */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => navigate('/pos')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-700 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <ShoppingCart size={16} />
              <span>{t('dashboard.newSale')}</span>
              <ArrowUpRight size={14} className="opacity-70" />
            </button>

            {isManager && (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/inventory/products')}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-all border border-white/15 cursor-pointer backdrop-blur-xs"
                >
                  <Plus size={16} />
                  <span>{t('dashboard.newProduct')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/reports')}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-all border border-white/15 cursor-pointer backdrop-blur-xs"
                >
                  <BarChart3 size={16} />
                  <span>{t('dashboard.viewReports')}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. ASOSIY KO'RSATKICHLAR (KPI METRICS) */}
      {isManager && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1) Bugungi tushum */}
          <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('dashboard.todayRevenueCard')}
              </span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Wallet size={19} />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {money(stats.todayRevenue)}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <CheckCircle2 size={13} className="text-emerald-500" />
                <span>
                  {stats.todaySalesCount ?? 0} {t('dashboard.salesCount')}
                </span>
              </div>
            </div>
          </div>

          {/* 2) Bugungi sof foyda */}
          <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('dashboard.todayProfitCard')}
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <TrendingUp size={19} />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {money(stats.todayProfit)}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span className="text-slate-400 font-medium">{t('dashboard.profitMargin')}:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {stats.todayRevenue > 0
                    ? `${Math.round((Number(stats.todayProfit) / Number(stats.todayRevenue)) * 100)}%`
                    : '0%'}
                </span>
              </div>
            </div>
          </div>

          {/* 3) Shu oy tushumi */}
          <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('dashboard.monthRevenueCard')}
              </span>
              <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <BarChart3 size={19} />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {money(stats.monthRevenue)}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span className="text-slate-400">{t('dashboard.expensesMonth')}:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {money(stats.monthExpenses)}
                </span>
              </div>
            </div>
          </div>

          {/* 4) Shu oy sof foyda */}
          <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('dashboard.monthNetProfitCard')}
              </span>
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${
                  isMonthNetPositive
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                }`}
              >
                {isMonthNetPositive ? <TrendingUp size={19} /> : <TrendingDown size={19} />}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <p
                className={`text-2xl font-black tracking-tight ${
                  isMonthNetPositive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {money(stats.monthNetProfit)}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    isMonthNetPositive ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
                <span>
                  {isMonthNetPositive ? "Ijobiy ko'rsatkich" : "Xarajatlar ko'proq"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. CHART & QUICK SUMMARY (2 Columns) */}
      {isManager && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Savdo dinamikasi (2 ustun) */}
          <div className="lg:col-span-2 card p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <BarChart3 size={18} className="text-indigo-600 dark:text-indigo-400" />
                  {t('dashboard.salesDynamics')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Kunlik tushum miqdori
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/reports')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                <span>{t('dashboard.viewReports')}</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {chartData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400">
                <BarChart3 size={32} className="opacity-40" />
                <p className="text-xs">Ushbu oraliqda savdo mavjud emas</p>
              </div>
            ) : (
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#334155' : '#f1f5f9'}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="period"
                      tickFormatter={formatPeriod}
                      tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }}
                      tickFormatter={(v) => Number(v) >= 1000000 ? `${(Number(v) / 1000000).toFixed(1)}M` : Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(0)}k` : v}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(val) => [`${Number(val).toLocaleString('uz-UZ')} so'm`, 'Tushum']}
                      labelFormatter={(label) => `Sana: ${formatPeriod(label)}`}
                      contentStyle={{
                        backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                        borderRadius: '12px',
                        fontSize: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#6366f1"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={45}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* O'ng panel: Kam qolgan tovarlar + Tizim holati */}
          <div className="flex flex-col gap-4">
            {/* Kam qolgan tovarlar kartasi */}
            {stats && (
              <div
                onClick={() => navigate('/inventory/stock')}
                className="card p-5 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 dark:border-amber-900/50 rounded-2xl hover:border-amber-300 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {t('dashboard.lowStockCard')}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Qayta buyurtma berish kerak
                      </p>
                    </div>
                  </div>
                  <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                    {stats.lowStockCount ?? 0}
                  </span>
                </div>
              </div>
            )}

            {/* Tizim / Do'kon umumiy holati */}
            <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col gap-4 flex-1 justify-between">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-3 flex items-center gap-2">
                  <Store size={16} className="text-slate-400" />
                  {t('dashboard.systemOverview')}
                </h4>

                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {t('dashboard.activeBranches')}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {activeBranchesCount} / {branches.length || 1}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {t('dashboard.totalStaff')}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {staffCount ?? '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {t('dashboard.companyStatus')}
                    </span>
                    <span className="badge badge-green text-[11px] font-semibold">
                      {t('dashboard.allSystemsOperational')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sozlamalar va filiallar linklari */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => navigate('/settings')}
                    className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                  >
                    Sozlamalar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate('/branches')}
                  className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-medium ml-auto cursor-pointer"
                >
                  Filiallar ro'yxati →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. OXIRGI SOTUVLAR JURNALI */}
      <div className="card p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shrink-0">
              <Receipt size={16} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {t('dashboard.recentSales')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Kassada amalga oshirilgan oxirgi savdo operatsiyalari
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/accounting')}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
          >
            <span>{t('dashboard.viewAllSales')}</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {recentSales.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2.5 text-center text-slate-400">
            <ShoppingCart size={32} className="opacity-30" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {t('dashboard.noRecentSales')}
            </p>
            <button
              type="button"
              onClick={() => navigate('/pos')}
              className="mt-2 btn btn-primary !text-xs !py-1.5"
            >
              <ShoppingCart size={14} />
              {t('dashboard.newSale')}
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">Vaqt</th>
                  <th className="py-2.5 px-3">Kassir</th>
                  <th className="py-2.5 px-3">To'lov turi</th>
                  <th className="py-2.5 px-3 text-right">Summa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentSales.map((sale) => (
                  <tr
                    key={sale.id}
                    onClick={() => navigate('/accounting')}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-3 font-mono font-medium text-slate-600 dark:text-slate-400">
                      #{sale.id}
                    </td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                      {formatTime(sale.createdAt)}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                      {sale.cashierName || 'Kassir'}
                    </td>
                    <td className="py-3 px-3">
                      {sale.paymentMethod === 'CASH' ? (
                        <span className="badge badge-green">Naqd</span>
                      ) : sale.paymentMethod === 'CARD' ? (
                        <span className="badge badge-blue">Karta</span>
                      ) : sale.paymentMethod === 'MIXED' ? (
                        <span className="badge badge-amber">Aralash</span>
                      ) : (
                        <span className="badge badge-slate">{sale.paymentMethod || '—'}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                      {money(sale.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
