import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
  Wallet, Layers, ClipboardList, ReceiptText, X, Calculator,
  FileSpreadsheet, RefreshCw, ShoppingCart, Scale, Store,
  ChevronRight, ArrowUpRight, CheckCircle2, AlertTriangle, AlertCircle
} from 'lucide-react';
import { useDefaultBranchId } from '../../hooks/useDefaultBranchId';
import { useUnits } from '../../hooks/useUnits';
import { cashShiftService, reportService, saleService, branchService } from '../../services/api';
import DateInput from '../../components/ui/DateInput';
import AccountingTabs from './AccountingTabs';

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

function diffClassName(diff) {
  if (diff === 0) return 'text-emerald-600 dark:text-emerald-400';
  return diff > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';
}

function PaymentBadge({ method, label }) {
  switch (method) {
    case 'CASH':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
          {label}
        </span>
      );
    case 'CARD':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
          {label}
        </span>
      );
    case 'CREDIT':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
          {label}
        </span>
      );
    case 'MIXED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
          {label}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {label}
        </span>
      );
  }
}

function SaleDetailModal({ saleId, onClose, unitLabel }) {
  const { t } = useTranslation();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    saleService
      .get(saleId)
      .then((res) => {
        if (!cancelled) setSale(res.data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('accounting.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [saleId, t]);

  const paymentLabel = (method) =>
    t(`pos.terminal.${method === 'CARD' ? 'card' : method === 'MIXED' ? 'mixed' : method === 'CREDIT' ? 'credit' : 'cash'}`);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content !max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <ReceiptText size={18} />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100">
              {t('accounting.saleDetail.title')} #{saleId}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 flex flex-col gap-5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
              <RefreshCw size={22} className="animate-spin text-indigo-500" />
              <span>{t('common.loading')}</span>
            </div>
          ) : !sale ? (
            <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-sm">{t('accounting.empty')}</div>
          ) : (
            <>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                  {t('accounting.saleDetail.items')}
                </h4>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                        <th className="py-2.5 px-3">{t('pos.terminal.product')}</th>
                        <th className="py-2.5 px-3 text-center">{t('pos.terminal.quantity')}</th>
                        <th className="py-2.5 px-3 text-right">{t('accounting.saleDetail.unitPrice')}</th>
                        <th className="py-2.5 px-3 text-right">{t('accounting.saleDetail.subtotal')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {sale.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">{item.productName}</td>
                          <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-300">
                            {item.quantity} {unitLabel(item.unit)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
                            {Number(item.unitPrice).toLocaleString('uz-UZ')} so'm
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            {Number(item.subtotal).toLocaleString('uz-UZ')} so'm
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col gap-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-700 dark:text-slate-300">{t('pos.terminal.total')}:</span>
                  <span className="text-base text-indigo-600 dark:text-indigo-400 font-mono font-black">
                    {Number(sale.totalAmount).toLocaleString('uz-UZ')} so'm
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">{t('accounting.paymentMethod')}:</span>
                  <PaymentBadge method={sale.paymentMethod} label={paymentLabel(sale.paymentMethod)} />
                </div>
                {sale.paymentMethod === 'CREDIT' && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">{t('accounting.saleDetail.customer')}:</span>
                    <span className="text-slate-900 dark:text-slate-100 font-semibold">{sale.customerName || '—'}</span>
                  </div>
                )}
                {sale.paymentMethod === 'MIXED' && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">{t('accounting.saleDetail.cardPortion')}:</span>
                    <span className="text-slate-900 dark:text-slate-100 font-mono font-semibold">
                      {Number(sale.cardAmount).toLocaleString('uz-UZ')} so'm
                    </span>
                  </div>
                )}
                {(sale.paymentMethod === 'CASH' || sale.paymentMethod === 'MIXED') && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400">{t('accounting.saleDetail.amountPaid')}:</span>
                      <span className="text-slate-900 dark:text-slate-100 font-mono">
                        {Number(sale.amountPaid).toLocaleString('uz-UZ')} so'm
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400">{t('accounting.saleDetail.change')}:</span>
                      <span className="text-slate-900 dark:text-slate-100 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {Number(sale.changeAmount).toLocaleString('uz-UZ')} so'm
                      </span>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AccountingPage() {
  const { t } = useTranslation();
  const { unitLabel } = useUnits();
  const { branchId } = useDefaultBranchId();

  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return toISODate(d);
  });
  const [to, setTo] = useState(() => toISODate(new Date()));
  const [activeRange, setActiveRange] = useState('last30');

  const [branches, setBranches] = useState([]);
  const [inventoryValue, setInventoryValue] = useState(null);
  const [inventoryLoading, setInventoryLoading] = useState(true);

  const [shifts, setShifts] = useState([]);
  const [shiftsLoading, setShiftsLoading] = useState(true);

  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [selectedSaleId, setSelectedSaleId] = useState(null);

  // Filiallar ro'yxatini yuklash
  useEffect(() => {
    branchService
      .list()
      .then((res) => setBranches(res.data))
      .catch(() => setBranches([]));
  }, []);

  const daysDiff = useMemo(() => {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return Math.max(1, Math.round((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1);
  }, [from, to]);

  const currentBranchName = useMemo(() => {
    if (!branchId) return t('reports.allBranches', 'Barcha filiallar');
    return branches.find((b) => b.id === Number(branchId))?.name || 'Filial';
  }, [branchId, branches, t]);

  // 1) Ombor qiymati
  useEffect(() => {
    let cancelled = false;
    setInventoryLoading(true);
    reportService
      .inventoryValue(branchId ? { branchId } : {})
      .then((res) => {
        if (!cancelled) setInventoryValue(res.data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('accounting.loadError'));
      })
      .finally(() => {
        if (!cancelled) setInventoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, t]);

  // 2) Kassa smenalar tarixi
  useEffect(() => {
    let cancelled = false;
    setShiftsLoading(true);
    const params = { from, to };
    if (branchId) params.branchId = branchId;
    cashShiftService
      .list(params)
      .then((res) => {
        if (cancelled) return;
        const sorted = [...res.data].sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));
        setShifts(sorted);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('accounting.loadError'));
      })
      .finally(() => {
        if (!cancelled) setShiftsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, from, to, t]);

  // 3) Sotuvlar jurnali
  useEffect(() => {
    let cancelled = false;
    setSalesLoading(true);
    const params = { from, to };
    if (branchId) params.branchId = branchId;
    saleService
      .list(params)
      .then((res) => {
        if (!cancelled) setSales(res.data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('accounting.loadError'));
      })
      .finally(() => {
        if (!cancelled) setSalesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, from, to, t]);

  const reloadAll = () => {
    setInventoryLoading(true);
    setShiftsLoading(true);
    setSalesLoading(true);

    const params = { from, to };
    if (branchId) params.branchId = branchId;

    reportService
      .inventoryValue(branchId ? { branchId } : {})
      .then((res) => setInventoryValue(res.data))
      .catch(() => toast.error(t('accounting.loadError')))
      .finally(() => setInventoryLoading(false));

    cashShiftService
      .list(params)
      .then((res) => {
        const sorted = [...res.data].sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));
        setShifts(sorted);
      })
      .catch(() => toast.error(t('accounting.loadError')))
      .finally(() => setShiftsLoading(false));

    saleService
      .list(params)
      .then((res) => setSales(res.data))
      .catch(() => toast.error(t('accounting.loadError')))
      .finally(() => setSalesLoading(false));
  };

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
  const dateTime = (v) => (v ? new Date(v).toLocaleString('uz-UZ') : '—');

  const paymentMethodLabel = (method) =>
    t(`pos.terminal.${method === 'CARD' ? 'card' : method === 'MIXED' ? 'mixed' : method === 'CREDIT' ? 'credit' : 'cash'}`);

  // Jami sotuvlar summasi
  const totalSalesSum = useMemo(() => {
    return sales.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
  }, [sales]);

  // Smenalar statistikasi va tafovut
  const { openShiftsCount, closedShiftsCount, totalDifference } = useMemo(() => {
    let openCount = 0;
    let closedCount = 0;
    let diffSum = 0;
    shifts.forEach((s) => {
      if (s.status === 'OPEN') openCount++;
      else closedCount++;
      if (s.cashDifference != null) {
        diffSum += Number(s.cashDifference);
      }
    });
    return { openShiftsCount: openCount, closedShiftsCount: closedCount, totalDifference: diffSum };
  }, [shifts]);

  // Sotuvlar jurnalini Excelga yuklab olish
  const exportSalesToCSV = () => {
    try {
      const bom = '\uFEFF';
      let csv = bom;
      csv += `"SOTUVLAR JURNALI (BUXGALTERIYA)"\n`;
      csv += `"Davr:";"${from} dan ${to} gacha (${daysDiff} kun)"\n`;
      csv += `"Filial:";"${currentBranchName}"\n`;
      csv += `"Yaratilgan sana:";"${new Date().toLocaleString('uz-UZ')}"\n\n`;

      csv += `"№";"Sana va vaqt";"Kassir";"To'lov turi";"Mahsulotlar soni";"Jami summa (so'm)"\n`;
      sales.forEach((s, idx) => {
        const timeStr = s.createdAt ? new Date(s.createdAt).toLocaleString('uz-UZ') : '';
        const payStr = paymentMethodLabel(s.paymentMethod);
        csv += `"${idx + 1}";"${timeStr}";"${(s.cashierName || '').replace(/"/g, '""')}";"${payStr}";"${s.itemCount}";"${s.totalAmount}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Sotuvlar_Jurnali_${from}_${to}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Sotuvlar jurnali Excel fayli yuklab olindi");
    } catch {
      toast.error("Faylni yuklab bo'lmadi");
    }
  };

  // Kassa smenalarini Excelga yuklab olish
  const exportShiftsToCSV = () => {
    try {
      const bom = '\uFEFF';
      let csv = bom;
      csv += `"KASSA SMENALARI AUDITI (BUXGALTERIYA)"\n`;
      csv += `"Davr:";"${from} dan ${to} gacha (${daysDiff} kun)"\n`;
      csv += `"Filial:";"${currentBranchName}"\n`;
      csv += `"Yaratilgan sana:";"${new Date().toLocaleString('uz-UZ')}"\n\n`;

      csv += `"№";"Ochilgan vaqt";"Yopilgan vaqt";"Holati";"Kassir";"Boshlang'ich summa (so'm)";"Yopilish summasi (so'm)";"Kutilgan summa (so'm)";"Kassa farqi (so'm)"\n`;
      shifts.forEach((s, idx) => {
        const openStr = s.openedAt ? new Date(s.openedAt).toLocaleString('uz-UZ') : '';
        const closeStr = s.closedAt ? new Date(s.closedAt).toLocaleString('uz-UZ') : (s.status === 'OPEN' ? 'Hali ochiq' : '');
        const statusStr = s.status === 'OPEN' ? 'Ochiq' : 'Yopilgan';
        const diffStr = s.cashDifference != null ? String(s.cashDifference) : '0';
        csv += `"${idx + 1}";"${openStr}";"${closeStr}";"${statusStr}";"${(s.cashierName || '').replace(/"/g, '""')}";"${s.openingCash || 0}";"${s.closingCash ?? ''}";"${s.expectedCash ?? ''}";"${diffStr}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Kassa_Smenalari_${from}_${to}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Kassa smenalari hisoboti Excel fayli yuklab olindi");
    } catch {
      toast.error("Faylni yuklab bo'lmadi");
    }
  };

  const isAnyLoading = inventoryLoading || shiftsLoading || salesLoading;

  return (
    <div className="flex flex-col gap-6">
      {/* Yuqori tab navigatsiyasi */}
      <AccountingTabs />

      {/* 1. SAHIFA SARLAVHASI VA AMALLAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Calculator size={20} />
            </div>
            {t('accounting.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {t('accounting.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {branches.length > 0 && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-2xs">
              <Store size={14} className="text-indigo-500" />
              {currentBranchName}
            </span>
          )}

          {/* Yangilash */}
          <button
            type="button"
            onClick={reloadAll}
            disabled={isAnyLoading}
            className="btn btn-outline !text-xs !py-1.5 !px-3 flex items-center gap-1.5 cursor-pointer"
            title="Qayta yuklash"
          >
            <RefreshCw size={13} className={isAnyLoading ? 'animate-spin' : ''} />
            <span>Yangilash</span>
          </button>
        </div>
      </div>

      {/* 2. SANA VA DAVR FILTRLARI */}
      <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
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
            {daysDiff} {t('reports.daysCount', 'kunlik davr')}
          </span>
        </div>
      </div>

      {/* 3. 4 TA ASOSIY MOLIYAVIY VA AUDIT KO'RSATKICHLARI (KPI CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1) Jami sotuv tushumi */}
        <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Sotuv tushumi
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <ShoppingCart size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {money(totalSalesSum)}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
            <span>Tranzaksiyalar:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{sales.length} ta sotuv</span>
          </div>
        </div>

        {/* 2) Kassa smenalari */}
        <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Kassa smenalari
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <ClipboardList size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {shifts.length}
            </p>
            <span className="text-xs text-slate-400 font-medium">ta smena</span>
          </div>
          <div className="flex items-center gap-2 text-xs mt-2">
            {openShiftsCount > 0 ? (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {openShiftsCount} ta ochiq smena
              </span>
            ) : (
              <span className="text-slate-400">Barcha smenalar yopilgan</span>
            )}
          </div>
        </div>

        {/* 3) Kassa balansi auditi */}
        <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Kassa balansi auditi
            </span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              totalDifference === 0
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                : totalDifference > 0
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
            }`}>
              <Scale size={18} />
            </div>
          </div>
          <p className={`text-2xl font-black tracking-tight ${
            totalDifference === 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : totalDifference > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-rose-600 dark:text-rose-400'
          }`}>
            {totalDifference === 0 ? "0 so'm" : `${totalDifference > 0 ? '+' : ''}${money(totalDifference)}`}
          </p>
          <div className="text-xs text-slate-400 mt-2 truncate">
            {totalDifference === 0
              ? "Kassada tafovut yo'q (to'liq mos)"
              : totalDifference > 0
                ? "Kassada ortiqcha mablag' aniqlangan"
                : "Kassada kamomad aniqlangan"}
          </div>
        </div>

        {/* 4) Ombor tovar aktivlari */}
        <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t('accounting.inventoryValueTitle')}
            </span>
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <Layers size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {inventoryValue ? money(inventoryValue.totalValue) : '—'}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
            <span>Tovar turlari:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {inventoryValue?.totalSkuCount ?? 0} {t('reports.skuCount', 'ta SKU')}
            </span>
          </div>
        </div>
      </div>

      {/* 4. KASSA SMENALARI TARIXI VA AUDITI */}
      <div className="card p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ClipboardList size={18} className="text-indigo-600 dark:text-indigo-400" />
              {t('accounting.cashShiftLedgerTitle')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Har bir kassa smenasining ochilish, yopilish va kassa tafovuti nazorati
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportShiftsToCSV}
              disabled={shifts.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
              title="Kassa smenalarini Excel formatida yuklab olish"
            >
              <FileSpreadsheet size={13} />
              <span>Excel yuklab olish</span>
            </button>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {shifts.length} ta smena
            </span>
          </div>
        </div>

        {shiftsLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
            <RefreshCw size={22} className="animate-spin text-indigo-500" />
            <span>{t('common.loading')}</span>
          </div>
        ) : shifts.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <ClipboardList size={26} />
            </div>
            <p className="text-sm font-medium">{t('accounting.empty')}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3">{t('accounting.opened')}</th>
                  <th className="py-2.5 px-3">{t('accounting.closed')}</th>
                  <th className="py-2.5 px-3">{t('accounting.cashier')}</th>
                  <th className="py-2.5 px-3 text-right">{t('accounting.openingCash')}</th>
                  <th className="py-2.5 px-3 text-right">{t('accounting.closingCash')}</th>
                  <th className="py-2.5 px-3 text-right">{t('accounting.expectedCash')}</th>
                  <th className="py-2.5 px-3 text-right">{t('accounting.difference')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {shifts.map((s) => {
                  const isOpen = s.status === 'OPEN';
                  const diff = Number(s.cashDifference);
                  const diffLabel = diff === 0 ? t('pos.closeResult.match') : diff > 0 ? t('pos.closeResult.surplus') : t('pos.closeResult.shortage');

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{dateTime(s.openedAt)}</td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isOpen ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {t('accounting.stillOpen')}
                          </span>
                        ) : (
                          <span className="text-slate-600 dark:text-slate-300">{dateTime(s.closedAt)}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">{s.cashierName}</td>
                      <td className="py-3 px-3 text-right text-slate-600 dark:text-slate-300 font-mono">
                        {Number(s.openingCash).toLocaleString('uz-UZ')} so'm
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600 dark:text-slate-300 font-mono">
                        {s.closingCash != null ? `${Number(s.closingCash).toLocaleString('uz-UZ')} so'm` : '—'}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600 dark:text-slate-300 font-mono">
                        {s.expectedCash != null ? `${Number(s.expectedCash).toLocaleString('uz-UZ')} so'm` : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold whitespace-nowrap">
                        {s.cashDifference != null ? (
                          <span className={diffClassName(diff)}>
                            {diff > 0 ? '+' : ''}{diff.toLocaleString('uz-UZ')} so'm
                            <span className="text-[10px] font-normal ml-1 opacity-80">({diffLabel})</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. SOTUVLAR JURNALI */}
      <div className="card p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ReceiptText size={18} className="text-emerald-600 dark:text-emerald-400" />
              {t('accounting.salesJournalTitle')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Davr mobaynida amalga oshirilgan barcha kassa savdo operatsiyalari
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportSalesToCSV}
              disabled={sales.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
              title="Sotuvlar jurnalini Excel formatida yuklab olish"
            >
              <FileSpreadsheet size={13} />
              <span>Excel yuklab olish</span>
            </button>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {sales.length} ta sotuv
            </span>
          </div>
        </div>

        {salesLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
            <RefreshCw size={22} className="animate-spin text-indigo-500" />
            <span>{t('common.loading')}</span>
          </div>
        ) : sales.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <ReceiptText size={26} />
            </div>
            <p className="text-sm font-medium">{t('accounting.empty')}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3">{t('common.createdAt')}</th>
                  <th className="py-2.5 px-3">{t('accounting.cashier')}</th>
                  <th className="py-2.5 px-3 text-center">{t('accounting.paymentMethod')}</th>
                  <th className="py-2.5 px-3 text-center">{t('accounting.itemCount')}</th>
                  <th className="py-2.5 px-3 text-right">{t('pos.terminal.total')}</th>
                  <th className="py-2.5 px-3 text-center w-16">Batafsil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {sales.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedSaleId(s.id)}
                    className="cursor-pointer hover:bg-indigo-50/40 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{dateTime(s.createdAt)}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">{s.cashierName}</td>
                    <td className="py-3 px-3 text-center">
                      <PaymentBadge method={s.paymentMethod} label={paymentMethodLabel(s.paymentMethod)} />
                    </td>
                    <td className="py-3 px-3 text-center text-slate-700 dark:text-slate-300 font-semibold">
                      {s.itemCount} ta tovar
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      {Number(s.totalAmount).toLocaleString('uz-UZ')} so'm
                    </td>
                    <td className="py-3 px-3 text-center text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      <ChevronRight size={16} className="inline-block" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedSaleId && (
        <SaleDetailModal
          saleId={selectedSaleId}
          onClose={() => setSelectedSaleId(null)}
          unitLabel={unitLabel}
        />
      )}
    </div>
  );
}
