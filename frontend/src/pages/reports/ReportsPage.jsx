import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
  Wallet, Package, TrendingUp, TrendingDown, Percent, BarChart3, Receipt,
  Calendar, Layers, Sparkles, ArrowUpRight, ChevronRight, Store, ArrowDownRight,
  RefreshCw, Award, PieChart, LineChart as LineChartIcon, SlidersHorizontal, Check,
  Download, Printer, FileSpreadsheet, FileText, CheckCircle2, Building2,
} from 'lucide-react';
import {
  Bar, BarChart, Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useDefaultBranchId } from '../../hooks/useDefaultBranchId';
import { useThemeContext } from '../../hooks/useThemeContext';
import { useUnits } from '../../hooks/useUnits';
import {
  reportService,
  branchService,
  saleService,
  expenseService,
  companyInfoService,
} from '../../services/api';
import DateInput from '../../components/ui/DateInput';

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
  const { branchId } = useDefaultBranchId();
  const { theme } = useThemeContext();
  const isDark = theme === 'dark';
  const { unitLabel } = useUnits();

  const [activeRange, setActiveRange] = useState('last30');
  const [chartType, setChartType] = useState('bar'); // 'bar' | 'area'
  const [viewMode, setViewMode] = useState('analytics'); // 'analytics' | 'accounting'

  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return toISODate(d);
  });
  const [to, setTo] = useState(() => toISODate(new Date()));

  const [profit, setProfit] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [invValue, setInvValue] = useState(null);
  const [branches, setBranches] = useState([]);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Kunlar soni hisobi
  const daysDiff = useMemo(() => {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return Math.max(1, Math.round((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1);
  }, [from, to]);

  const groupBy = useMemo(() => (daysDiff > 60 ? 'month' : 'day'), [daysDiff]);

  const baseParams = useMemo(() => {
    const p = { from, to };
    if (branchId) p.branchId = branchId;
    return p;
  }, [branchId, from, to]);

  // Filiallar va kompaniya rekvizitlarini yuklash
  useEffect(() => {
    branchService
      .list()
      .then((res) => setBranches(res.data))
      .catch(() => setBranches([]));

    companyInfoService
      .get()
      .then((res) => setCompanyInfo(res.data))
      .catch(() => setCompanyInfo(null));
  }, []);

  // Filtrlar o'zgarganda hisobotlarni yuklash
  const reloadData = () => {
    setLoading(true);
    Promise.allSettled([
      reportService.profit(baseParams),
      reportService.salesSummary({ ...baseParams, groupBy }),
      reportService.topProducts({ ...baseParams, limit: 10 }),
      reportService.inventoryValue(baseParams),
      saleService.list(baseParams),
      expenseService.list(baseParams),
    ])
      .then(([profitRes, summaryRes, topRes, invRes, salesRes, expRes]) => {
        if (profitRes.status === 'fulfilled') setProfit(profitRes.value.data);
        if (summaryRes.status === 'fulfilled') setChartData(summaryRes.value.data || []);
        if (topRes.status === 'fulfilled') setTopProducts(topRes.value.data || []);
        if (invRes.status === 'fulfilled') setInvValue(invRes.value.data);
        if (salesRes.status === 'fulfilled') setSales(salesRes.value.data || []);
        if (expRes.status === 'fulfilled') setExpenses(expRes.value.data || []);
      })
      .catch(() => {
        toast.error(t('reports.loadError'));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.allSettled([
      reportService.profit(baseParams),
      reportService.salesSummary({ ...baseParams, groupBy }),
      reportService.topProducts({ ...baseParams, limit: 10 }),
      reportService.inventoryValue(baseParams),
      saleService.list(baseParams),
      expenseService.list(baseParams),
    ])
      .then(([profitRes, summaryRes, topRes, invRes, salesRes, expRes]) => {
        if (cancelled) return;
        if (profitRes.status === 'fulfilled') setProfit(profitRes.value.data);
        if (summaryRes.status === 'fulfilled') setChartData(summaryRes.value.data || []);
        if (topRes.status === 'fulfilled') setTopProducts(topRes.value.data || []);
        if (invRes.status === 'fulfilled') setInvValue(invRes.value.data);
        if (salesRes.status === 'fulfilled') setSales(salesRes.value.data || []);
        if (expRes.status === 'fulfilled') setExpenses(expRes.value.data || []);
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
    setActiveRange(range);
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

  const netProfit = Number(profit?.netProfit ?? 0);
  const isNetPositive = netProfit >= 0;
  const totalRevenue = Number(profit?.totalRevenue ?? 0);
  const totalProfit = Number(profit?.totalProfit ?? 0);
  const totalExpenses = Number(profit?.totalExpenses ?? 0);
  const totalCost = Number(profit?.totalCost ?? 0);
  const marginPercent = Number(profit?.profitMarginPercent ?? 0).toFixed(1);

  // To'lov turlari bo'yicha tushum taqsimoti
  const { cashRevenue, cardRevenue, otherRevenue } = useMemo(() => {
    let cash = 0;
    let card = 0;
    let other = 0;
    if (sales && sales.length > 0) {
      sales.forEach((s) => {
        const amt = Number(s.totalAmount || 0);
        if (s.paymentMethod === 'CASH') {
          cash += amt;
        } else if (s.paymentMethod === 'CARD') {
          card += amt;
        } else {
          other += amt;
        }
      });
    } else if (totalRevenue > 0) {
      cash = totalRevenue;
    }
    return { cashRevenue: cash, cardRevenue: card, otherRevenue: other };
  }, [sales, totalRevenue]);

  // Xarajatlar toifalari bo'yicha taqsimot
  const expensesByCategory = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];
    const map = {};
    expenses.forEach((e) => {
      const cat = e.category || 'Boshqa';
      map[cat] = (map[cat] || 0) + Number(e.amount || 0);
    });
    return Object.entries(map)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  // Hujjat raqami
  const docNumber = useMemo(() => {
    const fStr = (from || '').replace(/-/g, '');
    const tStr = (to || '').replace(/-/g, '');
    return `PNL-${fStr}-${tStr}`;
  }, [from, to]);

  // Filial nomi
  const currentBranchName = useMemo(() => {
    if (!branchId) return t('reports.allBranches');
    return branches.find((b) => b.id === Number(branchId))?.name || 'Filial';
  }, [branchId, branches, t]);

  // O'rtacha va eng yuqori kunlik savdo
  const { maxRevenue, avgDaily } = useMemo(() => {
    if (!chartData || chartData.length === 0) return { maxRevenue: 0, avgDaily: 0 };
    const max = Math.max(...chartData.map((d) => Number(d.revenue || 0)));
    const avg = Math.round(totalRevenue / Math.max(chartData.length, 1));
    return { maxRevenue: max, avgDaily: avg };
  }, [chartData, totalRevenue]);

  const formatPeriod = (period) => {
    if (!period) return '';
    if (groupBy === 'month') {
      const [y, m] = period.split('-');
      return `${m}.${y}`;
    }
    const [, m, d] = period.split('-');
    return `${d}.${m}`;
  };

  // Eng ko'p sotilgan tovarlar uchun maksimal miqdor (progress bar uchun)
  const maxSoldQty = useMemo(() => {
    if (!topProducts || topProducts.length === 0) return 1;
    return Math.max(...topProducts.map((p) => Number(p.quantitySold || 0)), 1);
  }, [topProducts]);

  // Hisobotni Excel (CSV UTF-8 BOM) formatida yuklab olish
  const exportToCSV = () => {
    try {
      const bom = '\uFEFF';
      let csv = bom;

      // 1. Rasmiy sarlavha va korxona rekvizitlari
      csv += `"FOYDA VA ZARARLAR TO'G'RISIDA RASMIY MOLIYAVIY HISOBOT (P&L)"\n`;
      csv += `"Korxona:";"${(companyInfo?.name || 'SAVDO').replace(/"/g, '""')}"\n`;
      csv += `"Hujjat raqami:";"№ ${docNumber}"\n`;
      csv += `"Hisobot davri:";"${from} dan ${to} gacha (${daysDiff} kalendar kuni)"\n`;
      csv += `"Filial:";"${currentBranchName}"\n`;
      csv += `"Shakllantirilgan vaqt:";"${new Date().toLocaleString('uz-UZ')}"\n\n`;

      // 2. Standart buxgalteriya moddalari (P&L jadvali)
      csv += `"STANDART BUXGALTERIYA MODDALARI BO'YICHA DAROMAD VA XARAJATLAR"\n`;
      csv += `"Satr kodi";"Ko'rsatkichlar / Moddalar nomi";"Summa (so'm)";"Ulushi (%)";"Hisob-kitob tafsiloti"\n`;
      csv += `"010";"Mahsulot (tovar) sotishdan olingan sof tushum";"${totalRevenue}";"100.0%";"Barcha sotuv operatsiyalari jami"\n`;
      csv += `"011";"— shu jumladan: Naqd pul tushumi (kassa orqali)";"${cashRevenue}";"${totalRevenue > 0 ? ((cashRevenue / totalRevenue) * 100).toFixed(1) : 0}%";"Kassaga kirim qilingan naqd pullar"\n`;
      csv += `"012";"— shu jumladan: Bank kartalari (terminal / online)";"${cardRevenue}";"${totalRevenue > 0 ? ((cardRevenue / totalRevenue) * 100).toFixed(1) : 0}%";"Elektron to'lovlar va bank o'tkazmalari"\n`;
      if (otherRevenue > 0) {
        csv += `"013";"— shu jumladan: Boshqa / aralash to'lovlar";"${otherRevenue}";"${totalRevenue > 0 ? ((otherRevenue / totalRevenue) * 100).toFixed(1) : 0}%";"Aralash va boshqa to'lov shakllari"\n`;
      }
      csv += `"020";"Sotilgan tovarlarning kirim (xarid) tannarxi (COGS)";"${totalCost}";"${totalRevenue > 0 ? ((totalCost / totalRevenue) * 100).toFixed(1) : 0}%";"Ombordan sotilgan tovarlar tannarxi"\n`;
      csv += `"030";"YALPI SAVDO FOYDASI (Savdo ustamasi)";"${totalProfit}";"${marginPercent}%";"Satr 010 - Satr 020"\n`;
      csv += `"040";"Davr operatsion xarajatlari (OPEX)";"${totalExpenses}";"${totalRevenue > 0 ? ((totalExpenses / totalRevenue) * 100).toFixed(1) : 0}%";"Faoliyat yuritish bo'yicha jami xarajatlar"\n`;

      if (expensesByCategory.length > 0) {
        expensesByCategory.forEach((exp, idx) => {
          const code = `04${idx + 1}`;
          const catClean = (exp.category || '').replace(/"/g, '""');
          const share = totalRevenue > 0 ? ((exp.amount / totalRevenue) * 100).toFixed(1) : 0;
          csv += `"${code}";"— xarajat moddasi: ${catClean}";"${exp.amount}";"${share}%";"Xarajatlar toifasi"\n`;
        });
      }

      const netProfitShare = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;
      csv += `"050";"KORXONANING SOF MOLIYAVIY NATIJASI (SOF FOYDA / ZARAR)";"${netProfit}";"${netProfitShare}%";"Satr 030 - Satr 040 (${isNetPositive ? 'Foyda' : 'Zarar'})"\n`;
      if (invValue) {
        csv += `"060";"Ma'lumot uchun: Ombor tovar aktivlari balans qiymati";"${invValue.totalValue || 0}";"—";"Jami ${invValue.totalSkuCount || 0} ta tovar turi (SKU)"\n`;
      }
      csv += `\n`;

      // 3. Asosiy moliyaviy nisbatlar
      csv += `"MOLIYAVIY SAMARADORLIK VA NISBATLAR"\n`;
      csv += `"Ko'rsatkich nomi";"Ko'rsatkich qiymati";"Me'yor / Izoh"\n`;
      csv += `"Yalpi rentabellik marjasi (Gross Margin)";"${marginPercent}%";"Tushumdan olinadigan yalpi foyda ulushi"\n`;
      csv += `"Sof rentabellik darajasi (ROS)";"${netProfitShare}%";"Har 100 so'm savdodan sof qolgan foyda"\n`;
      csv += `"Operatsion xarajatlar yuki";"${totalRevenue > 0 ? ((totalExpenses / totalRevenue) * 100).toFixed(1) : 0}%";"Tushumga nisbatan sarflangan xarajatlar ulushi"\n`;
      csv += `"O'rtacha kunlik savdo aylanmasi";"${avgDaily}";"${daysDiff} kunlik o'rtacha kunlik tushum"\n`;
      csv += `"Maksimal bir kunlik tushum";"${maxRevenue}";"Davr ichidagi eng yuqori kunlik savdo"\n\n`;

      // 4. Kunlik savdo dinamikasi
      if (chartData && chartData.length > 0) {
        csv += `"KUNLIK SAVDO VA DAROMAD DINAMIKASI"\n`;
        csv += `"Sana / Davr";"Savdo tushumi (so'm)";"Yalpi foyda (so'm)";"Sotuv operatsiyalari soni"\n`;
        chartData.forEach((row) => {
          csv += `"${row.period}";"${row.revenue}";"${row.profit}";"${row.saleCount || 0}"\n`;
        });
        csv += `\n`;
      }

      // 5. Eng ko'p sotilgan tovarlar
      if (topProducts && topProducts.length > 0) {
        csv += `"ENG KO'P SOTILGAN TOVARLAR (TOP ${topProducts.length})"\n`;
        csv += `"№";"Mahsulot nomi";"O'lchov birligi";"Sotilgan miqdor";"Jami tushum (so'm)";"Foyda (so'm)"\n`;
        topProducts.forEach((p, idx) => {
          const nameClean = (p.productName || '').replace(/"/g, '""');
          csv += `"${idx + 1}";"${nameClean}";"${unitLabel(p.unit)}";"${p.quantitySold}";"${p.revenue}";"${p.profit}"\n`;
        });
        csv += `\n`;
      }

      // 6. Mas'ullar imzosi
      csv += `"MAS'ULLAR"\n`;
      csv += `"Korxona rahbari: ________________________ (imzo va F.I.Sh)"\n`;
      csv += `"Bosh buxgalter: ________________________ (imzo va F.I.Sh)"\n`;
      csv += `"M.O'. (Muhr o'rni)"\n`;

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Buxgalteriya_Hisoboti_${from}_${to}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(t('reports.downloadSuccess'));
    } catch (err) {
      toast.error(err.message || 'Xatolik yuz berdi');
    }
  };

  // Chop etish / PDF
  const handlePrint = () => {
    window.print();
  };

  const renderAccountingDocument = () => (
    <div
      id="accounting-official-document"
      className="printable-document bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-10 shadow-xs max-w-5xl mx-auto w-full flex flex-col gap-7 text-slate-800 dark:text-slate-200"
    >
      {/* 1. Korxona rekvizitlari va Tasdiqlash bloki */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col gap-1 max-w-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Building2 size={18} />
            </div>
            <span className="font-black text-lg text-slate-900 dark:text-slate-100 tracking-wide uppercase">
              {companyInfo?.name || 'SAVDO TIZIMI'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Manzil:</span> {companyInfo?.address || "O'zbekiston Respublikasi"}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Telefon:</span> {companyInfo?.phone || '+998'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Tarkibiy bo'linma / Filial:</span> {currentBranchName}
          </p>
        </div>

        {/* TASDIQLASH BLOKI */}
        <div className="w-full sm:w-64 p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 text-xs">
          <p className="font-bold text-center uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            {t('reports.confirmedBy', 'TASDIQLAYMAN')}
          </p>
          <p className="text-slate-600 dark:text-slate-400">Korxona rahbari: ______________</p>
          <p className="text-slate-500 dark:text-slate-500 mt-2 text-[11px]">Imzo: ___________ F.I.Sh: _________</p>
          <div className="flex items-center justify-between mt-3 text-[11px] text-slate-400">
            <span>"____" ___________ 20___ y.</span>
            <span className="font-bold text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600 px-1.5 py-0.5 rounded">M.O'.</span>
          </div>
        </div>
      </div>

      {/* 2. Hujjat sarlavhasi */}
      <div className="text-center flex flex-col gap-1.5">
        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-slate-900 dark:text-slate-100">
          {t('reports.pnlTitle', "FOYDA VA ZARARLAR TO'G'RISIDAGI MOLIYAVIY HISOBOT (P&L)")}
        </h2>
        <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold">
          {t('reports.accountingDocumentNo', 'Hisobot hujjati №')}: {docNumber}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Hisobot davri: <strong className="text-slate-800 dark:text-slate-200">{from}</strong> dan <strong className="text-slate-800 dark:text-slate-200">{to}</strong> gacha ({daysDiff} kalendar kuni)
        </p>
        <p className="text-[11px] text-slate-400 italic">
          O'lchov birligi: O'zbekiston so'mi (UZS)
        </p>
      </div>

      {/* 3. Standart Buxgalteriya Jadvali */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
              <th className="py-3 px-3 w-16 text-center border-r border-slate-200 dark:border-slate-700">{t('reports.articleCode', 'Satr kodi')}</th>
              <th className="py-3 px-4 border-r border-slate-200 dark:border-slate-700">{t('reports.indicatorName', "Ko'rsatkichlar / Moddalar nomi")}</th>
              <th className="py-3 px-4 text-right w-44 border-r border-slate-200 dark:border-slate-700">{t('reports.amountSum', "Summa (so'm)")}</th>
              <th className="py-3 px-3 text-right w-24">{t('reports.sharePercent', 'Ulushi (%)')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
            {/* I BO'LIM */}
            <tr className="bg-slate-50/80 dark:bg-slate-800/50 font-bold text-slate-600 dark:text-slate-300">
              <td colSpan={4} className="py-2 px-4 uppercase text-[11px] tracking-wider">
                I. ASOSIY FAOLIYATNING SAVDO TUSHUMI VA TANNARXI
              </td>
            </tr>
            {/* 010 */}
            <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
              <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500 border-r border-slate-100 dark:border-slate-800">010</td>
              <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800">
                Mahsulot (tovar) sotishdan olingan sof tushum
              </td>
              <td className="py-2.5 px-4 text-right font-mono font-black text-slate-900 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800">
                {money(totalRevenue)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">100.0%</td>
            </tr>
            {/* 011 */}
            <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 text-slate-600 dark:text-slate-400">
              <td className="py-2 px-3 text-center font-mono text-slate-400 border-r border-slate-100 dark:border-slate-800">011</td>
              <td className="py-2 px-4 pl-8 border-r border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 mr-1.5">—</span> shu jumladan: Naqd pul tushumi (kassa orqali)
              </td>
              <td className="py-2 px-4 text-right font-mono border-r border-slate-100 dark:border-slate-800">
                {money(cashRevenue)}
              </td>
              <td className="py-2 px-3 text-right font-mono text-slate-500">
                {totalRevenue > 0 ? `${((cashRevenue / totalRevenue) * 100).toFixed(1)}%` : '0%'}
              </td>
            </tr>
            {/* 012 */}
            <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 text-slate-600 dark:text-slate-400">
              <td className="py-2 px-3 text-center font-mono text-slate-400 border-r border-slate-100 dark:border-slate-800">012</td>
              <td className="py-2 px-4 pl-8 border-r border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 mr-1.5">—</span> shu jumladan: Bank kartalari (terminal / online)
              </td>
              <td className="py-2 px-4 text-right font-mono border-r border-slate-100 dark:border-slate-800">
                {money(cardRevenue)}
              </td>
              <td className="py-2 px-3 text-right font-mono text-slate-500">
                {totalRevenue > 0 ? `${((cardRevenue / totalRevenue) * 100).toFixed(1)}%` : '0%'}
              </td>
            </tr>
            {otherRevenue > 0 && (
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 text-slate-600 dark:text-slate-400">
                <td className="py-2 px-3 text-center font-mono text-slate-400 border-r border-slate-100 dark:border-slate-800">013</td>
                <td className="py-2 px-4 pl-8 border-r border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 mr-1.5">—</span> shu jumladan: Boshqa / aralash to'lovlar
                </td>
                <td className="py-2 px-4 text-right font-mono border-r border-slate-100 dark:border-slate-800">
                  {money(otherRevenue)}
                </td>
                <td className="py-2 px-3 text-right font-mono text-slate-500">
                  {totalRevenue > 0 ? `${((otherRevenue / totalRevenue) * 100).toFixed(1)}%` : '0%'}
                </td>
              </tr>
            )}
            {/* 020 */}
            <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
              <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500 border-r border-slate-100 dark:border-slate-800">020</td>
              <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800">
                Sotilgan tovarlarning kirim (xarid) tannarxi (COGS)
              </td>
              <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800">
                {money(totalCost)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                {totalRevenue > 0 ? `${((totalCost / totalRevenue) * 100).toFixed(1)}%` : '0%'}
              </td>
            </tr>
            {/* 030 */}
            <tr className="bg-indigo-50/50 dark:bg-indigo-950/20 font-bold border-y border-indigo-100 dark:border-indigo-900/40 text-indigo-950 dark:text-indigo-200">
              <td className="py-3 px-3 text-center font-mono font-black border-r border-indigo-100 dark:border-indigo-900/40">030</td>
              <td className="py-3 px-4 uppercase text-indigo-900 dark:text-indigo-300 border-r border-indigo-100 dark:border-indigo-900/40">
                YALPI SAVDO FOYDASI (Savdo ustamasi) [Satr 010 - Satr 020]
              </td>
              <td className="py-3 px-4 text-right font-mono font-black text-indigo-700 dark:text-indigo-400 border-r border-indigo-100 dark:border-indigo-900/40">
                {money(totalProfit)}
              </td>
              <td className="py-3 px-3 text-right font-mono font-bold text-indigo-700 dark:text-indigo-400">{marginPercent}%</td>
            </tr>

            {/* II BO'LIM */}
            <tr className="bg-slate-50/80 dark:bg-slate-800/50 font-bold text-slate-600 dark:text-slate-300">
              <td colSpan={4} className="py-2 px-4 uppercase text-[11px] tracking-wider">
                II. DAVR OPERATSION XARAJATLARI (OPEX)
              </td>
            </tr>
            {/* 040 */}
            <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
              <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500 border-r border-slate-100 dark:border-slate-800">040</td>
              <td className="py-2.5 px-4 font-bold text-rose-700 dark:text-rose-400 border-r border-slate-100 dark:border-slate-800">
                Davrning jami operatsion xarajatlari
              </td>
              <td className="py-2.5 px-4 text-right font-mono font-black text-rose-600 dark:text-rose-400 border-r border-slate-100 dark:border-slate-800">
                {money(totalExpenses)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400">
                {totalRevenue > 0 ? `${((totalExpenses / totalRevenue) * 100).toFixed(1)}%` : '0%'}
              </td>
            </tr>
            {expensesByCategory.length > 0 ? (
              expensesByCategory.map((exp, idx) => {
                const code = `04${idx + 1}`;
                const share = totalRevenue > 0 ? ((exp.amount / totalRevenue) * 100).toFixed(1) : 0;
                return (
                  <tr key={exp.category} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 text-slate-600 dark:text-slate-400">
                    <td className="py-2 px-3 text-center font-mono text-slate-400 border-r border-slate-100 dark:border-slate-800">{code}</td>
                    <td className="py-2 px-4 pl-8 border-r border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 mr-1.5">—</span> {exp.category} xarajatlari
                    </td>
                    <td className="py-2 px-4 text-right font-mono border-r border-slate-100 dark:border-slate-800">
                      {money(exp.amount)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-500">{share}%</td>
                  </tr>
                );
              })
            ) : (
              <tr className="text-slate-500 dark:text-slate-400">
                <td className="py-2 px-3 text-center font-mono text-slate-400 border-r border-slate-100 dark:border-slate-800">041</td>
                <td className="py-2 px-4 pl-8 border-r border-slate-100 dark:border-slate-800 italic">
                  — Boshqa ma'muriy, tijorat va operatsion xarajatlar
                </td>
                <td className="py-2 px-4 text-right font-mono border-r border-slate-100 dark:border-slate-800">
                  {money(totalExpenses)}
                </td>
                <td className="py-2 px-3 text-right font-mono text-slate-500">
                  {totalRevenue > 0 ? `${((totalExpenses / totalRevenue) * 100).toFixed(1)}%` : '0%'}
                </td>
              </tr>
            )}

            {/* III BO'LIM */}
            <tr className="bg-slate-50/80 dark:bg-slate-800/50 font-bold text-slate-600 dark:text-slate-300">
              <td colSpan={4} className="py-2 px-4 uppercase text-[11px] tracking-wider">
                III. YAKUNIY MOLIYAVIY NATIJA
              </td>
            </tr>
            {/* 050 */}
            <tr className={`font-black text-sm ${
              isNetPositive
                ? 'bg-emerald-500/10 text-emerald-950 dark:text-emerald-100'
                : 'bg-rose-500/10 text-rose-950 dark:text-rose-100'
            }`}>
              <td className="py-3.5 px-3 text-center font-mono text-base border-r border-slate-200 dark:border-slate-700">050</td>
              <td className="py-3.5 px-4 uppercase border-r border-slate-200 dark:border-slate-700">
                KORXONANING SOF MOLIYAVIY NATIJASI (SOF FOYDA / ZARAR) [Satr 030 - Satr 040]
              </td>
              <td className={`py-3.5 px-4 text-right font-mono text-base border-r border-slate-200 dark:border-slate-700 ${
                isNetPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {money(netProfit)}
              </td>
              <td className={`py-3.5 px-3 text-right font-mono ${
                isNetPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {totalRevenue > 0 ? `${((netProfit / totalRevenue) * 100).toFixed(1)}%` : '0%'}
              </td>
            </tr>

            {/* IV BO'LIM */}
            <tr className="bg-slate-50/80 dark:bg-slate-800/50 font-bold text-slate-600 dark:text-slate-300">
              <td colSpan={4} className="py-2 px-4 uppercase text-[11px] tracking-wider">
                IV. MA'LUMOT UCHUN AKTIVLAR VA ZAXIRALAR
              </td>
            </tr>
            {/* 060 */}
            <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 text-slate-700 dark:text-slate-300">
              <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400 border-r border-slate-100 dark:border-slate-800">060</td>
              <td className="py-2.5 px-4 border-r border-slate-100 dark:border-slate-800">
                Davr oxiriga ombor tovar aktivlari balans qiymati
              </td>
              <td className="py-2.5 px-4 text-right font-mono font-bold border-r border-slate-100 dark:border-slate-800">
                {invValue ? money(invValue.totalValue) : '—'}
              </td>
              <td className="py-2.5 px-3 text-right text-[11px] text-slate-500 font-medium">
                {invValue ? `${invValue.totalSkuCount || 0} ta SKU` : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 4. Moliyaviy samaradorlik ko'rsatkichlari */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs">
        <div>
          <span className="text-slate-500 dark:text-slate-400 text-[11px]">Yalpi marja:</span>
          <p className="font-bold text-sm text-indigo-600 dark:text-indigo-400 mt-0.5">{marginPercent}%</p>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400 text-[11px]">Sof rentabellik:</span>
          <p className={`font-bold text-sm mt-0.5 ${isNetPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {totalRevenue > 0 ? `${((netProfit / totalRevenue) * 100).toFixed(1)}%` : '0%'}
          </p>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400 text-[11px]">Xarajatlar yuki:</span>
          <p className="font-bold text-sm text-slate-700 dark:text-slate-300 mt-0.5">
            {totalRevenue > 0 ? `${((totalExpenses / totalRevenue) * 100).toFixed(1)}%` : '0%'}
          </p>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400 text-[11px]">O'rtacha kunlik savdo:</span>
          <p className="font-bold text-sm text-slate-700 dark:text-slate-300 mt-0.5">{money(avgDaily)}</p>
        </div>
      </div>

      {/* 5. Imzolar va muhr bloki */}
      <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 text-xs text-slate-700 dark:text-slate-300">
        <div className="flex flex-col gap-5 w-full sm:w-80">
          <div>
            <p className="font-bold uppercase tracking-wide text-slate-800 dark:text-slate-200">
              {t('reports.directorSign', 'Korxona rahbari')}:
            </p>
            <div className="mt-4 pt-1 border-b border-slate-400 dark:border-slate-600 flex justify-between text-[11px] text-slate-400">
              <span>(imzo)</span>
              <span>(F.I.Sh)</span>
            </div>
          </div>
          <div>
            <p className="font-bold uppercase tracking-wide text-slate-800 dark:text-slate-200">
              {t('reports.accountantSign', 'Bosh buxgalter')}:
            </p>
            <div className="mt-4 pt-1 border-b border-slate-400 dark:border-slate-600 flex justify-between text-[11px] text-slate-400">
              <span>(imzo)</span>
              <span>(F.I.Sh)</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center sm:items-end gap-2 text-center sm:text-right">
          <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 text-[11px] uppercase">
            <span className="font-bold text-sm text-slate-500">{t('reports.stampPlace', "M.O'.")}</span>
            <span className="text-[9px] text-slate-400">Muhr o'rni</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Sana: {new Date().toLocaleDateString('uz-UZ')} y.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Chop etish uchun maxsus CSS */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body, html {
            background: #ffffff !important;
            color: #000000 !important;
          }
          header, aside, nav, .no-print, button, [role="navigation"] {
            display: none !important;
          }
          .printable-document {
            display: block !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 auto !important;
            width: 100% !important;
            color: #000000 !important;
            background: #ffffff !important;
          }
          .printable-document * {
            color: #000000 !important;
            border-color: #cbd5e1 !important;
            background-color: transparent !important;
          }
        }
      `}</style>

      {/* 1. SAHIFA SARLAVHASI VA FILTRLAR TOOLBARI */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <BarChart3 size={20} />
            </div>
            {t('reports.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {t('reports.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {branches.length > 0 && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-xs">
              <Store size={14} className="text-indigo-500" />
              {currentBranchName}
            </span>
          )}

          {/* Rejimni almashtirish (Vizual tahlil / Rasmiy buxgalteriya hujjati) */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('analytics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'analytics'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <BarChart3 size={14} />
              <span>{t('reports.viewAnalytics', 'Vizual tahlil')}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('accounting')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'accounting'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <FileText size={14} />
              <span>{t('reports.viewAccountingDoc', 'Rasmiy buxgalteriya hujjati')}</span>
            </button>
          </div>

          {/* Excel CSV yuklab olish */}
          <button
            type="button"
            onClick={exportToCSV}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
            title={t('reports.downloadExcel')}
          >
            <FileSpreadsheet size={14} />
            <span>{t('reports.downloadExcel')}</span>
          </button>

          {/* Chop etish / PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-outline !text-xs !py-1.5 !px-3 flex items-center gap-1.5 cursor-pointer"
            title={t('reports.printPdf')}
          >
            <Printer size={14} />
            <span className="hidden sm:inline">{t('reports.printPdf')}</span>
          </button>

          {/* Yangilash */}
          <button
            type="button"
            onClick={reloadData}
            disabled={loading}
            className="btn btn-outline !text-xs !py-1.5 !px-3 flex items-center gap-1.5 cursor-pointer"
            title="Qayta yuklash"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Yangilash</span>
          </button>
        </div>
      </div>

      {/* 2. SANA VA DAVRNI TANLASH PANELI */}
      <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        {/* Tezkor oraliq pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {quickRanges.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setQuickRange(r.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeRange === r.key
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Sana kiritish inputlari */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">{t('reports.from')}:</span>
            <DateInput
              value={from}
              max={to}
              onChange={(val) => {
                setFrom(val);
                setActiveRange('');
              }}
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">{t('reports.to')}:</span>
            <DateInput
              value={to}
              min={from}
              onChange={(val) => {
                setTo(val);
                setActiveRange('');
              }}
            />
          </div>
          <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
            {daysDiff} {t('reports.daysCount')}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="card p-12 flex flex-col items-center justify-center gap-3 text-slate-400 text-sm">
          <RefreshCw size={24} className="animate-spin text-indigo-500" />
          <p>{t('common.loading')}</p>
        </div>
      ) : viewMode === 'accounting' ? (
        <div className="flex flex-col gap-6 w-full">
          {/* Buxgalteriya hujjati holati xabari */}
          <div className="p-3.5 px-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-300 no-print">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Foyda va zararlar to'g'risidagi buxgalteriya hujjati (P&L) shakllantirildi. Barcha ko'rsatkichlar rasmiy chop etish (PDF) va Excel yuklab olish uchun tayyor.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Printer size={13} />
                <span>Chop etish / PDF</span>
              </button>
            </div>
          </div>

          {renderAccountingDocument()}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-6 w-full no-print">
            {/* 3. HERO SOF FOYDA BANNERI */}
            <div
            className={`relative overflow-hidden rounded-2xl p-6 md:p-7 border transition-all shadow-sm ${
              isNetPositive
                ? 'bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 border-emerald-800/60 text-white'
                : 'bg-gradient-to-br from-rose-950 via-slate-900 to-slate-950 border-rose-800/60 text-white'
            }`}
          >
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                    isNetPositive
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {isNetPositive ? <TrendingUp size={28} /> : <TrendingDown size={28} />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {t('reports.netProfit')}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        isNetPositive
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {isNetPositive ? 'Foydada' : 'Zararda'}
                    </span>
                  </div>
                  <p className="text-3xl md:text-4xl font-black tracking-tight mt-1">
                    {money(netProfit)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {t('reports.netProfitHint')}
                  </p>
                </div>
              </div>

              {/* Formula & Marja ko'rsatkichi */}
              <div className="flex flex-col gap-2 md:items-end bg-white/5 backdrop-blur-xs p-4 rounded-xl border border-white/10 shrink-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Rentabellik foizi:</span>
                  <span className="font-bold text-base text-emerald-400">{marginPercent}%</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                  <span>Savdo: {money(totalRevenue)}</span>
                  <span>—</span>
                  <span>Tannarx: {money(totalCost)}</span>
                  <span>—</span>
                  <span>Xarajat: {money(totalExpenses)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. 4 TA ASOSIY MOLIYAVIY KARTA + OMBOR QIYMATI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1) Jami savdo */}
            <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('reports.totalRevenue')}
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Wallet size={18} />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {money(totalRevenue)}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
                <span>Kuniga o'rtacha:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{money(avgDaily)}</span>
              </div>
            </div>

            {/* 2) Mahsulotlar tannarxi */}
            <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('reports.totalCost')}
                </span>
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                  <Package size={18} />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {money(totalCost)}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
                <span>Savdodan ulushi:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {totalRevenue > 0 ? `${Math.round((totalCost / totalRevenue) * 100)}%` : '0%'}
                </span>
              </div>
            </div>

            {/* 3) Yalpi foyda */}
            <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('reports.totalProfit')}
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <TrendingUp size={18} />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {money(totalProfit)}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
                <span>Foyda marjasi:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{marginPercent}%</span>
              </div>
            </div>

            {/* 4) Jami xarajatlar */}
            <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('reports.totalExpenses')}
                </span>
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Receipt size={18} />
                </div>
              </div>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
                {money(totalExpenses)}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
                <span>Xarajatlar & maoshlar</span>
              </div>
            </div>
          </div>

          {/* OMBOR QIYMATI WIDGETI (Agar mavjud bo'lsa) */}
          {invValue && (
            <div className="card p-5 bg-gradient-to-r from-indigo-50/50 via-slate-50/50 to-white dark:from-indigo-950/20 dark:via-slate-900/40 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                  <Layers size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                      {t('reports.inventoryValueCard')}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300">
                      {invValue.totalSkuCount ?? 0} {t('reports.skuCount')}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {money(invValue.totalValue)}
                  </p>
                </div>
              </div>

              {invValue.branches && invValue.branches.length > 1 && (
                <div className="flex items-center gap-3 flex-wrap">
                  {invValue.branches.map((b) => (
                    <div
                      key={b.branchId}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-center gap-2"
                    >
                      <span className="text-slate-500 font-medium">{b.branchName}:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{money(b.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. GRAFIK (CHARTS): BAR / AREA */}
          <div className="card p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <BarChart3 size={18} className="text-indigo-600 dark:text-indigo-400" />
                  {t('reports.chartTitle')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Kunlar kesimida savdo tushumi va olingan foyda
                </p>
              </div>

              {/* Grafik turi tanlash (Ustunli / Chiziqli) */}
              <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setChartType('bar')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    chartType === 'bar'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <BarChart3 size={13} />
                  <span>{t('reports.chartTypeBar')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('area')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    chartType === 'area'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <LineChartIcon size={13} />
                  <span>{t('reports.chartTypeArea')}</span>
                </button>
              </div>
            </div>

            {chartData.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                <BarChart3 size={32} className="opacity-30" />
                <p className="text-sm font-medium">{t('reports.noData')}</p>
              </div>
            ) : (
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  {chartType === 'bar' ? (
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                        labelFormatter={(label) => `Sana: ${formatPeriod(label)}`}
                        formatter={(value, name) => [
                          `${Number(value).toLocaleString('uz-UZ')} ${t('reports.currency')}`,
                          name === 'revenue' ? t('reports.revenue') : t('reports.profit'),
                        ]}
                        contentStyle={{
                          backgroundColor: isDark ? '#0f172a' : '#ffffff',
                          borderColor: isDark ? '#334155' : '#e2e8f0',
                          borderRadius: '12px',
                          fontSize: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                      />
                      <Legend
                        formatter={(val) => (val === 'revenue' ? t('reports.revenue') : t('reports.profit'))}
                      />
                      <Bar
                        dataKey="revenue"
                        fill="#6366f1"
                        radius={[5, 5, 0, 0]}
                        maxBarSize={36}
                      />
                      <Bar
                        dataKey="profit"
                        fill="#10b981"
                        radius={[5, 5, 0, 0]}
                        maxBarSize={36}
                      />
                    </BarChart>
                  ) : (
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
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
                        labelFormatter={(label) => `Sana: ${formatPeriod(label)}`}
                        formatter={(value, name) => [
                          `${Number(value).toLocaleString('uz-UZ')} ${t('reports.currency')}`,
                          name === 'revenue' ? t('reports.revenue') : t('reports.profit'),
                        ]}
                        contentStyle={{
                          backgroundColor: isDark ? '#0f172a' : '#ffffff',
                          borderColor: isDark ? '#334155' : '#e2e8f0',
                          borderRadius: '12px',
                          fontSize: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                      />
                      <Legend
                        formatter={(val) => (val === 'revenue' ? t('reports.revenue') : t('reports.profit'))}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                      />
                      <Area
                        type="monotone"
                        dataKey="profit"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorProfit)"
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* 6. ENG KO'P SOTILGAN TOVARLAR (TOP 10) */}
          <div className="card p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Award size={18} className="text-amber-500" />
                  {t('reports.topProductsTitle')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Sotuv soni bo'yicha eng yetakchi mahsulotlar
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                Top {topProducts.length}
              </span>
            </div>

            {topProducts.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2.5 text-slate-400">
                <Package size={32} className="opacity-30" />
                <p className="text-sm font-medium">{t('reports.noData')}</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-500 uppercase tracking-wider font-semibold">
                      <th className="py-2.5 px-3 w-12 text-center">{t('reports.rank')}</th>
                      <th className="py-2.5 px-3">{t('reports.product')}</th>
                      <th className="py-2.5 px-3 w-28 text-center">{t('reports.quantitySold')}</th>
                      <th className="py-2.5 px-3 text-right">{t('reports.totalRevenue')}</th>
                      <th className="py-2.5 px-3 text-right">{t('reports.totalProfit')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {topProducts.map((p, idx) => {
                      const qty = Number(p.quantitySold || 0);
                      const percent = Math.round((qty / maxSoldQty) * 100);

                      return (
                        <tr
                          key={p.productId}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-3 px-3 text-center">
                            {idx === 0 ? (
                              <span className="inline-flex w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-black text-xs items-center justify-center shadow-xs">
                                1
                              </span>
                            ) : idx === 1 ? (
                              <span className="inline-flex w-6 h-6 rounded-full bg-slate-300 text-slate-800 font-black text-xs items-center justify-center">
                                2
                              </span>
                            ) : idx === 2 ? (
                              <span className="inline-flex w-6 h-6 rounded-full bg-amber-600/30 text-amber-600 font-black text-xs items-center justify-center">
                                3
                              </span>
                            ) : (
                              <span className="font-mono text-slate-400 font-semibold">{idx + 1}</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                              {p.productName}
                            </p>
                            <span className="text-[11px] text-slate-400">
                              Birlik: {unitLabel(p.unit)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {qty} {unitLabel(p.unit)}
                              </span>
                              <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-indigo-500"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                            {Number(p.revenue).toLocaleString('uz-UZ')} so'm
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            +{Number(p.profit).toLocaleString('uz-UZ')} so'm
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </div>
          {/* Faqat chop etilganda (print vaqtida) chiqadigan rasmiy buxgalteriya hujjati */}
          <div className="hidden print:block w-full">
            {renderAccountingDocument()}
          </div>
        </>
      )}
    </div>
  );
}
