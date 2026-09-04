import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Building2, Ban, Unlock, KeyRound, X, ShieldAlert, Copy, History } from 'lucide-react';
import { companyService } from '../../services/platformApi';

const STATUS_BADGE = {
  ACTIVE: 'badge badge-green',
  BLOCKED: 'badge badge-slate',
  SUSPENDED_UNPAID: 'badge badge-amber',
};

function Field({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wide">{label}</span>
      <span className="text-slate-900 text-sm font-medium">{value ?? '—'}</span>
    </div>
  );
}

function BlockModal({ onClose, onBlocked, companyId }) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { reason: '' } });

  const onSubmit = async (data) => {
    try {
      await companyService.block(companyId, { reason: data.reason });
      toast.success(t('superadmin.blockSuccess'));
      onBlocked();
    } catch (err) {
      toast.error(err.response?.data?.message || t('superadmin.blockError'));
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-900">{t('superadmin.blockTitle')}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-4">
          <div>
            <label className="field-label">{t('superadmin.blockReason')}</label>
            <textarea
              className="input-field"
              rows={3}
              placeholder={t('superadmin.blockReasonPlaceholder')}
              autoFocus
              {...register('reason', { required: true })}
            />
            {errors.reason && <p className="field-error">{t('common.required')}</p>}
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={onClose} className="btn btn-outline">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-danger">
              {t('superadmin.blockConfirmBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Administrator paroli tiklangandan keyin yangi login/parolni bir martalik ko'rsatish uchun
// doimiy panel — CompanyCreatePage'dagi administrator kirish ma'lumotlari paneli bilan bir xil uslub.
function AdminCredentialsPanel({ result, onClose }) {
  const { t } = useTranslation();

  const copy = (value, label) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label}: ${t('common.copied')}`);
  };

  return (
    <div className="card p-6 flex flex-col gap-4" style={{ borderColor: '#fde68a' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldAlert size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-amber-800 text-sm font-medium leading-relaxed">{t('superadmin.credentialsWarning')}</p>
        </div>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer shrink-0">
          <X size={18} />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wide">{t('superadmin.adminUsername')}</p>
            <p className="text-slate-900 font-mono text-base font-semibold truncate">{result.adminUsername}</p>
          </div>
          <button
            type="button"
            onClick={() => copy(result.adminUsername, t('superadmin.adminUsername'))}
            className="shrink-0 w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <Copy size={16} />
          </button>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wide">{t('auth.password')}</p>
            <p className="text-slate-900 font-mono text-base font-semibold truncate">{result.adminPassword}</p>
          </div>
          <button
            type="button"
            onClick={() => copy(result.adminPassword, t('auth.password'))}
            className="shrink-0 w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <Copy size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CompanyDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [adminCreds, setAdminCreds] = useState(null);

  const reload = useCallback(async () => {
    try {
      const res = await companyService.detail(id);
      setCompany(res.data);
    } catch {
      setNotFound(true);
      toast.error(t('superadmin.detailLoadError'));
    }
  }, [id, t]);

  useEffect(() => {
    let cancelled = false;
    companyService
      .detail(id)
      .then((res) => {
        if (!cancelled) setCompany(res.data);
      })
      .catch(() => {
        if (cancelled) return;
        setNotFound(true);
        toast.error(t('superadmin.detailLoadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  const handleBlocked = () => {
    setBlockModalOpen(false);
    reload();
  };

  const handleUnblock = async () => {
    if (!window.confirm(t('superadmin.unblockConfirm'))) return;
    try {
      await companyService.unblock(id);
      toast.success(t('superadmin.unblockSuccess'));
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || t('superadmin.unblockError'));
    }
  };

  const handleResetAdminPassword = async () => {
    if (!window.confirm(t('superadmin.resetAdminPasswordConfirm'))) return;
    try {
      const res = await companyService.resetAdminPassword(id);
      setAdminCreds(res.data);
      toast.success(t('superadmin.resetAdminPasswordSuccess'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('superadmin.resetAdminPasswordError'));
    }
  };

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-8">
      <button
        type="button"
        onClick={() => navigate('/spd/companies')}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm font-medium w-fit cursor-pointer"
      >
        <ArrowLeft size={16} />
        {t('superadmin.backToCompanies')}
      </button>

      {loading ? (
        <div className="text-slate-500 text-sm">{t('common.loading')}</div>
      ) : notFound || !company ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
            <Building2 size={24} className="text-slate-400" />
          </div>
          <p className="text-slate-500 text-sm">{t('superadmin.notFound')}</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
              <Building2 size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{company.name}</h1>
              <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{company.slug}</span>
            </div>
          </div>

          <div className="card p-7 grid grid-cols-2 gap-6">
            <Field label={t('superadmin.id')} value={company.id} />
            <Field
              label={t('common.status')}
              value={<span className={STATUS_BADGE[company.status] || 'badge badge-slate'}>{company.status}</span>}
            />
            <Field label={t('superadmin.plan')} value={company.plan} />
            <Field
              label={t('common.createdAt')}
              value={company.createdAt ? new Date(company.createdAt).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
            />
            {(company.blockedAt || company.blockedReason) && (
              <>
                <Field
                  label={t('superadmin.blockedAt')}
                  value={company.blockedAt ? new Date(company.blockedAt).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                />
                <Field label={t('superadmin.blockedReason')} value={company.blockedReason} />
              </>
            )}
          </div>

          <div className="card p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-sm">{t('superadmin.actions')}</h2>
              <Link
                to={`/spd/audit-log?companyId=${company.id}`}
                className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-xs font-medium"
              >
                <History size={14} />
                {t('superadmin.viewAuditLog')}
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {company.status === 'ACTIVE' && (
                <button type="button" onClick={() => setBlockModalOpen(true)} className="btn btn-danger">
                  <Ban size={16} />
                  {t('superadmin.blockBtn')}
                </button>
              )}
              {company.status === 'BLOCKED' && (
                <button type="button" onClick={handleUnblock} className="btn btn-outline">
                  <Unlock size={16} />
                  {t('superadmin.unblockBtn')}
                </button>
              )}
              <button type="button" onClick={handleResetAdminPassword} className="btn btn-outline">
                <KeyRound size={16} />
                {t('superadmin.resetAdminPasswordBtn')}
              </button>
            </div>
          </div>

          {adminCreds && <AdminCredentialsPanel result={adminCreds} onClose={() => setAdminCreds(null)} />}
        </>
      )}

      {blockModalOpen && <BlockModal companyId={id} onClose={() => setBlockModalOpen(false)} onBlocked={handleBlocked} />}
    </div>
  );
}
