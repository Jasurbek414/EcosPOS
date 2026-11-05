import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { ClipboardList, Plus, Search, X } from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { useDefaultBranchId } from '../../hooks/useDefaultBranchId';
import LoadErrorPanel from '../../components/ui/LoadErrorPanel';
import { useUnits } from '../../hooks/useUnits';
import { goodsReceiptService, supplierService } from '../../services/api';
import InventoryTabs from './InventoryTabs';
import DateInput from '../../components/ui/DateInput';
import TableSkeleton from '../../components/ui/TableSkeleton';

function ReceiptDetailModal({ receipt, onClose }) {
  const { t } = useTranslation();
  const { unitLabel } = useUnits();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    goodsReceiptService
      .get(receipt.id)
      .then((res) => {
        if (!cancelled) setDetail(res.data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('inventory.receipts.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [receipt.id, t]);

  const formatDate = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">{t('inventory.receipts.receiptDetail.title')}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          {loading || !detail ? (
            <div className="text-slate-500 dark:text-slate-400 text-sm">{t('common.loading')}</div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wide">{t('inventory.receipts.date')}</p>
                  <p className="text-slate-900 dark:text-slate-100 font-medium mt-0.5">{formatDate(detail.receiptDate)}</p>
                </div>
                <div>
                  <p className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wide">{t('inventory.receipts.supplier')}</p>
                  <p className="text-slate-900 dark:text-slate-100 font-medium mt-0.5">{detail.supplierName || t('inventory.receipts.noSupplier')}</p>
                </div>
                {detail.note && (
                  <div className="col-span-2 sm:col-span-3">
                    <p className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wide">{t('inventory.receipts.note')}</p>
                    <p className="text-slate-900 dark:text-slate-100 mt-0.5">{detail.note}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="field-label">{t('inventory.receipts.receiptDetail.items')}</p>
                <div className="table-wrap border border-slate-200 dark:border-slate-700 rounded-lg">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('inventory.receipts.product')}</th>
                        <th>{t('inventory.receipts.receiptDetail.quantity')}</th>
                        <th>{t('inventory.receipts.unitCost')}</th>
                        <th>{t('inventory.receipts.receiptDetail.subtotal')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detail.items || []).map((item) => (
                        <tr key={item.id}>
                          <td className="font-medium text-slate-900 dark:text-slate-100">{item.productName}</td>
                          <td className="text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {Number(item.quantity).toLocaleString('uz-UZ')} {unitLabel(item.unit)}
                          </td>
                          <td className="text-slate-600 dark:text-slate-300">{Number(item.unitCost).toLocaleString('uz-UZ')}</td>
                          <td className="text-slate-600 dark:text-slate-300">{Number(item.subtotal).toLocaleString('uz-UZ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400 text-sm font-semibold">{t('inventory.receipts.grandTotal')}:</span>
                <span className="text-slate-900 dark:text-slate-100 text-lg font-bold">{Number(detail.totalAmount).toLocaleString('uz-UZ')}</span>
              </div>
            </>
          )}

          <div className="flex justify-end">
            <button type="button" onClick={onClose} className="btn btn-outline">
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReceiptsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isManager } = useTenantAuthContext();
  const { branchId, error: branchError, retry: retryBranch } = useDefaultBranchId();
  const [suppliers, setSuppliers] = useState([]);
  const [supplierFilter, setSupplierFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Filtr pikeri uchun ta'minotchilar ro'yxati — bir marta yuklanadi.
  useEffect(() => {
    let cancelled = false;
    supplierService
      .list()
      .then((res) => {
        if (!cancelled) setSuppliers(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Tanlangan filial yoki ta'minotchi filtri o'zgarganda kirimlar ro'yxatini yuklaymiz.
  useEffect(() => {
    if (!branchId) return undefined;
    let cancelled = false;
    goodsReceiptService
      .list({ branchId, supplierId: supplierFilter || undefined })
      .then((res) => {
        if (!cancelled) setReceipts(res.data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('inventory.receipts.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, supplierFilter, t]);

  const formatDate = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  // Qidiruv (ta'minotchi nomi bo'yicha) va sana oralig'i — mijoz tomonida filtrlanadi.
  const filteredReceipts = useMemo(() => {
    const search = searchInput.trim().toLowerCase();
    return receipts.filter((r) => {
      if (search && !(r.supplierName || '').toLowerCase().includes(search)) return false;
      if (from && (!r.receiptDate || r.receiptDate < from)) return false;
      if (to && (!r.receiptDate || r.receiptDate > to)) return false;
      return true;
    });
  }, [receipts, searchInput, from, to]);

  return (
    <div className="flex flex-col gap-6">
      <InventoryTabs />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('inventory.receipts.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('inventory.receipts.subtitle')}</p>
        </div>
        {isManager && branchId && (
          <button type="button" onClick={() => navigate('/inventory/receipts/new')} className="btn btn-primary">
            <Plus size={16} />
            {t('inventory.receipts.newReceipt')}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            className="input-field !pl-9"
            placeholder={t('inventory.receipts.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <select className="input-field max-w-xs" value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)}>
          <option value="">{t('inventory.receipts.allSuppliers')}</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <div>
          <label className="field-label">{t('reports.from')}</label>
          <DateInput value={from} max={to || undefined} onChange={setFrom} />
        </div>
        <div>
          <label className="field-label">{t('reports.to')}</label>
          <DateInput value={to} min={from || undefined} onChange={setTo} />
        </div>
      </div>

      {branchError ? (
        <LoadErrorPanel onRetry={retryBranch} />
      ) : loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : filteredReceipts.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <ClipboardList size={24} className="text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('inventory.receipts.empty')}</p>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('inventory.receipts.date')}</th>
                <th>{t('inventory.receipts.supplier')}</th>
                <th>{t('inventory.receipts.itemCount')}</th>
                <th>{t('inventory.receipts.total')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceipts.map((r) => (
                <tr key={r.id} onClick={() => setSelectedReceipt(r)} className="cursor-pointer">
                  <td className="text-slate-600 dark:text-slate-300">{formatDate(r.receiptDate)}</td>
                  <td className="font-medium text-slate-900 dark:text-slate-100">{r.supplierName || t('inventory.receipts.noSupplier')}</td>
                  <td className="text-slate-600 dark:text-slate-300">{r.itemCount}</td>
                  <td className="text-slate-600 dark:text-slate-300">{Number(r.totalAmount).toLocaleString('uz-UZ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedReceipt && (
        <ReceiptDetailModal receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
      )}
    </div>
  );
}
