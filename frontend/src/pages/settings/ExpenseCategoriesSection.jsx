import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Tags, Plus, X, Pencil, Ban, CheckCircle } from 'lucide-react';
import { expenseCategoryService } from '../../services/api';

// Xarajat toifasini yaratish/tahrirlash modali — UnitsSection.jsx'dagi UnitFormModal
// bilan bir xil naqsh (`category` prop berilsa tahrirlash rejimida ishlaydi).
function CategoryFormModal({ category, onClose, onSaved }) {
  const { t } = useTranslation();
  const isEdit = Boolean(category);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      code: category?.code || '',
      name: category?.name || '',
    },
  });

  const onSubmit = async (data) => {
    const payload = { code: data.code.trim().toUpperCase(), name: data.name.trim() };
    try {
      const res = isEdit
        ? await expenseCategoryService.update(category.id, payload)
        : await expenseCategoryService.create(payload);
      onSaved(res.data, isEdit);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          t(isEdit ? 'settings.expenseCategories.updateError' : 'settings.expenseCategories.createError')
      );
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">
            {t(isEdit ? 'settings.expenseCategories.editCategory' : 'settings.expenseCategories.newCategory')}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-4">
          <div>
            <label className="field-label">{t('settings.expenseCategories.code')}</label>
            <input
              type="text"
              className="input-field uppercase"
              placeholder={t('settings.expenseCategories.codePlaceholder')}
              autoFocus
              {...register('code', { required: true })}
            />
            {errors.code && <p className="field-error">{t('common.required')}</p>}
          </div>
          <div>
            <label className="field-label">{t('settings.expenseCategories.name')}</label>
            <input
              type="text"
              className="input-field"
              placeholder={t('settings.expenseCategories.namePlaceholder')}
              {...register('name', { required: true })}
            />
            {errors.name && <p className="field-error">{t('common.required')}</p>}
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

// Xarajat toifalarini boshqarish — Sozlamalar sahifasining bitta bo'limi sifatida
// ishlatiladi (OWNER/MANAGER, katalogni boshqarish huquqi bilan bir xil gate).
// UnitsSection.jsx'dagi ro'yxat + modal + faollashtirish/faolsizlantirish naqshini
// takrorlaydi (o'chirish tugmasi yo'q — backend'da DELETE endpoint mavjud emas).
export default function ExpenseCategoriesSection() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalCategory, setModalCategory] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await expenseCategoryService.list();
      setCategories(res.data);
    } catch {
      toast.error(t('settings.expenseCategories.loadError'));
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    expenseCategoryService
      .list()
      .then((res) => {
        if (!cancelled) setCategories(res.data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('settings.expenseCategories.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const openCreate = () => {
    setModalCategory(null);
    setModalOpen(true);
  };

  const openEdit = (category) => {
    setModalCategory(category);
    setModalOpen(true);
  };

  const handleSaved = (_, isEdit) => {
    setModalOpen(false);
    toast.success(t(isEdit ? 'settings.expenseCategories.updateSuccess' : 'settings.expenseCategories.createSuccess'));
    reload();
  };

  const handleDeactivate = async (category) => {
    if (!window.confirm(t('settings.expenseCategories.deactivateConfirm'))) return;
    try {
      await expenseCategoryService.deactivate(category.id);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || t('settings.expenseCategories.updateError'));
    }
  };

  const handleActivate = async (category) => {
    try {
      await expenseCategoryService.activate(category.id);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || t('settings.expenseCategories.updateError'));
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="settings-card-banner settings-card-banner-dark">
        <div className="settings-avatar settings-avatar-square">
          <Tags size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-white font-bold text-base truncate">{t('settings.expenseCategories.title')}</h2>
          <span className="text-slate-400 dark:text-slate-500 text-xs">{t('settings.expenseCategories.subtitle')}</span>
        </div>
        <button type="button" onClick={openCreate} className="btn btn-primary shrink-0">
          <Plus size={16} />
          {t('settings.expenseCategories.newCategory')}
        </button>
      </div>

      <div className="p-0">
        {loading ? (
          <div className="p-6 text-slate-500 dark:text-slate-400 text-sm">{t('common.loading')}</div>
        ) : categories.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <Tags size={24} className="text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('settings.expenseCategories.empty')}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('settings.expenseCategories.code')}</th>
                  <th>{t('settings.expenseCategories.name')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                        {c.code}
                      </span>
                    </td>
                    <td className="font-medium text-slate-900 dark:text-slate-100">{c.name}</td>
                    <td>
                      <span className={c.isActive ? 'badge badge-green' : 'badge badge-slate'}>
                        {c.isActive ? t('inventory.products.active') : t('inventory.products.inactive')}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => openEdit(c)} className="btn-icon" title={t('common.edit')}>
                          <Pencil size={15} />
                        </button>
                        {c.isActive ? (
                          <button type="button" onClick={() => handleDeactivate(c)} className="btn-icon danger" title={t('settings.expenseCategories.deactivateConfirm')}>
                            <Ban size={15} />
                          </button>
                        ) : (
                          <button type="button" onClick={() => handleActivate(c)} className="btn-icon" title={t('settings.expenseCategories.activateConfirm')}>
                            <CheckCircle size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && <CategoryFormModal category={modalCategory} onClose={() => setModalOpen(false)} onSaved={handleSaved} />}
    </div>
  );
}
