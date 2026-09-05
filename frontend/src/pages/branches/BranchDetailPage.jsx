import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Building2, Pencil, Trash2, Power, Users, Boxes } from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { branchService } from '../../services/api';
import BranchStatsHeader from '../../components/ui/BranchStatsHeader';

function Field({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wide">{label}</span>
      <span className="text-slate-900 dark:text-slate-100 text-sm font-medium">{value ?? '—'}</span>
    </div>
  );
}

// Filial ma'lumotlarini joyida (inline) tahrirlash formasi — CompanyDetailPage.jsx'dagi
// EditCompanyInfoForm bilan bir xil naqsh: BranchModal (ro'yxat sahifasidagi yaratish
// oynasi)dan ATAYLAB alohida, chunki bu kodeksda yaratish va joyida-tahrirlash formalari
// doim mustaqil komponentlar (umumiy maydonlar bo'lsa ham baham ko'rilmaydi).
function EditBranchInfoForm({ branch, onSaved, onCancel }) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: branch.name || '',
      address: branch.address || '',
      phone: branch.phone || '',
      workingHours: branch.workingHours || '',
      isActive: branch.isActive ?? true,
    },
  });

  const onSubmit = async (data) => {
    try {
      const res = await branchService.update(branch.id, {
        name: data.name,
        address: data.address,
        phone: data.phone || null,
        workingHours: data.workingHours || null,
        isActive: data.isActive,
      });
      onSaved(res.data);
      toast.success(t('branches.updateSuccess'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('branches.updateError'));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="field-label">{t('branches.name')}</label>
          <input type="text" className="input-field" autoFocus {...register('name', { required: true })} />
          {errors.name && <p className="field-error">{t('common.required')}</p>}
        </div>
        <div>
          <label className="field-label">{t('branches.address')}</label>
          <input type="text" className="input-field" {...register('address', { required: true })} />
          {errors.address && <p className="field-error">{t('common.required')}</p>}
        </div>
        <div>
          <label className="field-label">{t('branches.phone')}</label>
          <input type="text" className="input-field" placeholder={t('branches.phonePlaceholder')} {...register('phone')} />
        </div>
        <div>
          <label className="field-label">{t('branches.workingHours')}</label>
          <input
            type="text"
            className="input-field"
            placeholder={t('branches.workingHoursPlaceholder')}
            {...register('workingHours')}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer select-none">
        <input type="checkbox" {...register('isActive')} />
        {t('branches.isActive')}
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn btn-outline">
          {t('common.cancel')}
        </button>
        <button type="submit" disabled={isSubmitting} className="btn btn-primary">
          {t('common.save')}
        </button>
      </div>
    </form>
  );
}

export default function BranchDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOwner } = useTenantAuthContext();
  const [branch, setBranch] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  // Ro'yxat sahifasidagi qalam (Pencil) tugmasi shu holatni yuborib, profilga
  // kirilgan zahoti tahrirlash formasi ochiq bo'lishini ta'minlaydi.
  const [editingInfo, setEditingInfo] = useState(() => Boolean(location.state?.autoEdit));

  const reloadStats = useCallback(async () => {
    try {
      const res = await branchService.stats(id);
      setStats(res.data);
    } catch {
      // Statistika alohida so'rov — muvaffaqiyatsiz bo'lsa filial ma'lumotini
      // ko'rsatishga xalaqit bermaydi, faqat kartalar "—" bo'lib qoladi.
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([branchService.get(id), branchService.stats(id)])
      .then(([branchRes, statsRes]) => {
        if (cancelled) return;
        setBranch(branchRes.data);
        setStats(statsRes.data);
      })
      .catch(() => {
        if (cancelled) return;
        setNotFound(true);
        toast.error(t('branches.detailLoadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  const handleInfoSaved = (updated) => {
    setBranch(updated);
    setEditingInfo(false);
  };

  const handleToggleActive = async () => {
    if (!branch) return;
    try {
      const res = await branchService.update(branch.id, {
        name: branch.name,
        address: branch.address,
        phone: branch.phone || null,
        workingHours: branch.workingHours || null,
        isActive: !branch.isActive,
      });
      setBranch(res.data);
      toast.success(t('branches.updateSuccess'));
      reloadStats();
    } catch (err) {
      toast.error(err.response?.data?.message || t('branches.updateError'));
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('branches.confirmDelete'))) return;
    try {
      await branchService.remove(id);
      toast.success(t('branches.deleteSuccess'));
      navigate('/branches');
    } catch (err) {
      toast.error(err.response?.data?.message || t('branches.deleteError'));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={() => navigate('/branches')}
        className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 text-sm font-medium w-fit cursor-pointer"
      >
        <ArrowLeft size={16} />
        {t('branches.backToBranches')}
      </button>

      {loading ? (
        <div className="card py-16 flex flex-col items-center gap-3">
          <span className="w-8 h-8 border-[3px] border-slate-200 dark:border-slate-700 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-slate-400 dark:text-slate-500 text-sm">{t('common.loading')}</p>
        </div>
      ) : notFound || !branch ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <Building2 size={24} className="text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('branches.notFound')}</p>
        </div>
      ) : (
        <>
          {/* Filial banneri — CompanyDetailPage.jsx bilan bir xil settings-card-banner-dark
              shakli, holat belgisi va manzil/telefon ostki matn bilan. */}
          <div className="card overflow-hidden">
            <div className="settings-card-banner settings-card-banner-dark">
              <div className="settings-avatar settings-avatar-square">
                <Building2 size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-white font-bold text-lg truncate">{branch.name}</h1>
                  <span
                    className={branch.isActive ? 'badge badge-green' : 'badge badge-slate'}
                    style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
                  >
                    {branch.isActive ? t('branches.active') : t('branches.inactive')}
                  </span>
                </div>
                <p className="text-slate-300 text-xs mt-1 truncate">
                  {branch.address}
                  {branch.phone ? ` · ${branch.phone}` : ''}
                </p>
              </div>
            </div>
          </div>

          <BranchStatsHeader stats={stats} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="card p-7 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{t('branches.detail')}</h2>
                  {isOwner && !editingInfo && (
                    <button
                      type="button"
                      onClick={() => setEditingInfo(true)}
                      className="flex items-center gap-1.5 text-amber-700 text-xs font-semibold hover:text-amber-800 cursor-pointer"
                    >
                      <Pencil size={13} />
                      {t('common.edit')}
                    </button>
                  )}
                </div>

                {editingInfo ? (
                  <EditBranchInfoForm branch={branch} onSaved={handleInfoSaved} onCancel={() => setEditingInfo(false)} />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Field label={t('branches.name')} value={branch.name} />
                    <Field label={t('branches.address')} value={branch.address} />
                    <Field label={t('branches.phone')} value={branch.phone} />
                    <Field label={t('branches.workingHours')} value={branch.workingHours} />
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {isOwner && (
                <div className="card p-6 flex flex-col gap-3">
                  <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{t('common.actions')}</h2>
                  <div className="flex flex-col gap-2">
                    <button type="button" onClick={handleToggleActive} className="btn btn-outline w-full justify-center">
                      <Power size={16} />
                      {branch.isActive ? t('branches.deactivateBtn') : t('branches.activateBtn')}
                    </button>
                    <button type="button" onClick={handleDelete} className="btn btn-danger w-full justify-center">
                      <Trash2 size={16} />
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              )}

              <Link
                to="/staff"
                state={{ branchId: branch.id }}
                className="card p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
                  <Users size={16} />
                </div>
                <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">{t('branches.viewStaff')}</span>
              </Link>

              <Link
                to="/inventory/stock"
                state={{ branchId: branch.id }}
                className="card p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
                  <Boxes size={16} />
                </div>
                <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">{t('branches.viewStock')}</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
