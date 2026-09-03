import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Store, User, Lock, Building2, Eye, EyeOff } from 'lucide-react';
import { useTenantAuthContext } from '../hooks/useTenantAuthContext';
import { changeLanguage } from '../i18n';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const { login } = useTenantAuthContext();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { companyCode: '', username: '', password: '' } });

  const onSubmit = async (data) => {
    try {
      await login(data.companyCode.trim(), data.username.trim(), data.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || t('auth.wrongCredentials'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center">
            <Store size={30} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-white text-2xl font-bold">{t('auth.loginTitle')}</h1>
            <p className="text-slate-400 text-sm mt-1">{t('auth.loginSubtitle')}</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-slate-800/60 border border-white/10 rounded-2xl p-7 flex flex-col gap-4"
        >
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
              {t('auth.companyCode')}
            </label>
            <div className="relative">
              <Building2 size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                autoFocus
                placeholder="mychain"
                className="w-full bg-slate-900/60 border border-white/10 rounded-lg text-white placeholder:text-slate-600 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                {...register('companyCode', { required: true })}
              />
            </div>
            {errors.companyCode && <p className="field-error">{t('common.required')}</p>}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
              {t('auth.username')}
            </label>
            <div className="relative">
              <User size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="admin"
                className="w-full bg-slate-900/60 border border-white/10 rounded-lg text-white placeholder:text-slate-600 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                {...register('username', { required: true })}
              />
            </div>
            {errors.username && <p className="field-error">{t('common.required')}</p>}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
              {t('auth.password')}
            </label>
            <div className="relative">
              <Lock size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full bg-slate-900/60 border border-white/10 rounded-lg text-white placeholder:text-slate-600 pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                {...register('password', { required: true })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {errors.password && <p className="field-error">{t('common.required')}</p>}
          </div>

          <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full mt-2 justify-center">
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              t('auth.loginBtn')
            )}
          </button>
        </form>

        <div className="flex justify-center mt-6">
          <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-full">
            {['uz', 'ru'].map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => changeLanguage(lang)}
                className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide cursor-pointer transition-colors ${
                  i18n.language === lang ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
