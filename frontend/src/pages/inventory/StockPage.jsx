import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Layers, X, SlidersHorizontal } from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { branchService, stockService } from '../../services/api';
import InventoryTabs from './InventoryTabs';

function AdjustModal({ target, onClose, onAdjusted }) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { quantityDelta: '', reason: '' } });

  const onSubmit = async (data) => {
    try {
      await stockService.adjust({
        branchId: target.branchId,
        productId: target.productId,
        quantityDelta: Number(data.quantityDelta),
        reason: data.reason || null,
      });
      toast.success(t('inventory.stock.adjustSuccess'));
      onAdjusted();
    } catch (err) {
      toast.error(err.response?.data?.message || t('inventory.stock.adjustError'));
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-900">{t('inventory.stock.adjustTitle')}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-4">
          <p className="text-sm font-medium text-slate-900">{target.productName}</p>
          <div>
            <label className="field-label">{t('inventory.stock.quantityDelta')}</label>
            <input
              type="number"
              step="0.001"
              className="input-field"
              autoFocus
              {...register('quantityDelta', { required: true, validate: (v) => Number(v) !== 0 })}
            />
            <p className="text-slate-400 text-xs mt-1">{t('inventory.stock.quantityDeltaHint')}</p>
            {errors.quantityDelta && <p className="field-error">{t('common.required')}</p>}
          </div>
          <div>
            <label className="field-label">{t('inventory.stock.reason')}</label>
            <input
              type="text"
              className="input-field"
              placeholder={t('inventory.stock.reasonPlaceholder')}
              {...register('reason')}
            />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={onClose} className="btn btn-outline">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StockPage() {
  const { t } = useTranslation();
  const { user, isOwner, isManager } = useTenantAuthContext();
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(isOwner ? '' : (user?.branchId ?? ''));
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lowOnly, setLowOnly] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState(null);

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

  // Tanlangan filial yoki "faqat kam qolganlar" belgisi o'zgarganda qoldiqlarni yuklaymiz.
  useEffect(() => {
    if (!branchId) return undefined;
    let cancelled = false;
    const request = lowOnly ? stockService.low(branchId) : stockService.list(branchId);
    request
      .then((res) => {
        if (!cancelled) setStock(res.data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('inventory.stock.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, lowOnly, t]);

  const reload = useCallback(async () => {
    if (!branchId) return;
    try {
      const res = lowOnly ? await stockService.low(branchId) : await stockService.list(branchId);
      setStock(res.data);
    } catch {
      toast.error(t('inventory.stock.loadError'));
    }
  }, [branchId, lowOnly, t]);

  const handleAdjusted = () => {
    setAdjustTarget(null);
    reload();
  };

  return (
    <div className="flex flex-col gap-6">
      <InventoryTabs />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('inventory.stock.title')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('inventory.stock.subtitle')}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        {isOwner && (
          <select className="input-field max-w-xs" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
          {t('inventory.stock.lowOnly')}
        </label>
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm">{t('common.loading')}</div>
      ) : stock.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
            <Layers size={24} className="text-slate-400" />
          </div>
          <p className="text-slate-500 text-sm">{t('inventory.stock.empty')}</p>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('inventory.stock.product')}</th>
                <th>{t('inventory.products.unit')}</th>
                <th>{t('inventory.stock.quantity')}</th>
                {isManager && <th>{t('common.actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {stock.map((s) => (
                <tr key={s.productId}>
                  <td className="font-medium text-slate-900">{s.productName}</td>
                  <td className="text-slate-600">{t(`inventory.units.${s.unit}`)}</td>
                  <td className="text-slate-600">{s.quantity}</td>
                  {isManager && (
                    <td>
                      <button
                        type="button"
                        onClick={() => setAdjustTarget(s)}
                        className="btn-icon"
                        title={t('inventory.stock.adjust')}
                      >
                        <SlidersHorizontal size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adjustTarget && <AdjustModal target={adjustTarget} onClose={() => setAdjustTarget(null)} onAdjusted={handleAdjusted} />}
    </div>
  );
}
