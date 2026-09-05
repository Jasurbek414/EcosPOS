import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Wallet, Package, TrendingUp, Percent, BarChart3 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { useThemeContext } from '../../hooks/useThemeContext';
import { useUnits } from '../../hooks/useUnits';
import { branchService, reportService } from '../../services/api';

const toISODate = (d) => {
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
};

const startOfWeek = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1; // dushanbadan boshlanadi
  date.setDate(date.getDate() - diff);
  return date;
};

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

export default function ReportsPage() {
  const { t } = useTranslation();
  const { user, isOwner } = useTenantAuthContext();
  // Recharts SVG rang atributlari Tailwind "dark:" klasslariga bog'liq emas —
  // qorong'i mavzuda grafik chizig'i/o'q yozuvlari ko'rinishi uchun joriy
  // mavzuni to'g'ridan-to'g'ri o'qib, mos rangni tanlaymiz.
  const { theme } = useThemeContext();
  const isDark = theme === 'dark';
  const { unitLabel } = useUnits();

  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(isOwner ? '' : (user?.branchId ?? ''));

  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return toISODate(d);
  });
  const [to, setTo] = useState(() => toISODate(new Date()));

  const [profit, setProfit] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Faqat OWNER uchun: filiallar ro'yxati (filtr uchun)
  useEffect(() => {
    if (!isOwner) return undefined;
    let cancelled = false;
    branchService
      .list()
      .then((res) => {
        if (!cancelled) setBranches(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOwner]);

  const groupBy = useMemo(() => {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const days = Math.round((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
    return days > 60 ? 'month' : 'day';
  }, [from, to]);

  const baseParams = useMemo(() => {
    const p = { from, to };
    if (branchId) p.branchId = branchId;
    return p;
  }, [branchId, from, to]);

  // Filtrlar (filial / sana oralig'i) o'zgarganda barcha hisobot ma'lumotlarini qayta yuklaymiz.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      reportService.profit(baseParams),
      reportService.salesSummary({ ...baseParams, groupBy }),
      reportService.topProducts({ ...baseParams, limit: 10 }),
    ])
      .then(([profitRes, summaryRes, topRes]) => {
        if (cancelled) return;
        setProfit(profitRes.data);
        setChartData(summaryRes.data);
        setTopProducts(topRes.data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('reports.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [baseParams, groupBy, t]);

  const setQuickRange = (range) => {
    const now = new Date();
    if (range === 'today') {
      setFrom(toISODate(now));
      setTo(toISODate(now));
    } else if (range === 'week') {
      setFrom(toISODate(startOfWeek(now)));
      setTo(toISODate(now));
    } else if (range === 'month') {
      setFrom(toISODate(startOfMonth(now)));
      setTo(toISODate(now));
    } else if (range === 'last30') {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      setFrom(toISODate(d));
      setTo(toISODate(now));
    }
  };

  const quickRanges = [
    { key: 'today', label: t('reports.today') },
    { key: 'week', label: t('reports.thisWeek') },
    { key: 'month', label: t('reports.thisMonth') },
    { key: 'last30', label: t('reports.last30Days') },
  ];

  const money = (v) => `${Number(v ?? 0).toLocaleString('uz-UZ')} ${t('reports.currency')}`;

  const summaryCards = [
    { label: t('reports.totalRevenue'), value: money(profit?.totalRevenue), icon: Wallet, accent: 'bg-blue-50 text-blue-600' },
    { label: t('reports.totalCost'), value: money(profit?.totalCost), icon: Package, accent: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' },
    { label: t('reports.totalProfit'), value: money(profit?.totalProfit), icon: TrendingUp, accent: 'bg-emerald-50 text-emerald-600' },
    {
      label: t('reports.profitMargin'),
      value: `${Number(profit?.profitMarginPercent ?? 0).toFixed(1)}%`,
      icon: Percent,
      accent: 'bg-violet-50 text-violet-600',
    },
  ];

  const formatPeriod = (period) => {
    if (!period) return '';
    if (groupBy === 'month') {
      const [y, m] = period.split('-');
      return `${m}.${y}`;
    }
    const [, m, d] = period.split('-');
    return `${d}.${m}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('reports.title')}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('reports.subtitle')}</p>
      </div>

      <div className="card p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {quickRanges.map((r) => (
            <button key={r.key} type="button" onClick={() => setQuickRange(r.key)} className="btn btn-outline">
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="field-label">{t('reports.from')}</label>
            <input type="date" className="input-field" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="field-label">{t('reports.to')}</label>
            <input type="date" className="input-field" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </div>
          {isOwner && (
            <div>
              <label className="field-label">{t('reports.branch')}</label>
              <select className="input-field min-w-[200px]" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                <option value="">{t('reports.allBranches')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-slate-500 dark:text-slate-400 text-sm">{t('common.loading')}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {summaryCards.map((card) => (
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
          </div>

          <div className="card p-6">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">{t('reports.chartTitle')}</h2>
            {chartData.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  <BarChart3 size={24} className="text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">{t('reports.noData')}</p>
              </div>
            ) : (
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e5e7eb'} vertical={false} />
                    <XAxis
                      dataKey="period"
                      tickFormatter={formatPeriod}
                      tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#6b7280' }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#6b7280' }}
                      tickFormatter={(v) => Number(v).toLocaleString('uz-UZ')}
                    />
                    <Tooltip
                      labelFormatter={formatPeriod}
                      formatter={(value, name) => [`${Number(value).toLocaleString('uz-UZ')} ${t('reports.currency')}`, name]}
                      contentStyle={
                        isDark
                          ? { background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }
                          : undefined
                      }
                      labelStyle={isDark ? { color: '#f1f5f9' } : undefined}
                    />
                    <Legend />
                    <Bar dataKey="revenue" name={t('reports.revenue')} fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" name={t('reports.profit')} fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="card p-6">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">{t('reports.topProductsTitle')}</h2>
            {topProducts.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  <Package size={24} className="text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">{t('reports.noData')}</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t('reports.rank')}</th>
                      <th>{t('reports.product')}</th>
                      <th>{t('reports.unit')}</th>
                      <th>{t('reports.quantitySold')}</th>
                      <th>{t('reports.totalRevenue')}</th>
                      <th>{t('reports.totalProfit')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((p, idx) => (
                      <tr key={p.productId}>
                        <td className="text-slate-500 dark:text-slate-400">{idx + 1}</td>
                        <td className="font-medium text-slate-900 dark:text-slate-100">{p.productName}</td>
                        <td className="text-slate-600 dark:text-slate-300">{unitLabel(p.unit)}</td>
                        <td className="text-slate-600 dark:text-slate-300">{p.quantitySold}</td>
                        <td className="text-slate-600 dark:text-slate-300">{Number(p.revenue).toLocaleString('uz-UZ')}</td>
                        <td className="text-slate-600 dark:text-slate-300">{Number(p.profit).toLocaleString('uz-UZ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
