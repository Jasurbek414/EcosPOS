import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Tag, Plus, X, Pencil, Trash2 } from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { categoryService } from '../../services/api';
import InventoryTabs from './InventoryTabs';

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
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await categoryService.list();
      setCategories(res.data);
    } catch {
      toast.error(t('inventory.categories.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    categoryService
      .list()
      .then((res) => {
        if (!cancelled) setCategories(res.data);
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

      {loading ? (
        <div className="text-slate-500 dark:text-slate-400 text-sm">{t('common.loading')}</div>
      ) : categories.length === 0 ? (
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
                <th>{t('inventory.categories.name')}</th>
                <th>{t('common.status')}</th>
                {isManager && <th>{t('common.actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium text-slate-900 dark:text-slate-100">{c.name}</td>
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
                        <button type="button" onClick={() => handleDelete(c)} className="btn-icon danger" title={t('common.delete')}>
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

      {modalOpen && <CategoryModal category={editing} onClose={closeModal} onSaved={handleSaved} />}
    </div>
  );
}
