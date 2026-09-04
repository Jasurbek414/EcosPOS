import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Package, Plus, X, Pencil, Trash2, Search } from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { categoryService, productService } from '../../services/api';
import InventoryTabs from './InventoryTabs';

const UNITS = ['DONA', 'KG', 'LITR', 'QUTI'];

function ProductModal({ product, categories, onClose, onSaved, onCategoryCreated }) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      categoryId: product?.categoryId || '',
      name: product?.name || '',
      barcode: product?.barcode || '',
      unit: product?.unit || 'DONA',
      costPrice: product?.costPrice ?? '',
      salePrice: product?.salePrice ?? '',
      minStockLevel: product?.minStockLevel ?? '',
    },
  });

  const handleAddCategory = async () => {
    const name = window.prompt(t('inventory.products.newCategoryPrompt'));
    if (!name || !name.trim()) return;
    try {
      const res = await categoryService.create({ name: name.trim() });
      onCategoryCreated(res.data);
      setValue('categoryId', String(res.data.id));
    } catch (err) {
      toast.error(err.response?.data?.message || t('inventory.categories.createError'));
    }
  };

  const onSubmit = async (data) => {
    const payload = {
      categoryId: data.categoryId || null,
      name: data.name,
      barcode: data.barcode || null,
      unit: data.unit,
      costPrice: Number(data.costPrice),
      salePrice: Number(data.salePrice),
      minStockLevel: data.minStockLevel === '' ? null : Number(data.minStockLevel),
    };
    try {
      if (product) {
        await productService.update(product.id, payload);
        toast.success(t('inventory.products.updateSuccess'));
      } else {
        await productService.create(payload);
        toast.success(t('inventory.products.createSuccess'));
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || t(product ? 'inventory.products.updateError' : 'inventory.products.createError'));
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-900">
            {product ? t('inventory.products.editProduct') : t('inventory.products.newProduct')}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-4">
          <div>
            <label className="field-label">{t('inventory.products.name')}</label>
            <input
              type="text"
              className="input-field"
              placeholder={t('inventory.products.namePlaceholder')}
              autoFocus
              {...register('name', { required: true })}
            />
            {errors.name && <p className="field-error">{t('common.required')}</p>}
          </div>

          <div>
            <label className="field-label">{t('inventory.products.category')}</label>
            <div className="flex items-center gap-2">
              <select className="input-field" {...register('categoryId')}>
                <option value="">{t('inventory.products.noCategory')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button type="button" onClick={handleAddCategory} className="btn btn-outline whitespace-nowrap">
                {t('inventory.products.addCategoryInline')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">{t('inventory.products.unit')}</label>
              <select className="input-field" {...register('unit', { required: true })}>
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {t(`inventory.units.${u}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">{t('inventory.products.barcode')}</label>
              <input
                type="text"
                className="input-field"
                placeholder={t('inventory.products.barcodePlaceholder')}
                {...register('barcode')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">{t('inventory.products.costPrice')}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-field"
                {...register('costPrice', { required: true, min: 0 })}
              />
              {errors.costPrice && <p className="field-error">{t('common.required')}</p>}
            </div>
            <div>
              <label className="field-label">{t('inventory.products.salePrice')}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-field"
                {...register('salePrice', { required: true, min: 0 })}
              />
              {errors.salePrice && <p className="field-error">{t('common.required')}</p>}
            </div>
          </div>

          <div>
            <label className="field-label">{t('inventory.products.minStockLevel')}</label>
            <input
              type="number"
              step="1"
              min="0"
              className="input-field"
              placeholder={t('inventory.products.minStockLevelPlaceholder')}
              {...register('minStockLevel')}
            />
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={onClose} className="btn btn-outline">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {product ? t('common.save') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const { t } = useTranslation();
  const { isManager } = useTenantAuthContext();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // Kategoriyalarni faqat bir marta, sahifa ochilganda yuklaymiz.
  useEffect(() => {
    let cancelled = false;
    categoryService
      .list()
      .then((res) => {
        if (!cancelled) setCategories(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Qidiruv matnini debounce qilish.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => clearTimeout(handle);
  }, [searchInput]);

  // Mahsulotlarni birinchi yuklashda va filtr/qidiruv o'zgarganda qayta yuklaymiz.
  useEffect(() => {
    let cancelled = false;
    productService
      .list({ categoryId: categoryFilter || undefined, search: debouncedSearch || undefined })
      .then((res) => {
        if (!cancelled) setProducts(res.data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('inventory.products.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [categoryFilter, debouncedSearch, t]);

  const reload = useCallback(async () => {
    try {
      const res = await productService.list({ categoryId: categoryFilter || undefined, search: debouncedSearch || undefined });
      setProducts(res.data);
    } catch {
      toast.error(t('inventory.products.loadError'));
    }
  }, [categoryFilter, debouncedSearch, t]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSaved = () => {
    closeModal();
    reload();
  };

  const handleCategoryCreated = (category) => {
    setCategories((prev) => [...prev, category]);
  };

  const handleDelete = async (product) => {
    if (!window.confirm(t('inventory.products.deleteConfirm'))) return;
    try {
      await productService.remove(product.id);
      toast.success(t('inventory.products.deleteSuccess'));
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || t('inventory.products.deleteError'));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <InventoryTabs />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('inventory.products.title')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('inventory.products.subtitle')}</p>
        </div>
        {isManager && (
          <button type="button" onClick={openCreate} className="btn btn-primary">
            <Plus size={16} />
            {t('inventory.products.newProduct')}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input-field !pl-9"
            placeholder={t('inventory.products.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <select className="input-field max-w-xs" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">{t('inventory.products.allCategories')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm">{t('common.loading')}</div>
      ) : products.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
            <Package size={24} className="text-slate-400" />
          </div>
          <p className="text-slate-500 text-sm">{t('inventory.products.empty')}</p>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('inventory.products.name')}</th>
                <th>{t('inventory.products.category')}</th>
                <th>{t('inventory.products.barcode')}</th>
                <th>{t('inventory.products.unit')}</th>
                <th>{t('inventory.products.costPrice')}</th>
                <th>{t('inventory.products.salePrice')}</th>
                <th>{t('common.status')}</th>
                {isManager && <th>{t('common.actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium text-slate-900">{p.name}</td>
                  <td className="text-slate-600">{p.categoryName || '—'}</td>
                  <td className="text-slate-600 font-mono text-xs">{p.barcode || '—'}</td>
                  <td className="text-slate-600">{t(`inventory.units.${p.unit}`)}</td>
                  <td className="text-slate-600">{Number(p.costPrice).toLocaleString('uz-UZ')}</td>
                  <td className="text-slate-600">{Number(p.salePrice).toLocaleString('uz-UZ')}</td>
                  <td>
                    <span className={p.isActive ? 'badge badge-green' : 'badge badge-slate'}>
                      {p.isActive ? t('inventory.products.active') : t('inventory.products.inactive')}
                    </span>
                  </td>
                  {isManager && (
                    <td>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => openEdit(p)} className="btn-icon" title={t('common.edit')}>
                          <Pencil size={15} />
                        </button>
                        <button type="button" onClick={() => handleDelete(p)} className="btn-icon danger" title={t('common.delete')}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <ProductModal
          product={editing}
          categories={categories}
          onClose={closeModal}
          onSaved={handleSaved}
          onCategoryCreated={handleCategoryCreated}
        />
      )}
    </div>
  );
}
