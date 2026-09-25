import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { History } from 'lucide-react';
import { useDefaultBranchId } from '../../hooks/useDefaultBranchId';
import LoadErrorPanel from '../../components/ui/LoadErrorPanel';
import { useUnits } from '../../hooks/useUnits';
import { productService, stockMovementService } from '../../services/api';
import InventoryTabs from './InventoryTabs';
import DateInput from '../../components/ui/DateInput';

const MOVEMENT_TYPES = ['RECEIPT', 'SALE', 'ADJUSTMENT', 'TRANSFER'];

const TYPE_BADGE = {
  RECEIPT: 'badge-green',
  SALE: 'badge-red',
  ADJUSTMENT: 'badge-amber',
  TRANSFER: 'badge-blue',
};

const REFERENCE_LABEL_KEY = {
  GOODS_RECEIPT: 'refReceipt',
  SALE: 'refSale',
  STOCK_TRANSFER: 'refTransfer',
};

export default function MovementsPage() {
  const { t } = useTranslation();
  const { unitLabel } = useUnits();
  const { branchId, error: branchError, retry: retryBranch } = useDefaultBranchId();
  const [products, setProducts] = useState([]);
  const [productFilter, setProductFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtr pikeri uchun: mahsulotlar ro'yxati (barchasi).
  useEffect(() => {
    let cancelled = false;
    productService
      .list({})
      .then((res) => {
        if (!cancelled) setProducts(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Filtrlar o'zgarganda harakatlar tarixini qayta yuklaymiz.
  useEffect(() => {
    if (!branchId) return undefined;
    let cancelled = false;
    stockMovementService
      .list({
        branchId,
        productId: productFilter || undefined,
        type: typeFilter || undefined,
        from: from || undefined,
        to: to || undefined,
      })
      .then((res) => {
        if (!cancelled) setMovements(res.data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('inventory.movements.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, productFilter, typeFilter, from, to, t]);

  const formatDateTime = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleString('uz-UZ', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const referenceLabel = (m) => {
    if (!m.referenceType) return '—';
    const key = REFERENCE_LABEL_KEY[m.referenceType];
    const label = key ? t(`inventory.movements.${key}`) : m.referenceType;
    return m.referenceId ? `${label} #${m.referenceId}` : label;
  };

  return (
    <div className="flex flex-col gap-6">
      <InventoryTabs />

      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('inventory.movements.title')}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('inventory.movements.subtitle')}</p>
      </div>

      <div className="card p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pos-chip-row">
          <button
            type="button"
            onClick={() => setTypeFilter('')}
            className={`pos-chip ${typeFilter === '' ? 'pos-chip-active' : ''}`}
          >
            {t('inventory.movements.allTypes')}
          </button>
          {MOVEMENT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTypeFilter(type)}
              className={`pos-chip ${typeFilter === type ? 'pos-chip-active' : ''}`}
            >
              {t(`inventory.movements.types.${type}`)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="field-label">{t('inventory.transfers.product')}</label>
            <select className="input-field min-w-[180px]" value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
              <option value="">{t('inventory.movements.allProducts')}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">{t('reports.from')}</label>
            <DateInput value={from} max={to || undefined} onChange={setFrom} />
          </div>
          <div>
            <label className="field-label">{t('reports.to')}</label>
            <DateInput value={to} min={from || undefined} onChange={setTo} />
          </div>
        </div>
      </div>

      {branchError ? (
        <LoadErrorPanel onRetry={retryBranch} />
      ) : loading ? (
        <div className="text-slate-500 dark:text-slate-400 text-sm">{t('common.loading')}</div>
      ) : movements.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <History size={24} className="text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('inventory.movements.empty')}</p>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('inventory.movements.date')}</th>
                <th>{t('inventory.transfers.product')}</th>
                <th>{t('inventory.movements.type')}</th>
                <th>{t('inventory.stock.quantity')}</th>
                <th>{t('inventory.movements.reference')}</th>
                <th>{t('inventory.receipts.note')}</th>
                <th>{t('inventory.transfers.performedBy')}</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td className="text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatDateTime(m.createdAt)}</td>
                  <td className="font-medium text-slate-900 dark:text-slate-100">{m.productName}</td>
                  <td>
                    <span className={`badge ${TYPE_BADGE[m.type] || 'badge-slate'}`}>
                      {t(`inventory.movements.types.${m.type}`)}
                    </span>
                  </td>
                  <td className={`font-semibold ${Number(m.quantity) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {Number(m.quantity) >= 0 ? '+' : ''}
                    {Number(m.quantity).toLocaleString('uz-UZ')} {unitLabel(m.unit)}
                  </td>
                  <td className="text-slate-600 dark:text-slate-300 whitespace-nowrap">{referenceLabel(m)}</td>
                  <td className="text-slate-600 dark:text-slate-300">{m.note || '—'}</td>
                  <td className="text-slate-600 dark:text-slate-300">{m.createdByUserName || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
