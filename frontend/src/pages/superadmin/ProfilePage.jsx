import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { UserCog, ShieldCheck, Fingerprint, CalendarDays, KeyRound } from 'lucide-react';
import { useSuperAdminAuthContext } from '../../hooks/useSuperAdminAuthContext';
import { platformProfileService } from '../../services/platformApi';

function InfoField({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      {Icon && (
        <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center shrink-0 mt-0.5">
          <Icon size={15} />
        </div>
      )}
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wide">{label}</span>
        <span className="text-slate-900 text-sm font-semibold truncate">{value ?? '—'}</span>
      </div>
    </div>
  );
}

// F.I.O.'ni tahrirlash formasi — faqat `profile` yuklangandan keyin mount qilinadi,
// shuning uchun useForm defaultValues to'g'ridan-to'g'ri to'g'ri qiymat bilan ishga tushadi.
function ProfileNameForm({ profile, onUpdated }) {
  const { t } = useTranslation();
  const { updateUser } = useSuperAdminAuthContext();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { fullName: profile.fullName || '' } });

  const onSubmit = async (data) => {
    try {
      const res = await platformProfileService.update({ fullName: data.fullName });
      onUpdated(res.data);
      // Sidebar `useSuperAdminAuthContext` orqali localStorage'dagi F.I.O.'ni o'qiydi —
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
      await platformProfileService.changePassword({
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

export default function ProfilePage() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    platformProfileService
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
    <div className="flex flex-col gap-6 w-full">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <UserCog size={20} className="text-slate-400" />
          {t('superadmin.profile')}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{t('superadmin.profileSubtitle')}</p>
      </div>

      <div className="max-w-2xl w-full">
        <div className="card overflow-hidden">
          <div className="settings-card-banner settings-card-banner-amber">
            {loading || !profile ? (
              <div className="w-14 h-14 rounded-full bg-white/15 shrink-0" />
            ) : (
              <div className="settings-avatar">{(profile.fullName || profile.username)?.charAt(0)?.toUpperCase() || 'A'}</div>
            )}
            <div className="min-w-0">
              <h2 className="text-white font-bold text-base truncate">
                {loading || !profile ? t('superadmin.profile') : profile.fullName || profile.username}
              </h2>
              {!loading && profile && (
                <span
                  className="badge badge-amber mt-1.5 flex items-center gap-1 w-fit"
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
                >
                  <ShieldCheck size={11} />
                  {t('superadmin.role')}
                </span>
              )}
            </div>
          </div>

          <div className="p-6 flex flex-col gap-6">
            {loading ? (
              <div className="text-slate-500 text-sm">{t('common.loading')}</div>
            ) : !profile ? null : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <InfoField icon={Fingerprint} label={t('auth.username')} value={profile.username} />
                  <InfoField
                    icon={CalendarDays}
                    label={t('common.createdAt')}
                    value={
                      profile.createdAt
                        ? new Date(profile.createdAt).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' })
                        : '—'
                    }
                  />
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <h3 className="font-bold text-slate-900 text-sm mb-4">{t('settings.editNameTitle')}</h3>
                  <ProfileNameForm profile={profile} onUpdated={setProfile} />
                </div>

                <div className="border-t border-slate-100 pt-6 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <KeyRound size={15} className="text-slate-400" />
                    <h3 className="font-bold text-slate-900 text-sm">{t('settings.changePasswordTitle')}</h3>
                  </div>
                  <ChangePasswordForm />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
