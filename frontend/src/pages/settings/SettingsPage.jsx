import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
  UserCog, Building2, KeyRound, ShieldCheck, Fingerprint, Tag, CalendarDays, ImagePlus, Loader2,
  Printer, ReceiptText, Ruler, Palette, Pencil, Tags, HandCoins,
} from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { profileService, companyProfileService, fileService, resolveFileUrl } from '../../services/api';
import ThemeSettingsCard from '../../components/ui/ThemeSettingsCard';
import UnitsSection from './UnitsSection';
import ExpenseCategoriesSection from './ExpenseCategoriesSection';

// ProductsPage.jsx'dagi rasm yuklash validatsiyasi bilan bir xil — alohida umumiy
// util fayl yo'q bo'lgani uchun shu yerda takrorlanadi.
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

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
          <div className="w-16 h-16 rounded-full bg-white/15 shrink-0" />
        ) : (
          <div className="settings-avatar !w-16 !h-16 !text-2xl ring-4 ring-white/15">
            {profile.fullName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-white font-bold text-lg truncate">{loading || !profile ? t('settings.profileTitle') : profile.fullName}</h2>
          {!loading && profile && (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="badge badge-slate" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
                {t(`staff.roles.${profile.role}`)}
              </span>
              <span className="text-white/70 text-xs font-mono">@{profile.username}</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 flex flex-col gap-6">
        {loading ? (
          <div className="text-slate-500 dark:text-slate-400 text-sm">{t('common.loading')}</div>
        ) : !profile ? null : (
          <>
            {profile.branchName && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InfoField icon={Fingerprint} label={t('auth.username')} value={profile.username} />
                <InfoField icon={Building2} label={t('inventory.stock.branch')} value={profile.branchName} />
              </div>
            )}

            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 ${profile.branchName ? 'border-t border-slate-100 dark:border-slate-700 pt-6' : ''}`}>
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Pencil size={15} className="text-slate-400 dark:text-slate-500" />
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{t('settings.editNameTitle')}</h3>
                </div>
                <ProfileNameForm profile={profile} onUpdated={setProfile} />
              </div>

              <div className="lg:border-l lg:border-slate-100 lg:dark:border-slate-700 lg:pl-8">
                <div className="flex items-center gap-2 mb-4">
                  <KeyRound size={15} className="text-slate-400 dark:text-slate-500" />
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{t('settings.changePasswordTitle')}</h3>
                </div>
                <ChangePasswordForm />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Kompaniya nomi/manzil/telefonini tahrirlash formasi — faqat `company` yuklangandan
// keyin mount qilinadi. Uchalasi ham oddiy matn maydonlari bo'lgani uchun bitta forma
// va bitta PUT so'rovi orqali birgalikda saqlanadi. `logoUrl` joriy qiymati ham har
// safar birga yuboriladi — backend partial-update semantikasidan qat'i nazar, forma
// saqlanganda logotip o'chib qolmasligi uchun.
function CompanyDetailsForm({ company, onUpdated }) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: company.name || '',
      address: company.address || '',
      phone: company.phone || '',
    },
  });

  const onSubmit = async (data) => {
    try {
      const res = await companyProfileService.update({
        name: data.name,
        address: data.address || null,
        phone: data.phone || null,
        logoUrl: company.logoUrl || null,
      });
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
        <label className="field-label">{t('settings.address')}</label>
        <input
          type="text"
          className="input-field max-w-sm"
          placeholder={t('settings.addressPlaceholder')}
          {...register('address')}
        />
      </div>
      <div>
        <label className="field-label">{t('settings.phone')}</label>
        <input
          type="text"
          className="input-field max-w-sm"
          placeholder={t('settings.phonePlaceholder')}
          {...register('phone')}
        />
      </div>
      <div>
        <button type="submit" disabled={isSubmitting} className="btn btn-primary w-fit">
          {t('settings.saveBtn')}
        </button>
      </div>
    </form>
  );
}

// Kompaniya logotipini yuklash — ProductsPage.jsx'dagi ProductModal rasm yuklash
// naqshi bilan bir xil (.inv-upload-box/.inv-upload-overlay), lekin fayl tanlangan
// zahoti yuklanadi VA darhol saqlanadi (name/manzil/telefon formasidan mustaqil) —
// logotip kabi kompaniya darajasidagi sozlama uchun foydalanuvchi rasmni tanlagan
// zahoti qo'llanishini kutadi, alohida "Saqlash" bosishni talab qilish keraksiz qadam bo'lardi.
function CompanyLogoUpload({ company, onUpdated }) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const resolvedLogoUrl = resolveFileUrl(company.logoUrl);

  const handleSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error(t('inventory.products.imageInvalidType'));
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error(t('inventory.products.imageTooLarge'));
      return;
    }

    setUploading(true);
    try {
      const uploadRes = await fileService.upload(file);
      const updateRes = await companyProfileService.update({
        name: company.name,
        address: company.address || null,
        phone: company.phone || null,
        logoUrl: uploadRes.data.url,
      });
      onUpdated(updateRes.data);
      toast.success(t('settings.companyUpdateSuccess'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('inventory.products.imageUploadError'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="field-label">{t('settings.logo')}</label>
      <input
        type="file"
        ref={fileInputRef}
        accept={ALLOWED_IMAGE_TYPES.join(',')}
        className="hidden"
        onChange={handleSelect}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="inv-upload-box"
        disabled={uploading}
        title={t('settings.uploadLogoHint')}
      >
        {resolvedLogoUrl ? (
          <img src={resolvedLogoUrl} alt={company.name} />
        ) : (
          <>
            <ImagePlus size={22} />
            <span className="inv-upload-box-hint">{t('settings.uploadLogoHint')}</span>
          </>
        )}
        {uploading && (
          <div className="inv-upload-overlay">
            <Loader2 size={22} className="animate-spin" />
          </div>
        )}
      </button>
    </div>
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
        {!loading && company?.logoUrl ? (
          <img src={resolveFileUrl(company.logoUrl)} alt={company.name} className="settings-avatar settings-avatar-square object-cover" />
        ) : (
          <div className="settings-avatar settings-avatar-square">
            <Building2 size={22} />
          </div>
        )}
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
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-4">{t('settings.logo')}</h3>
              <CompanyLogoUpload company={company} onUpdated={setCompany} />
            </div>

            <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-4">{t('settings.editCompanyNameTitle')}</h3>
              <CompanyDetailsForm company={company} onUpdated={setCompany} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Chekning joriy (hali saqlanmagan) forma qiymatlari bilan jonli ko'rinishi — foydalanuvchi
// qog'oz kengligi/pastki matn/ko'rsatish-yashirish sozlamalarini o'zgartirganda, chop etishdan
// oldin qanday chiqishini ko'rishi uchun. Haqiqiy POS chekidagi (POSPage.jsx) tuzilishni
// soddalashtirilgan holda takrorlaydi (o'zgarmas namunaviy ma'lumotlar bilan).
function ReceiptPreview({ company, values }) {
  const { t } = useTranslation();
  const resolvedLogoUrl = resolveFileUrl(company?.logoUrl);
  const paperClass = values.receiptPaperWidth === '58mm' ? 'receipt-slip-58mm' : 'receipt-slip-80mm';

  const currencyLabel = values.receiptCurrencyLabel || "so'm";

  return (
    <div className={`receipt-slip ${paperClass} flex flex-col gap-3 mx-auto`}>
      <div className="text-center flex flex-col items-center gap-1.5">
        {values.receiptShowLogo && resolvedLogoUrl ? (
          <img src={resolvedLogoUrl} alt={company?.name || ''} className="w-9 h-9 rounded-lg object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center">
            <ReceiptText size={16} className="text-white" />
          </div>
        )}
        {values.receiptHeaderText && (
          <p className="text-slate-500 dark:text-slate-400 text-[11px] whitespace-pre-line">{values.receiptHeaderText}</p>
        )}
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{company?.name || t('pos.receipt.title')}</h3>
        {company?.address && <p className="text-slate-500 dark:text-slate-400 text-[11px]">{company.address}</p>}
        {company?.phone && <p className="text-slate-500 dark:text-slate-400 text-[11px]">{company.phone}</p>}
        {values.receiptShowBranchName && (
          <p className="text-slate-500 dark:text-slate-400 text-[11px]">{t('pos.receipt.branchLabel')}: Bosh filial</p>
        )}
      </div>
      <div className="receipt-divider" />
      <div className="flex flex-col gap-1 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-700 dark:text-slate-300">{t('settings.receiptPreview.sampleItem')} x2</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">24 000</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-700 dark:text-slate-300">{t('settings.receiptPreview.sampleItem2')} x1</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">12 000</span>
        </div>
      </div>
      <div className="receipt-divider" />
      <div className="flex justify-between text-sm">
        <span className="text-slate-500 dark:text-slate-400">{t('pos.receipt.total')}</span>
        <span className="font-bold text-slate-900 dark:text-slate-100">36 000 {currencyLabel}</span>
      </div>
      {values.receiptShowCashierName && (
        <p className="text-slate-400 dark:text-slate-500 text-[11px] text-center">{t('settings.receiptPreview.cashierLabel')}: Aliyev A.</p>
      )}
      {values.receiptFooterText && (
        <>
          <div className="receipt-divider" />
          <p className="text-slate-600 dark:text-slate-300 text-[11px] text-center whitespace-pre-line">{values.receiptFooterText}</p>
        </>
      )}
    </div>
  );
}

// Chek/printer sozlamalari — mustaqil, o'z-o'zini yuklaydigan/saqlaydigan karta (boshqa
// Sozlamalar kartalari bilan bir xil naqsh). `watch()` orqali forma qiymatlari jonli
// kuzatiladi va o'ng tomondagi ReceiptPreview'ga uzatiladi — foydalanuvchi saqlashdan
// oldin natijani ko'radi.
function ReceiptSettingsCard() {
  const { t } = useTranslation();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      receiptPaperWidth: '80mm',
      receiptFooterText: '',
      receiptShowLogo: true,
      receiptShowCashierName: true,
      receiptAutoPrint: false,
      receiptHeaderText: '',
      receiptShowBranchName: false,
      receiptCurrencyLabel: "so'm",
    },
  });
  const values = watch();

  useEffect(() => {
    let cancelled = false;
    companyProfileService
      .get()
      .then((res) => {
        if (cancelled) return;
        setCompany(res.data);
        reset({
          receiptPaperWidth: res.data.receiptPaperWidth || '80mm',
          receiptFooterText: res.data.receiptFooterText || '',
          receiptShowLogo: res.data.receiptShowLogo ?? true,
          receiptShowCashierName: res.data.receiptShowCashierName ?? true,
          receiptAutoPrint: res.data.receiptAutoPrint ?? false,
          receiptHeaderText: res.data.receiptHeaderText || '',
          receiptShowBranchName: res.data.receiptShowBranchName ?? false,
          receiptCurrencyLabel: res.data.receiptCurrencyLabel || "so'm",
        });
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
  }, [t, reset]);

  const onSubmit = async (data) => {
    try {
      const res = await companyProfileService.updateReceiptSettings({
        ...data,
        receiptFooterText: data.receiptFooterText || null,
        receiptHeaderText: data.receiptHeaderText || null,
      });
      setCompany(res.data);
      toast.success(t('settings.receiptSettingsUpdateSuccess'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('settings.receiptSettingsUpdateError'));
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="settings-card-banner settings-card-banner-dark">
        <div className="settings-avatar settings-avatar-square">
          <Printer size={20} />
        </div>
        <div className="min-w-0">
          <h2 className="text-white font-bold text-base truncate">{t('settings.receiptSettingsTitle')}</h2>
          <span className="text-slate-400 dark:text-slate-500 text-xs">{t('settings.receiptSettingsSubtitle')}</span>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="text-slate-500 dark:text-slate-400 text-sm">{t('common.loading')}</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div>
                <label className="field-label">{t('settings.paperWidth')}</label>
                <select className="input-field max-w-xs" {...register('receiptPaperWidth')}>
                  <option value="80mm">80mm</option>
                  <option value="58mm">58mm</option>
                </select>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">{t('settings.paperWidthHint')}</p>
              </div>

              <div>
                <label className="field-label">{t('settings.headerText')}</label>
                <input
                  type="text"
                  className="input-field max-w-sm"
                  placeholder={t('settings.headerTextPlaceholder')}
                  {...register('receiptHeaderText')}
                />
              </div>

              <div>
                <label className="field-label">{t('settings.footerText')}</label>
                <textarea
                  className="input-field max-w-sm"
                  rows={2}
                  placeholder={t('settings.footerTextPlaceholder')}
                  {...register('receiptFooterText')}
                />
              </div>

              <div>
                <label className="field-label">{t('settings.currencyLabel')}</label>
                <input
                  type="text"
                  className="input-field max-w-xs"
                  placeholder={t('settings.currencyLabelPlaceholder')}
                  {...register('receiptCurrencyLabel', { required: true })}
                />
              </div>

              <div className="flex flex-col gap-2.5">
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                  <input type="checkbox" {...register('receiptShowLogo')} />
                  {t('settings.showLogoOnReceipt')}
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                  <input type="checkbox" {...register('receiptShowCashierName')} />
                  {t('settings.showCashierName')}
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                  <input type="checkbox" {...register('receiptShowBranchName')} />
                  {t('settings.showBranchName')}
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                  <input type="checkbox" {...register('receiptAutoPrint')} />
                  {t('settings.autoPrint')}
                </label>
              </div>

              <div>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary w-fit">
                  {t('settings.saveBtn')}
                </button>
              </div>
            </form>

            <div>
              <p className="text-slate-400 dark:text-slate-500 text-[11px] font-bold uppercase tracking-wide mb-3 text-center">
                {t('settings.receiptPreview.title')}
              </p>
              <ReceiptPreview company={company} values={values} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Nasiya savdosi (kredit) yoqish/o'chirish — kompaniya bo'ylab, faqat OWNER uchun
// (backend PATCH /company/credit-sales boshqa rollarga 403 qaytaradi). ReceiptSettingsCard
// bilan bir xil useForm+reset+submit naqshi, lekin faqat bitta checkbox va o'z
// "Saqlash" tugmasi bilan mustaqil kichik karta sifatida.
function CreditSalesCard() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({ defaultValues: { creditSalesEnabled: false } });

  useEffect(() => {
    let cancelled = false;
    companyProfileService
      .get()
      .then((res) => {
        if (cancelled) return;
        reset({ creditSalesEnabled: res.data.creditSalesEnabled ?? false });
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
  }, [t, reset]);

  const onSubmit = async (data) => {
    try {
      await companyProfileService.updateCreditSales({ creditSalesEnabled: data.creditSalesEnabled });
      toast.success(t('settings.creditSales.saveSuccess'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('settings.creditSales.saveError'));
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="settings-card-banner settings-card-banner-dark">
        <div className="settings-avatar settings-avatar-square">
          <HandCoins size={20} />
        </div>
        <div className="min-w-0">
          <h2 className="text-white font-bold text-base truncate">{t('settings.creditSales.title')}</h2>
          <span className="text-slate-400 dark:text-slate-500 text-xs">{t('settings.creditSales.description')}</span>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="text-slate-500 dark:text-slate-400 text-sm">{t('common.loading')}</div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer select-none">
              <input type="checkbox" {...register('creditSalesEnabled')} />
              {t('settings.creditSales.enable')}
            </label>
            <div>
              <button type="submit" disabled={isSubmitting} className="btn btn-primary w-fit">
                {t('settings.saveBtn')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// Sozlamalar sahifasi bo'limlari — chapda tik ro'yxat (mobil kenglikda gorizontal
// skroll qilinadigan tab satri), o'ngda tanlangan bo'lim tarkibi. Yagona /settings
// yo'nalishi saqlanadi (App.jsx/Sidebar.jsx'ga tegilmaydi) — tanlangan bo'lim shu
// komponentning ichki holati (activeSection) orqali boshqariladi.
const SECTION_ICONS = {
  profile: UserCog,
  company: Building2,
  receipt: Printer,
  units: Ruler,
  expenseCategories: Tags,
  appearance: Palette,
};

export default function SettingsPage() {
  const { t } = useTranslation();
  const { isOwner, isManager } = useTenantAuthContext();

  const sections = useMemo(
    () =>
      [
        { id: 'profile', label: t('settings.sections.profile'), visible: true },
        { id: 'company', label: t('settings.sections.company'), visible: isOwner },
        { id: 'receipt', label: t('settings.sections.receipt'), visible: isOwner },
        { id: 'units', label: t('settings.sections.units'), visible: isManager },
        { id: 'expenseCategories', label: t('settings.sections.expenseCategories'), visible: isManager },
        { id: 'appearance', label: t('settings.sections.appearance'), visible: true },
      ].filter((s) => s.visible),
    [t, isOwner, isManager]
  );

  const [activeSection, setActiveSection] = useState('profile');

  // Tanlangan bo'lim ro'yxatda bo'lmasa (masalan CASHIER "units"ni ko'rmaydi) —
  // render vaqtida birinchi mavjud bo'limga tushamiz. Bu setState'ni effekt ichida
  // chaqirishdan ko'ra tozaroq — activeSection holati o'zi o'zgarmaydi, faqat
  // ko'rsatish uchun hisoblangan qiymat ishlatiladi.
  const effectiveSection = sections.some((s) => s.id === activeSection) ? activeSection : sections[0]?.id;

  return (
    <div className="flex flex-col gap-6 w-full">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <UserCog size={20} className="text-slate-400 dark:text-slate-500" />
          {t('settings.title')}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('settings.subtitle')}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <nav className="flex md:flex-col gap-1 w-full md:w-60 shrink-0 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
          {sections.map((s) => {
            const Icon = SECTION_ICONS[s.id];
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap shrink-0 md:shrink transition-colors cursor-pointer ${
                  effectiveSection === s.id
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon size={16} />
                {s.label}
              </button>
            );
          })}
        </nav>

        <div className="flex-1 w-full min-w-0">
          {effectiveSection === 'profile' && <ProfileCard />}
          {effectiveSection === 'company' && isOwner && <CompanyCard />}
          {effectiveSection === 'receipt' && isOwner && (
            <div className="flex flex-col gap-6">
              <ReceiptSettingsCard />
              <CreditSalesCard />
            </div>
          )}
          {effectiveSection === 'units' && isManager && <UnitsSection />}
          {effectiveSection === 'expenseCategories' && isManager && <ExpenseCategoriesSection />}
          {effectiveSection === 'appearance' && <ThemeSettingsCard />}
        </div>
      </div>
    </div>
  );
}
