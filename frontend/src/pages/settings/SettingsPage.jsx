import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { UserCog, Building2, KeyRound } from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { profileService, companyProfileService } from '../../services/api';

function InfoField({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wide">{label}</span>
      <span className="text-slate-900 text-sm font-medium">{value ?? '—'}</span>
    </div>
  );
}

// F.I.O.'ni tahrirlash formasi — faqat `profile` yuklangandan keyin, alohida komponent
// sifatida mount qilinadi, shuning uchun useForm defaultValues to'g'ridan-to'g'ri to'g'ri
// qiymat bilan ishga tushadi (reset() effektiga hojat yo'q).
function ProfileNameForm({ profile, onUpdated }) {
  const { t } = useTranslation();
  const { updateUser } = useTenantAuthContext();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { fullName: profile.fullName || '' } });

  const onSubmit = async (data) => {
    try {
      const res = await profileService.update({ fullName: data.fullName });
      onUpdated(res.data);
      // Sidebar/topbar `useTenantAuthContext` orqali localStorage'dagi F.I.O.'ni o'qiydi —
      // logout/login qilmasdan darhol yangilanishi uchun saqlangan auth obyektini ham yangilaymiz.
      updateUser({ fullName: res.data.fullName });
      toast.success(t('settings.profileUpdateSuccess'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('settings.profileUpdateError'));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div>
        <label className="field-label">{t('settings.fullName')}</label>
        <input
          type="text"
          className="input-field max-w-sm"
          placeholder={t('settings.fullNamePlaceholder')}
          {...register('fullName', { required: true })}
        />
        {errors.fullName && <p className="field-error">{t('common.required')}</p>}
      </div>
      <div>
        <button type="submit" disabled={isSubmitting} className="btn btn-primary w-fit">
          {t('settings.saveBtn')}
        </button>
      </div>
    </form>
  );
}

function ChangePasswordForm() {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } });

  const onSubmit = async (data) => {
    try {
      await profileService.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      reset();
      toast.success(t('settings.changePasswordSuccess'));
    } catch (err) {
      // Noto'g'ri joriy parol holatida forma tozalanmaydi — foydalanuvchi qayta urinishi uchun.
      toast.error(err.response?.data?.message || t('settings.changePasswordError'));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div>
        <label className="field-label">{t('settings.currentPassword')}</label>
        <input type="password" className="input-field max-w-sm" {...register('currentPassword', { required: true })} />
        {errors.currentPassword && <p className="field-error">{t('common.required')}</p>}
      </div>
      <div>
        <label className="field-label">{t('settings.newPassword')}</label>
        <input type="password" className="input-field max-w-sm" {...register('newPassword', { required: true, minLength: 4 })} />
        {errors.newPassword && <p className="field-error">{t('common.required')}</p>}
      </div>
      <div>
        <label className="field-label">{t('settings.confirmPassword')}</label>
        <input
          type="password"
          className="input-field max-w-sm"
          {...register('confirmPassword', {
            required: true,
            validate: (value, formValues) => value === formValues.newPassword || t('settings.passwordMismatch'),
          })}
        />
        {errors.confirmPassword && (
          <p className="field-error">{errors.confirmPassword.message || t('common.required')}</p>
        )}
      </div>
      <div>
        <button type="submit" disabled={isSubmitting} className="btn btn-primary w-fit">
          <KeyRound size={16} />
          {t('settings.changePasswordBtn')}
        </button>
      </div>
    </form>
  );
}

function ProfileCard() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    profileService
      .get()
      .then((res) => {
        if (!cancelled) setProfile(res.data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('settings.profileLoadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <div className="card p-6 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          <UserCog size={20} />
        </div>
        <h2 className="font-bold text-slate-900">{t('settings.profileTitle')}</h2>
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm">{t('common.loading')}</div>
      ) : !profile ? null : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <InfoField label={t('auth.username')} value={profile.username} />
            <InfoField label={t('staff.role')} value={t(`staff.roles.${profile.role}`)} />
            {profile.branchName && <InfoField label={t('inventory.stock.branch')} value={profile.branchName} />}
          </div>

          <ProfileNameForm profile={profile} onUpdated={setProfile} />

          <div className="border-t border-slate-200 pt-6 flex flex-col gap-4">
            <h3 className="font-bold text-slate-900 text-sm">{t('settings.changePasswordTitle')}</h3>
            <ChangePasswordForm />
          </div>
        </>
      )}
    </div>
  );
}

// Kompaniya nomini tahrirlash formasi — faqat `company` yuklangandan keyin mount qilinadi.
function CompanyNameForm({ company, onUpdated }) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { name: company.name || '' } });

  const onSubmit = async (data) => {
    try {
      const res = await companyProfileService.update({ name: data.name });
      onUpdated(res.data);
      toast.success(t('settings.companyUpdateSuccess'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('settings.companyUpdateError'));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div>
        <label className="field-label">{t('settings.companyName')}</label>
        <input
          type="text"
          className="input-field max-w-sm"
          placeholder={t('settings.companyNamePlaceholder')}
          {...register('name', { required: true })}
        />
        {errors.name && <p className="field-error">{t('common.required')}</p>}
      </div>
      <div>
        <button type="submit" disabled={isSubmitting} className="btn btn-primary w-fit">
          {t('settings.saveBtn')}
        </button>
      </div>
    </form>
  );
}

// OWNER'ga xos — bu komponent faqat isOwner bo'lganda mount qilinadi, shuning uchun
// GET /company so'rovi bu yerda shartsiz yuboriladi (backend baribir boshqa rollarga 403 qaytaradi).
function CompanyCard() {
  const { t } = useTranslation();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    companyProfileService
      .get()
      .then((res) => {
        if (!cancelled) setCompany(res.data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('settings.companyLoadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <div className="card p-6 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
          <Building2 size={20} />
        </div>
        <h2 className="font-bold text-slate-900">{t('settings.companyTitle')}</h2>
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm">{t('common.loading')}</div>
      ) : !company ? null : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wide">{t('settings.slug')}</span>
              <span className="font-mono text-sm bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 w-fit">{company.slug}</span>
              <span className="text-slate-400 text-xs mt-0.5">{t('settings.slugHint')}</span>
            </div>
            <InfoField label={t('settings.plan')} value={company.plan} />
            <InfoField
              label={t('common.createdAt')}
              value={
                company.createdAt
                  ? new Date(company.createdAt).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' })
                  : '—'
              }
            />
          </div>

          <CompanyNameForm company={company} onUpdated={setCompany} />
        </>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { isOwner } = useTenantAuthContext();

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <UserCog size={20} className="text-slate-400" />
          {t('settings.title')}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{t('settings.subtitle')}</p>
      </div>

      <ProfileCard />
      {isOwner && <CompanyCard />}
    </div>
  );
}
