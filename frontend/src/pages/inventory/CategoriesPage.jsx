import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Tag, Plus, X, Pencil, Trash2, Search } from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { categoryService, productService } from '../../services/api';
import InventoryTabs from './InventoryTabs';

// ProductsPage.jsx'dagi "rasm yo'q bo'lsa rangli bosh harf" naqshi bilan bir xil —
// alohida umumiy util fayl yo'q bo'lgani uchun shu yerda takrorlanadi (bir xil
// CARD_COLORS ro'yxati bilan, natija barcha sahifalarda bir xil rang chiqishi uchun).
const CARD_COLORS = [
  '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#c026d3', '#65a30d',
];
function colorForName(name) {
  const code = (name || '?').charCodeAt(0) || 0;
  return CARD_COLORS[code % CARD_COLORS.length];
}
function initialsForName(name) {
  return (name || '?').trim().charAt(0).toUpperCase();
}

function CategoryModal({ category, onClose, onSaved }) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { name: category?.name || '' } });

  const onSubmit = async (data) => {
    try {
      if (category) {
        await categoryService.update(category.id, data);
        toast.success(t('inventory.categories.updateSuccess'));
      } else {
        await categoryService.create(data);
        toast.success(t('inventory.categories.createSuccess'));
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || t(category ? 'inventory.categories.updateError' : 'inventory.categories.createError'));
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">
            {category ? t('inventory.categories.editCategory') : t('inventory.categories.newCategory')}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-4">
          <div>
            <label className="field-label">{t('inventory.categories.name')}</label>
            <input
              type="text"
              className="input-field"
              placeholder={t('inventory.categories.namePlaceholder')}
              autoFocus
              {...register('name', { required: true })}
            />
            {errors.name && <p className="field-error">{t('common.required')}</p>}
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={onClose} className="btn btn-outline">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {category ? t('common.save') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const { t } = useTranslation();
  const { isManager } = useTenantAuthContext();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [categoriesRes, productsRes] = await Promise.all([categoryService.list(), productService.list({})]);
      setCategories(categoriesRes.data);
      setProducts(productsRes.data);
    } catch {
      toast.error(t('inventory.categories.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([categoryService.list(), productService.list({})])
      .then(([categoriesRes, productsRes]) => {
        if (cancelled) return;
        setCategories(categoriesRes.data);
        setProducts(productsRes.data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('inventory.categories.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  // Har bir kategoriyaga tegishli mahsulotlar sonini mijoz tomonida hisoblaymiz —
  // buning uchun alohida backend endpoint yo'q.
  const productCountByCategory = useMemo(() => {
    const counts = {};
    products.forEach((p) => {
      if (p.categoryId == null) return;
      counts[p.categoryId] = (counts[p.categoryId] || 0) + 1;
    });
    return counts;
  }, [products]);

  const filteredCategories = useMemo(() => {
    const search = searchInput.trim().toLowerCase();
    if (!search) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(search));
  }, [categories, searchInput]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (category) => {
    setEditing(category);
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

  const handleDelete = async (category) => {
    if (!window.confirm(t('inventory.categories.deleteConfirm'))) return;
    try {
      await categoryService.remove(category.id);
      toast.success(t('inventory.categories.deleteSuccess'));
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || t('inventory.categories.deleteError'));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <InventoryTabs />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('inventory.categories.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('inventory.categories.subtitle')}</p>
        </div>
        {isManager && (
          <button type="button" onClick={openCreate} className="btn btn-primary">
            <Plus size={16} />
            {t('inventory.categories.newCategory')}
          </button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          className="input-field !pl-9"
          placeholder={t('inventory.categories.searchPlaceholder')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-slate-500 dark:text-slate-400 text-sm">{t('common.loading')}</div>
      ) : filteredCategories.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <Tag size={24} className="text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('inventory.categories.empty')}</p>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th />
                <th>{t('inventory.categories.name')}</th>
                <th>{t('inventory.categories.productCount')}</th>
                <th>{t('common.status')}</th>
                {isManager && <th>{t('common.actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((c) => {
                const productCount = productCountByCategory[c.id] || 0;
                return (
                  <tr key={c.id}>
                    <td>
                      <div
                        className="inv-thumb-sm inv-thumb-sm-fallback"
                        style={{ background: colorForName(c.name) }}
                      >
                        {initialsForName(c.name)}
                      </div>
                    </td>
                    <td className="font-medium text-slate-900 dark:text-slate-100">{c.name}</td>
                    <td>
                      <span className="badge badge-slate">
                        {productCount} {t('inventory.categories.productCount')}
                      </span>
                    </td>
                    <td>
                      <span className={c.isActive ? 'badge badge-green' : 'badge badge-slate'}>
                        {c.isActive ? t('inventory.products.active') : t('inventory.products.inactive')}
                      </span>
                    </td>
                    {isManager && (
                      <td>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => openEdit(c)} className="btn-icon" title={t('common.edit')}>
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c)}
                            disabled={productCount > 0}
                            className="btn-icon danger disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            title={productCount > 0 ? t('inventory.categories.deleteDisabledHint') : t('common.delete')}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && <CategoryModal category={editing} onClose={closeModal} onSaved={handleSaved} />}
    </div>
  );
}
