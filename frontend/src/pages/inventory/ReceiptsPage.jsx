import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { ClipboardList, Plus } from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { branchService, goodsReceiptService } from '../../services/api';
import InventoryTabs from './InventoryTabs';

export default function ReceiptsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isOwner, isManager } = useTenantAuthContext();
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(isOwner ? '' : (user?.branchId ?? ''));
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Faqat OWNER uchun: filiallar ro'yxatini yuklab, birinchisini standart qilib tanlaymiz.
  useEffect(() => {
    if (!isOwner) return undefined;
    let cancelled = false;
    branchService
      .list()
      .then((res) => {
        if (cancelled) return;
        setBranches(res.data);
        const firstId = res.data[0]?.id || '';
        setBranchId((prev) => prev || firstId);
        if (!firstId) setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOwner]);

  // Tanlangan filial o'zgarganda kirimlar ro'yxatini yuklaymiz.
  useEffect(() => {
    if (!branchId) return undefined;
    let cancelled = false;
    goodsReceiptService
      .list(branchId)
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
  }, [branchId, t]);

  const formatDate = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  return (
    <div className="flex flex-col gap-6">
      <InventoryTabs />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('inventory.receipts.title')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('inventory.receipts.subtitle')}</p>
        </div>
        {isManager && branchId && (
          <button type="button" onClick={() => navigate('/inventory/receipts/new')} className="btn btn-primary">
            <Plus size={16} />
            {t('inventory.receipts.newReceipt')}
          </button>
        )}
      </div>

      {isOwner && (
        <select className="input-field max-w-xs" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      )}

      {loading ? (
        <div className="text-slate-500 text-sm">{t('common.loading')}</div>
      ) : receipts.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
            <ClipboardList size={24} className="text-slate-400" />
          </div>
          <p className="text-slate-500 text-sm">{t('inventory.receipts.empty')}</p>
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
              {receipts.map((r) => (
                <tr key={r.id}>
                  <td className="text-slate-600">{formatDate(r.receiptDate)}</td>
                  <td className="font-medium text-slate-900">{r.supplierName || t('inventory.receipts.noSupplier')}</td>
                  <td className="text-slate-600">{r.itemCount}</td>
                  <td className="text-slate-600">{Number(r.totalAmount).toLocaleString('uz-UZ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
