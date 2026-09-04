import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Users, Plus, X, ShieldAlert, Copy, Ban, CheckCircle } from 'lucide-react';
import { useSuperAdminAuthContext } from '../../hooks/useSuperAdminAuthContext';
import { platformAdminService } from '../../services/platformApi';
import { STATUS_BADGE } from './constants';

function CreateAdminModal({ onClose, onCreated }) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { username: '', fullName: '' } });

  const onSubmit = async (data) => {
    try {
      const res = await platformAdminService.create(data);
      onCreated(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || t('superadmin.createAdminError'));
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">{t('superadmin.newAdmin')}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-4">
          <div>
            <label className="field-label">{t('superadmin.adminFullName')}</label>
            <input
              type="text"
              className="input-field"
              placeholder={t('superadmin.adminFullNamePlaceholder')}
              autoFocus
              {...register('fullName', { required: true })}
            />
            {errors.fullName && <p className="field-error">{t('common.required')}</p>}
          </div>
          <div>
            <label className="field-label">{t('superadmin.adminUsername')}</label>
            <input
              type="text"
              className="input-field"
              placeholder={t('superadmin.adminUsernamePlaceholder')}
              {...register('username', { required: true })}
            />
            {errors.username && <p className="field-error">{t('common.required')}</p>}
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={onClose} className="btn btn-outline">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Yangi superadmin yaratilgandan keyin login/parolni bir martalik ko'rsatish uchun
// doimiy panel — CompanyDetailPage'dagi AdminCredentialsPanel bilan bir xil uslub.
function NewAdminCredentialsPanel({ result, onClose }) {
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
        <button type="button" onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer shrink-0">
          <X size={18} />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wide">{t('superadmin.adminUsername')}</p>
            <p className="text-slate-900 dark:text-slate-100 font-mono text-base font-semibold truncate">{result.username}</p>
          </div>
          <button
            type="button"
            onClick={() => copy(result.username, t('superadmin.adminUsername'))}
            className="shrink-0 w-9 h-9 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
          >
            <Copy size={16} />
          </button>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wide">{t('auth.password')}</p>
            <p className="text-slate-900 dark:text-slate-100 font-mono text-base font-semibold truncate">{result.password}</p>
          </div>
          <button
            type="button"
            onClick={() => copy(result.password, t('auth.password'))}
            className="shrink-0 w-9 h-9 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
          >
            <Copy size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminsPage() {
  const { t } = useTranslation();
  const { user } = useSuperAdminAuthContext();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState(null);

  const reload = useCallback(async () => {
    try {
      const res = await platformAdminService.list();
      setAdmins(res.data);
    } catch {
      toast.error(t('superadmin.adminsLoadError'));
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    platformAdminService
      .list()
      .then((res) => {
        if (!cancelled) setAdmins(res.data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('superadmin.adminsLoadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleCreated = (result) => {
    setCreateOpen(false);
    setNewAdmin(result);
    toast.success(t('superadmin.createAdminSuccess'));
    reload();
  };

  const handleDeactivate = async (admin) => {
    if (!window.confirm(t('superadmin.deactivateAdminConfirm'))) return;
    try {
      await platformAdminService.deactivate(admin.id);
      toast.success(t('superadmin.deactivateAdminSuccess'));
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || t('superadmin.deactivateAdminError'));
    }
  };

  const handleActivate = async (admin) => {
    try {
      await platformAdminService.activate(admin.id);
      toast.success(t('superadmin.activateAdminSuccess'));
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || t('superadmin.activateAdminError'));
    }
  };

  const isSelf = (admin) => admin.username === user?.username;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('superadmin.admins')}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('superadmin.adminsSubtitle')}</p>
        </div>
        <button type="button" onClick={() => setCreateOpen(true)} className="btn" style={{ background: '#d97706', color: '#fff' }}>
          <Plus size={16} />
          {t('superadmin.newAdmin')}
        </button>
      </div>

      {newAdmin && <NewAdminCredentialsPanel result={newAdmin} onClose={() => setNewAdmin(null)} />}

      {loading ? (
        <div className="card py-16 flex flex-col items-center gap-3">
          <span className="w-8 h-8 border-[3px] border-slate-200 dark:border-slate-700 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-slate-400 dark:text-slate-500 text-sm">{t('common.loading')}</p>
        </div>
      ) : admins.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <Users size={24} className="text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('superadmin.adminsEmpty')}</p>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('superadmin.adminFullName')}</th>
                <th>{t('superadmin.adminUsername')}</th>
                <th>{t('common.status')}</th>
                <th>{t('common.createdAt')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id} className={isSelf(a) ? 'bg-amber-50/60 dark:bg-amber-900/10' : undefined}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Users size={15} />
                      </div>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {a.fullName}
                        {isSelf(a) && (
                          <span className="text-slate-400 dark:text-slate-500 font-normal text-xs ml-1.5">({t('superadmin.you')})</span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="text-slate-600 dark:text-slate-300">{a.username}</td>
                  <td>
                    <span className={a.isActive ? STATUS_BADGE.ACTIVE : STATUS_BADGE.BLOCKED}>
                      {a.isActive ? t('superadmin.adminActive') : t('superadmin.adminInactive')}
                    </span>
                  </td>
                  <td className="text-slate-500 dark:text-slate-400 text-xs">
                    {a.createdAt ? new Date(a.createdAt).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                  </td>
                  <td>
                    {isSelf(a) ? (
                      <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                    ) : a.isActive ? (
                      <button type="button" onClick={() => handleDeactivate(a)} className="btn-icon danger" title={t('superadmin.deactivateAdminBtn')}>
                        <Ban size={15} />
                      </button>
                    ) : (
                      <button type="button" onClick={() => handleActivate(a)} className="btn-icon" title={t('superadmin.activateAdminBtn')}>
                        <CheckCircle size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && <CreateAdminModal onClose={() => setCreateOpen(false)} onCreated={handleCreated} />}
    </div>
  );
}
