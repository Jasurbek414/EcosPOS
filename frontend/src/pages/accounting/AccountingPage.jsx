import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Wallet, Layers, ClipboardList, ReceiptText, X } from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { useUnits } from '../../hooks/useUnits';
import { branchService, cashShiftService, reportService, saleService } from '../../services/api';
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

// POSPage.jsx'dagi CloseShiftResult bilan bir xil rang/kelishuv: diff === 0 -> moslik,
// diff > 0 -> ortiqcha, diff < 0 -> kamomad. Shu yerda ham bir xil ma'no takrorlanadi
// (kassa smenalari tarixida), shuning uchun aynan shu konvensiya saqlanadi.
function diffClassName(diff) {
  if (diff === 0) return 'text-emerald-600';
  return diff > 0 ? 'text-amber-600' : 'text-red-600';
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content !max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">
            {t('accounting.saleDetail.title')} #{saleId}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 flex flex-col gap-5">
          {loading ? (
            <div className="text-slate-500 dark:text-slate-400 text-sm">{t('common.loading')}</div>
          ) : !sale ? (
            <div className="text-slate-500 dark:text-slate-400 text-sm">{t('accounting.empty')}</div>
          ) : (
            <>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                  {t('accounting.saleDetail.items')}
                </h4>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('pos.terminal.product')}</th>
                        <th>{t('pos.terminal.quantity')}</th>
                        <th>{t('accounting.saleDetail.unitPrice')}</th>
                        <th>{t('accounting.saleDetail.subtotal')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sale.items.map((item) => (
                        <tr key={item.id}>
                          <td className="font-medium text-slate-900 dark:text-slate-100">{item.productName}</td>
                          <td className="text-slate-600 dark:text-slate-300">
                            {item.quantity} {unitLabel(item.unit)}
                          </td>
                          <td className="text-slate-600 dark:text-slate-300 tabular-nums">{Number(item.unitPrice).toLocaleString('uz-UZ')}</td>
                          <td className="text-slate-600 dark:text-slate-300 tabular-nums">{Number(item.subtotal).toLocaleString('uz-UZ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-sm border-t border-slate-200 dark:border-slate-700 pt-4">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">{t('pos.terminal.total')}</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">{Number(sale.totalAmount).toLocaleString('uz-UZ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">{t('accounting.paymentMethod')}</span>
                  <span className="text-slate-900 dark:text-slate-100 font-medium">
                    {t(`pos.terminal.${sale.paymentMethod === 'CARD' ? 'card' : sale.paymentMethod === 'MIXED' ? 'mixed' : 'cash'}`)}
                  </span>
                </div>
                {sale.paymentMethod === 'MIXED' && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{t('accounting.saleDetail.cardPortion')}</span>
                    <span className="text-slate-900 dark:text-slate-100 tabular-nums">{Number(sale.cardAmount).toLocaleString('uz-UZ')}</span>
                  </div>
                )}
                {(sale.paymentMethod === 'CASH' || sale.paymentMethod === 'MIXED') && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">{t('accounting.saleDetail.amountPaid')}</span>
                      <span className="text-slate-900 dark:text-slate-100 tabular-nums">{Number(sale.amountPaid).toLocaleString('uz-UZ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">{t('accounting.saleDetail.change')}</span>
                      <span className="text-slate-900 dark:text-slate-100 tabular-nums">{Number(sale.changeAmount).toLocaleString('uz-UZ')}</span>
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
  const { user, isOwner } = useTenantAuthContext();
  const { unitLabel } = useUnits();

  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(isOwner ? '' : (user?.branchId ?? ''));

  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return toISODate(d);
  });
  const [to, setTo] = useState(() => toISODate(new Date()));

  // Har bir bo'lim mustaqil useState/useEffect bilan yuklanadi (StockPage.jsx'dagi
  // konvensiya) — sekin so'rov boshqa bo'limlarni bloklamasligi uchun.
  const [inventoryValue, setInventoryValue] = useState(null);
  const [inventoryLoading, setInventoryLoading] = useState(true);

  const [shifts, setShifts] = useState([]);
  const [shiftsLoading, setShiftsLoading] = useState(true);

  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [selectedSaleId, setSelectedSaleId] = useState(null);

  // Faqat OWNER uchun: filiallar ro'yxati (filtr + filial nomlarini ko'rsatish uchun).
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

  const branchNameById = useMemo(() => {
    const map = {};
    branches.forEach((b) => {
      map[b.id] = b.name;
    });
    return map;
  }, [branches]);

  // 1) Ombor qiymati — nuqta-vaqt ko'rinishi, sana oralig'i qabul qilmaydi.
  useEffect(() => {
    let cancelled = false;
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

  // 2) Kassa smenalar tarixi.
  useEffect(() => {
    let cancelled = false;
    const params = { from, to };
    if (branchId) params.branchId = branchId;
    cashShiftService
      .list(params)
      .then((res) => {
        if (cancelled) return;
        // Backend OWNER "hamma filial" so'ralganda har bir filial ro'yxatini alohida
        // birma-bir ulaydi (har biri o'zi ichida id bo'yicha kamayish tartibida), shuning
        // uchun bir nechta filial bo'lsa umumiy ro'yxat vaqt bo'yicha aralashib qolishi
        // mumkin — shu yerda mijoz tomonida openedAt bo'yicha kamayish tartibida saralaymiz.
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

  // 3) Sotuvlar jurnali.
  useEffect(() => {
    let cancelled = false;
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
  const dateTime = (v) => (v ? new Date(v).toLocaleString('uz-UZ') : '—');

  const paymentMethodLabel = (method) => t(`pos.terminal.${method === 'CARD' ? 'card' : method === 'MIXED' ? 'mixed' : 'cash'}`);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('accounting.title')}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('accounting.subtitle')}</p>
      </div>

      {/* Filtr paneli — quyidagi barcha 3 bo'lim uchun umumiy */}
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
            <DateInput value={from} max={to} onChange={setFrom} />
          </div>
          <div>
            <label className="field-label">{t('reports.to')}</label>
            <DateInput value={to} min={from} onChange={setTo} />
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

      {/* 1) Ombor qiymati */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">{t('accounting.inventoryValueTitle')}</h2>
        {inventoryLoading ? (
          <div className="text-slate-500 dark:text-slate-400 text-sm">{t('common.loading')}</div>
        ) : !inventoryValue ? (
          <div className="text-slate-500 dark:text-slate-400 text-sm">{t('accounting.empty')}</div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
                  <Wallet size={22} />
                </div>
                <div className="min-w-0">
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide truncate">{t('accounting.totalValue')}</p>
                  <p className="text-slate-900 dark:text-slate-100 text-xl font-bold mt-0.5 truncate">{money(inventoryValue.totalValue)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-violet-50 text-violet-600">
                  <Layers size={22} />
                </div>
                <div className="min-w-0">
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide truncate">{t('accounting.totalSkuCount')}</p>
                  <p className="text-slate-900 dark:text-slate-100 text-xl font-bold mt-0.5 truncate">{inventoryValue.totalSkuCount}</p>
                </div>
              </div>
            </div>

            {!branchId && inventoryValue.branches?.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">{t('accounting.branchBreakdown')}</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('reports.branch')}</th>
                        <th>{t('accounting.totalValue')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryValue.branches.map((b) => (
                        <tr key={b.branchId}>
                          <td className="font-medium text-slate-900 dark:text-slate-100">{b.branchName}</td>
                          <td className="text-slate-600 dark:text-slate-300 tabular-nums">{money(b.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2) Kassa smenalar tarixi */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">{t('accounting.cashShiftLedgerTitle')}</h2>
        {shiftsLoading ? (
          <div className="text-slate-500 dark:text-slate-400 text-sm">{t('common.loading')}</div>
        ) : shifts.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <ClipboardList size={24} className="text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('accounting.empty')}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('accounting.opened')}</th>
                  <th>{t('accounting.closed')}</th>
                  <th>{t('accounting.cashier')}</th>
                  {isOwner && <th>{t('reports.branch')}</th>}
                  <th>{t('accounting.openingCash')}</th>
                  <th>{t('accounting.closingCash')}</th>
                  <th>{t('accounting.expectedCash')}</th>
                  <th>{t('accounting.difference')}</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((s) => {
                  const isOpen = s.status === 'OPEN';
                  const diff = Number(s.cashDifference);
                  const diffLabel = diff === 0 ? t('pos.closeResult.match') : diff > 0 ? t('pos.closeResult.surplus') : t('pos.closeResult.shortage');
                  return (
                    <tr key={s.id}>
                      <td className="text-slate-600 dark:text-slate-300 whitespace-nowrap">{dateTime(s.openedAt)}</td>
                      <td className="whitespace-nowrap">
                        {isOpen ? (
                          <span className="badge badge-blue">{t('accounting.stillOpen')}</span>
                        ) : (
                          <span className="text-slate-600 dark:text-slate-300">{dateTime(s.closedAt)}</span>
                        )}
                      </td>
                      <td className="font-medium text-slate-900 dark:text-slate-100">{s.cashierName}</td>
                      {isOwner && <td className="text-slate-600 dark:text-slate-300">{branchNameById[s.branchId] || '—'}</td>}
                      <td className="text-slate-600 dark:text-slate-300 tabular-nums">{Number(s.openingCash).toLocaleString('uz-UZ')}</td>
                      <td className="text-slate-600 dark:text-slate-300 tabular-nums">{s.closingCash != null ? Number(s.closingCash).toLocaleString('uz-UZ') : '—'}</td>
                      <td className="text-slate-600 dark:text-slate-300 tabular-nums">{s.expectedCash != null ? Number(s.expectedCash).toLocaleString('uz-UZ') : '—'}</td>
                      <td className={`font-semibold tabular-nums ${s.cashDifference != null ? diffClassName(diff) : 'text-slate-400 dark:text-slate-500'}`}>
                        {s.cashDifference != null ? `${diff > 0 ? '+' : ''}${diff.toLocaleString('uz-UZ')} (${diffLabel})` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3) Sotuvlar jurnali */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">{t('accounting.salesJournalTitle')}</h2>
        {salesLoading ? (
          <div className="text-slate-500 dark:text-slate-400 text-sm">{t('common.loading')}</div>
        ) : sales.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <ReceiptText size={24} className="text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('accounting.empty')}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('common.createdAt')}</th>
                  <th>{t('accounting.cashier')}</th>
                  {isOwner && <th>{t('reports.branch')}</th>}
                  <th>{t('accounting.paymentMethod')}</th>
                  <th>{t('accounting.itemCount')}</th>
                  <th>{t('pos.terminal.total')}</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} onClick={() => setSelectedSaleId(s.id)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td className="text-slate-600 dark:text-slate-300 whitespace-nowrap">{dateTime(s.createdAt)}</td>
                    <td className="font-medium text-slate-900 dark:text-slate-100">{s.cashierName}</td>
                    {isOwner && <td className="text-slate-600 dark:text-slate-300">{branchNameById[s.branchId] || '—'}</td>}
                    <td className="text-slate-600 dark:text-slate-300">{paymentMethodLabel(s.paymentMethod)}</td>
                    <td className="text-slate-600 dark:text-slate-300">{s.itemCount}</td>
                    <td className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{Number(s.totalAmount).toLocaleString('uz-UZ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedSaleId && <SaleDetailModal saleId={selectedSaleId} onClose={() => setSelectedSaleId(null)} unitLabel={unitLabel} />}
    </div>
  );
}
