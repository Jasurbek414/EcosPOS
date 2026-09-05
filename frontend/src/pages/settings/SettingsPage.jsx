import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { UserCog, Building2, KeyRound, ShieldCheck, Fingerprint, Tag, CalendarDays } from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { profileService, companyProfileService } from '../../services/api';
import ThemeSettingsCard from '../../components/ui/ThemeSettingsCard';

const ROLE_BADGE = { OWNER: 'badge-amber', MANAGER: 'badge-blue', CASHIER: 'badge-slate' };

function InfoField({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      {Icon && (
        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
          <Icon size={15} />
        </div>
      )}
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-slate-400 dark:text-slate-500 text-[11px] font-bold uppercase tracking-wide">{label}</span>
        <span className="text-slate-900 dark:text-slate-100 text-sm font-semibold truncate">{value ?? '—'}</span>
      </div>
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
    <div className="card overflow-hidden">
      <div className="settings-card-banner">
        {loading || !profile ? (
          <div className="w-14 h-14 rounded-full bg-white/15 shrink-0" />
        ) : (
          <div className="settings-avatar">{profile.fullName?.charAt(0)?.toUpperCase() || 'U'}</div>
        )}
        <div className="min-w-0">
          <h2 className="text-white font-bold text-base truncate">{loading || !profile ? t('settings.profileTitle') : profile.fullName}</h2>
          {!loading && profile && (
            <span className={`badge ${ROLE_BADGE[profile.role] || 'badge-slate'} mt-1.5`} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
              {t(`staff.roles.${profile.role}`)}
            </span>
          )}
        </div>
      </div>

      <div className="p-6 flex flex-col gap-6">
        {loading ? (
          <div className="text-slate-500 dark:text-slate-400 text-sm">{t('common.loading')}</div>
        ) : !profile ? null : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <InfoField icon={Fingerprint} label={t('auth.username')} value={profile.username} />
              <InfoField icon={ShieldCheck} label={t('staff.role')} value={t(`staff.roles.${profile.role}`)} />
              {profile.branchName && <InfoField icon={Building2} label={t('inventory.stock.branch')} value={profile.branchName} />}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-4">{t('settings.editNameTitle')}</h3>
              <ProfileNameForm profile={profile} onUpdated={setProfile} />
            </div>

            <div className="border-t border-slate-100 dark:border-slate-700 pt-6 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <KeyRound size={15} className="text-slate-400 dark:text-slate-500" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{t('settings.changePasswordTitle')}</h3>
              </div>
              <ChangePasswordForm />
            </div>
          </>
        )}
      </div>
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
    <div className="card overflow-hidden">
      <div className="settings-card-banner settings-card-banner-dark">
        <div className="settings-avatar settings-avatar-square">
          <Building2 size={22} />
        </div>
        <div className="min-w-0">
          <h2 className="text-white font-bold text-base truncate">{loading || !company ? t('settings.companyTitle') : company.name}</h2>
          <span className="text-slate-400 dark:text-slate-500 text-xs">{t('settings.companyTitle')}</span>
        </div>
      </div>

      <div className="p-6 flex flex-col gap-6">
        {loading ? (
          <div className="text-slate-500 dark:text-slate-400 text-sm">{t('common.loading')}</div>
        ) : !company ? null : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Tag size={15} />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-slate-400 dark:text-slate-500 text-[11px] font-bold uppercase tracking-wide">{t('settings.slug')}</span>
                  <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300 w-fit">{company.slug}</span>
                  <span className="text-slate-400 dark:text-slate-500 text-[11px] mt-0.5">{t('settings.slugHint')}</span>
                </div>
              </div>
              <InfoField icon={ShieldCheck} label={t('settings.plan')} value={company.planName || t('plans.noPlan')} />
              <InfoField
                icon={CalendarDays}
                label={t('common.createdAt')}
                value={
                  company.createdAt
                    ? new Date(company.createdAt).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' })
                    : '—'
                }
              />
            </div>

            <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-4">{t('settings.editCompanyNameTitle')}</h3>
              <CompanyNameForm company={company} onUpdated={setCompany} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { isOwner } = useTenantAuthContext();

  return (
    <div className="flex flex-col gap-6 w-full">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <UserCog size={20} className="text-slate-400 dark:text-slate-500" />
          {t('settings.title')}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('settings.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <ProfileCard />
        {isOwner && <CompanyCard />}
        <ThemeSettingsCard />
      </div>
    </div>
  );
}
