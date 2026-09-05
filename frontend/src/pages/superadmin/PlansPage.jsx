import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Tag, Plus, X, Pencil, Ban, CheckCircle } from 'lucide-react';
import { platformPlanService } from '../../services/platformApi';

// Bo'sh qatorni null'ga aylantiradi — maxBranches/maxUsers/maxProducts uchun
// bo'sh maydon "cheksiz" (null) degani, 0 yoki NaN emas.
function toNullableInt(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

// Reja yaratish/tahrirlash modali — AdminsPage.jsx'dagi CreateAdminModal bilan bir xil
// naqsh, lekin `plan` prop berilsa tahrirlash rejimida ishlaydi (create/update ikkalasini
// ham shu komponent boshqaradi).
function PlanFormModal({ plan, onClose, onSaved }) {
  const { t } = useTranslation();
  const isEdit = Boolean(plan);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: plan?.name || '',
      priceMonthly: plan?.priceMonthly ?? '',
      maxBranches: plan?.maxBranches ?? '',
      maxUsers: plan?.maxUsers ?? '',
      maxProducts: plan?.maxProducts ?? '',
      description: plan?.description || '',
    },
  });

  const onSubmit = async (data) => {
    const payload = {
      name: data.name,
      priceMonthly: Number(data.priceMonthly),
      maxBranches: toNullableInt(data.maxBranches),
      maxUsers: toNullableInt(data.maxUsers),
      maxProducts: toNullableInt(data.maxProducts),
      description: data.description || null,
    };
    try {
      const res = isEdit ? await platformPlanService.update(plan.id, payload) : await platformPlanService.create(payload);
      onSaved(res.data, isEdit);
    } catch (err) {
      toast.error(err.response?.data?.message || t(isEdit ? 'plans.updateError' : 'plans.createError'));
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">{t(isEdit ? 'plans.editPlan' : 'plans.newPlan')}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-4">
          <div>
            <label className="field-label">{t('plans.name')}</label>
            <input
              type="text"
              className="input-field"
              placeholder={t('plans.namePlaceholder')}
              autoFocus
              {...register('name', { required: true })}
            />
            {errors.name && <p className="field-error">{t('common.required')}</p>}
          </div>

          <div>
            <label className="field-label">{t('plans.priceMonthly')}</label>
            <input
              type="number"
              min="0"
              step="1"
              className="input-field"
              {...register('priceMonthly', { required: true, min: 0 })}
            />
            {errors.priceMonthly && <p className="field-error">{t('common.required')}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="field-label">{t('plans.maxBranches')}</label>
              <input type="number" min="0" step="1" className="input-field" placeholder={t('plans.unlimited')} {...register('maxBranches')} />
            </div>
            <div>
              <label className="field-label">{t('plans.maxUsers')}</label>
              <input type="number" min="0" step="1" className="input-field" placeholder={t('plans.unlimited')} {...register('maxUsers')} />
            </div>
            <div>
              <label className="field-label">{t('plans.maxProducts')}</label>
              <input type="number" min="0" step="1" className="input-field" placeholder={t('plans.unlimited')} {...register('maxProducts')} />
            </div>
          </div>

          <div>
            <label className="field-label">{t('plans.description')}</label>
            <textarea className="input-field" rows={3} {...register('description')} />
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

export default function PlansPage() {
  const { t } = useTranslation();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalPlan, setModalPlan] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await platformPlanService.list();
      setPlans(res.data);
    } catch {
      toast.error(t('plans.loadError'));
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    platformPlanService
      .list()
      .then((res) => {
        if (!cancelled) setPlans(res.data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('plans.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const openCreate = () => {
    setModalPlan(null);
    setModalOpen(true);
  };

  const openEdit = (plan) => {
    setModalPlan(plan);
    setModalOpen(true);
  };

  const handleSaved = (_, isEdit) => {
    setModalOpen(false);
    toast.success(t(isEdit ? 'plans.updateSuccess' : 'plans.createSuccess'));
    reload();
  };

  const handleDeactivate = async (plan) => {
    if (!window.confirm(t('plans.deactivateConfirm'))) return;
    try {
      await platformPlanService.deactivate(plan.id);
      toast.success(t('plans.deactivateSuccess'));
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || t('plans.updateError'));
    }
  };

  const handleActivate = async (plan) => {
    try {
      await platformPlanService.activate(plan.id);
      toast.success(t('plans.activateSuccess'));
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || t('plans.updateError'));
    }
  };

  const formatLimit = (value) => (value === null || value === undefined ? t('plans.unlimited') : value);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('plans.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('plans.subtitle')}</p>
        </div>
        <button type="button" onClick={openCreate} className="btn" style={{ background: '#d97706', color: '#fff' }}>
          <Plus size={16} />
          {t('plans.newPlan')}
        </button>
      </div>

      {loading ? (
        <div className="card py-16 flex flex-col items-center gap-3">
          <span className="w-8 h-8 border-[3px] border-slate-200 dark:border-slate-700 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-slate-400 dark:text-slate-500 text-sm">{t('common.loading')}</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <Tag size={24} className="text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('plans.empty')}</p>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('plans.name')}</th>
                <th>{t('plans.priceMonthly')}</th>
                <th>{t('plans.maxBranches')}</th>
                <th>{t('plans.maxUsers')}</th>
                <th>{t('plans.maxProducts')}</th>
                <th>{t('common.status')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Tag size={15} />
                      </div>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{p.name}</span>
                    </div>
                  </td>
                  <td className="text-slate-600 dark:text-slate-300">{Number(p.priceMonthly).toLocaleString('uz-UZ')} so'm/oy</td>
                  <td className="text-slate-600 dark:text-slate-300">{formatLimit(p.maxBranches)}</td>
                  <td className="text-slate-600 dark:text-slate-300">{formatLimit(p.maxUsers)}</td>
                  <td className="text-slate-600 dark:text-slate-300">{formatLimit(p.maxProducts)}</td>
                  <td>
                    <span className={p.isActive ? 'badge badge-green' : 'badge badge-slate'}>
                      {p.isActive ? t('plans.active') : t('plans.inactive')}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => openEdit(p)} className="btn-icon" title={t('common.edit')}>
                        <Pencil size={15} />
                      </button>
                      {p.isActive ? (
                        <button type="button" onClick={() => handleDeactivate(p)} className="btn-icon danger" title={t('plans.deactivateConfirm')}>
                          <Ban size={15} />
                        </button>
                      ) : (
                        <button type="button" onClick={() => handleActivate(p)} className="btn-icon" title={t('plans.activateConfirm')}>
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

      {modalOpen && <PlanFormModal plan={modalPlan} onClose={() => setModalOpen(false)} onSaved={handleSaved} />}
    </div>
  );
}
