import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2, ShieldAlert, Copy } from 'lucide-react';
import { companyService } from '../../services/platformApi';

export default function CompanyCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { slug: '', name: '', plan: '', adminUsername: '', adminFullName: '' } });

  const onSubmit = async (data) => {
    try {
      const res = await companyService.create(data);
      setResult(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || t('superadmin.createError'));
    }
  };

  const copy = (value, label) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label}: ${t('common.copied')}`);
  };

  // Kenglik nuqsoni tuzatildi: sahifa o'rovchisi endi max-w-lg mx-auto bilan
  // cheklanmaydi (to'liq kenglikda) — faqat forma/karta o'zi max-w-2xl bilan
  // o'qish uchun qulay kenglikda ushlab turiladi.
  if (result) {
    return (
      <div className="flex flex-col gap-8">
        <div className="max-w-2xl w-full flex flex-col gap-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
              <CheckCircle2 size={26} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('superadmin.createSuccess')}</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                {result.name} <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded ml-1">{result.slug}</span>
              </p>
            </div>
          </div>

          <div className="card border-amber-200" style={{ borderColor: '#fde68a' }}>
            <div className="p-6 flex flex-col gap-5">
              <div className="flex items-start gap-3">
                <ShieldAlert size={22} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-amber-800 text-sm font-medium leading-relaxed">{t('superadmin.credentialsWarning')}</p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wide">{t('superadmin.adminUsername')}</p>
                    <p className="text-slate-900 dark:text-slate-100 font-mono text-base font-semibold truncate">{result.adminUsername}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copy(result.adminUsername, t('superadmin.adminUsername'))}
                    className="shrink-0 w-9 h-9 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                  >
                    <Copy size={16} />
                  </button>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wide">{t('auth.password')}</p>
                    <p className="text-slate-900 dark:text-slate-100 font-mono text-base font-semibold truncate">{result.adminPassword}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copy(result.adminPassword, t('auth.password'))}
                    className="shrink-0 w-9 h-9 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/spd/companies/${result.id}`)}
            className="btn w-full justify-center"
            style={{ background: '#d97706', color: '#fff' }}
          >
            {t('superadmin.goToDetail')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <button
        type="button"
        onClick={() => navigate('/spd/companies')}
        className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 text-sm font-medium w-fit cursor-pointer"
      >
        <ArrowLeft size={16} />
        {t('superadmin.backToCompanies')}
      </button>

      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('superadmin.newCompany')}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('superadmin.createSubtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-7 flex flex-col gap-4 max-w-2xl">
        <div>
          <label className="field-label">{t('superadmin.name')}</label>
          <input
            type="text"
            className="input-field"
            placeholder={t('superadmin.namePlaceholder')}
            autoFocus
            {...register('name', { required: true })}
          />
          {errors.name && <p className="field-error">{t('common.required')}</p>}
        </div>

        <div>
          <label className="field-label">{t('superadmin.slug')}</label>
          <input
            type="text"
            className="input-field font-mono"
            placeholder={t('superadmin.slugPlaceholder')}
            {...register('slug', { required: true, pattern: /^[a-z0-9-]+$/ })}
          />
          <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">{t('superadmin.slugHint')}</p>
          {errors.slug && <p className="field-error">{t('common.required')}</p>}
        </div>

        <div>
          <label className="field-label">{t('superadmin.plan')}</label>
          <input type="text" className="input-field" placeholder={t('superadmin.planPlaceholder')} {...register('plan')} />
        </div>

        <div className="divider" style={{ height: 1, background: 'var(--border-color)', margin: '0.5rem 0' }} />

        <div>
          <label className="field-label">{t('superadmin.adminUsername')}</label>
          <input
            type="text"
            className="input-field"
            placeholder={t('superadmin.adminUsernamePlaceholder')}
            {...register('adminUsername')}
          />
        </div>

        <div>
          <label className="field-label">{t('superadmin.adminFullName')}</label>
          <input
            type="text"
            className="input-field"
            placeholder={t('superadmin.adminFullNamePlaceholder')}
            {...register('adminFullName')}
          />
        </div>

        <button type="submit" disabled={isSubmitting} className="btn mt-2 justify-center" style={{ background: '#d97706', color: '#fff' }}>
          {isSubmitting ? (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            t('superadmin.createBtn')
          )}
        </button>
      </form>
    </div>
  );
}
