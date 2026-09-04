import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { branchService, goodsReceiptService, productService, supplierService } from '../../services/api';

export default function ReceiptCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isOwner } = useTenantAuthContext();

  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(isOwner ? '' : (user?.branchId ?? ''));
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);

  const {
    register,
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      supplierId: '',
      receiptDate: new Date().toISOString().slice(0, 10),
      note: '',
      items: [{ productId: '', quantity: '', unitCost: '' }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = useWatch({ control, name: 'items' });

  useEffect(() => {
    let cancelled = false;
    const tasks = [supplierService.list(), productService.list({})];
    if (isOwner) tasks.push(branchService.list());

    Promise.all(tasks)
      .then((results) => {
        if (cancelled) return;
        setSuppliers(results[0].data);
        setProducts(results[1].data.filter((p) => p.isActive));
        if (isOwner && results[2]) {
          setBranches(results[2].data);
          setBranchId((prev) => prev || results[2].data[0]?.id || '');
        }
      })
      .catch(() => {
        if (!cancelled) toast.error(t('inventory.receipts.loadError'));
      });
    return () => {
      cancelled = true;
    };
  }, [isOwner, t]);

  const rowSubtotal = (item) => {
    const qty = Number(item?.quantity) || 0;
    const cost = Number(item?.unitCost) || 0;
    return qty * cost;
  };

  const grandTotal = (watchedItems || []).reduce((sum, item) => sum + rowSubtotal(item), 0);

  const onSubmit = async (data) => {
    if (!branchId) return;
    const items = data.items
      .filter((it) => it.productId && it.quantity)
      .map((it) => ({
        productId: it.productId,
        quantity: Number(it.quantity),
        unitCost: Number(it.unitCost || 0),
      }));

    if (items.length === 0) {
      toast.error(t('inventory.receipts.itemsRequired'));
      return;
    }

    const payload = {
      branchId,
      supplierId: data.supplierId || null,
      receiptDate: data.receiptDate || null,
      note: data.note || null,
      items,
    };

    try {
      await goodsReceiptService.create(payload);
      toast.success(t('inventory.receipts.createSuccess'));
      navigate('/inventory/receipts');
    } catch (err) {
      toast.error(err.response?.data?.message || t('inventory.receipts.createError'));
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8">
      <button
        type="button"
        onClick={() => navigate('/inventory/receipts')}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm font-medium w-fit cursor-pointer"
      >
        <ArrowLeft size={16} />
        {t('inventory.receipts.back')}
      </button>

      <div>
        <h1 className="text-xl font-bold text-slate-900">{t('inventory.receipts.newReceipt')}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-7 flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {isOwner && (
            <div>
              <label className="field-label">{t('inventory.receipts.branch')}</label>
              <select className="input-field" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="field-label">{t('inventory.receipts.supplier')}</label>
            <select className="input-field" {...register('supplierId')}>
              <option value="">{t('inventory.receipts.noSupplier')}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">{t('inventory.receipts.date')}</label>
            <input type="date" className="input-field" {...register('receiptDate')} />
          </div>
        </div>

        <div>
          <label className="field-label">{t('inventory.receipts.note')}</label>
          <input type="text" className="input-field" placeholder={t('inventory.receipts.notePlaceholder')} {...register('note')} />
        </div>

        <div className="flex flex-col gap-3">
          <p className="field-label mb-0">{t('inventory.receipts.items')}</p>
          <div className="table-wrap border border-slate-200 rounded-lg">
            <table>
              <thead>
                <tr>
                  <th>{t('inventory.receipts.product')}</th>
                  <th>{t('inventory.receipts.quantity')}</th>
                  <th>{t('inventory.receipts.unitCost')}</th>
                  <th>{t('inventory.receipts.subtotal')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => (
                  <tr key={field.id}>
                    <td className="min-w-[180px]">
                      <select className="input-field" {...register(`items.${index}.productId`)}>
                        <option value="">{t('inventory.receipts.selectProduct')}</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="min-w-[110px]">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        className="input-field"
                        {...register(`items.${index}.quantity`)}
                      />
                    </td>
                    <td className="min-w-[130px]">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="input-field"
                        {...register(`items.${index}.unitCost`)}
                      />
                    </td>
                    <td className="text-slate-600 whitespace-nowrap">
                      {rowSubtotal(watchedItems?.[index]).toLocaleString('uz-UZ')}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                        className="btn-icon danger"
                        title={t('inventory.receipts.removeRow')}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={() => append({ productId: '', quantity: '', unitCost: '' })}
            className="btn btn-outline w-fit"
          >
            <Plus size={16} />
            {t('inventory.receipts.addRow')}
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <span className="text-slate-500 text-sm font-semibold">{t('inventory.receipts.grandTotal')}:</span>
          <span className="text-slate-900 text-lg font-bold">{grandTotal.toLocaleString('uz-UZ')}</span>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => navigate('/inventory/receipts')} className="btn btn-outline">
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={isSubmitting || !branchId} className="btn btn-primary">
            {t('common.create')}
          </button>
        </div>
      </form>
    </div>
  );
}
