import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Ruler, Plus, X, Pencil, Ban, CheckCircle } from 'lucide-react';
import { unitService } from '../../services/api';

// Birlik yaratish/tahrirlash modali — superadmin/PlansPage.jsx'dagi PlanFormModal
// bilan bir xil naqsh (`unit` prop berilsa tahrirlash rejimida ishlaydi).
function UnitFormModal({ unit, onClose, onSaved }) {
  const { t } = useTranslation();
  const isEdit = Boolean(unit);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      code: unit?.code || '',
      name: unit?.name || '',
    },
  });

  const onSubmit = async (data) => {
    const payload = { code: data.code.trim().toUpperCase(), name: data.name.trim() };
    try {
      const res = isEdit ? await unitService.update(unit.id, payload) : await unitService.create(payload);
      onSaved(res.data, isEdit);
    } catch (err) {
      toast.error(err.response?.data?.message || t(isEdit ? 'settings.units.updateError' : 'settings.units.createError'));
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">
            {t(isEdit ? 'settings.units.editUnit' : 'settings.units.newUnit')}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-4">
          <div>
            <label className="field-label">{t('settings.units.code')}</label>
            <input
              type="text"
              className="input-field uppercase"
              placeholder={t('settings.units.codePlaceholder')}
              autoFocus
              {...register('code', { required: true })}
            />
            {errors.code && <p className="field-error">{t('common.required')}</p>}
          </div>
          <div>
            <label className="field-label">{t('settings.units.name')}</label>
            <input
              type="text"
              className="input-field"
              placeholder={t('settings.units.namePlaceholder')}
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

// O'lchov birliklarini boshqarish — Sozlamalar sahifasining bitta bo'limi sifatida
// ishlatiladi (OWNER/MANAGER, katalogni boshqarish huquqi bilan bir xil gate).
// PlansPage.jsx'dagi ro'yxat + modal + faollashtirish/faolsizlantirish naqshini
// takrorlaydi (o'chirish tugmasi yo'q — backend'da DELETE endpoint mavjud emas).
export default function UnitsSection() {
  const { t } = useTranslation();
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalUnit, setModalUnit] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await unitService.list();
      setUnits(res.data);
    } catch {
      toast.error(t('settings.units.loadError'));
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    unitService
      .list()
      .then((res) => {
        if (!cancelled) setUnits(res.data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('settings.units.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const openCreate = () => {
    setModalUnit(null);
    setModalOpen(true);
  };

  const openEdit = (unit) => {
    setModalUnit(unit);
    setModalOpen(true);
  };

  const handleSaved = (_, isEdit) => {
    setModalOpen(false);
    toast.success(t(isEdit ? 'settings.units.updateSuccess' : 'settings.units.createSuccess'));
    reload();
  };

  const handleDeactivate = async (unit) => {
    if (!window.confirm(t('settings.units.deactivateConfirm'))) return;
    try {
      await unitService.deactivate(unit.id);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || t('settings.units.updateError'));
    }
  };

  const handleActivate = async (unit) => {
    try {
      await unitService.activate(unit.id);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || t('settings.units.updateError'));
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="settings-card-banner settings-card-banner-dark">
        <div className="settings-avatar settings-avatar-square">
          <Ruler size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-white font-bold text-base truncate">{t('settings.units.title')}</h2>
          <span className="text-slate-400 dark:text-slate-500 text-xs">{t('settings.units.subtitle')}</span>
        </div>
        <button type="button" onClick={openCreate} className="btn btn-primary shrink-0">
          <Plus size={16} />
          {t('settings.units.newUnit')}
        </button>
      </div>

      <div className="p-0">
        {loading ? (
          <div className="p-6 text-slate-500 dark:text-slate-400 text-sm">{t('common.loading')}</div>
        ) : units.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <Ruler size={24} className="text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('settings.units.empty')}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('settings.units.code')}</th>
                  <th>{t('settings.units.name')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {units.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                        {u.code}
                      </span>
                    </td>
                    <td className="font-medium text-slate-900 dark:text-slate-100">{u.name}</td>
                    <td>
                      <span className={u.isActive ? 'badge badge-green' : 'badge badge-slate'}>
                        {u.isActive ? t('inventory.products.active') : t('inventory.products.inactive')}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => openEdit(u)} className="btn-icon" title={t('common.edit')}>
                          <Pencil size={15} />
                        </button>
                        {u.isActive ? (
                          <button type="button" onClick={() => handleDeactivate(u)} className="btn-icon danger" title={t('settings.units.deactivateConfirm')}>
                            <Ban size={15} />
                          </button>
                        ) : (
                          <button type="button" onClick={() => handleActivate(u)} className="btn-icon" title={t('settings.units.activateConfirm')}>
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

      {modalOpen && <UnitFormModal unit={modalUnit} onClose={() => setModalOpen(false)} onSaved={handleSaved} />}
    </div>
  );
}
