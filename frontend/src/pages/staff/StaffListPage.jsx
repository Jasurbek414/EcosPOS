import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Users, Plus, X } from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { branchService, userService } from '../../services/api';

const ROLES = ['OWNER', 'MANAGER', 'CASHIER'];

function CreateStaffModal({ branches, onClose, onCreated }) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { username: '', password: '', fullName: '', role: 'CASHIER', branchId: '' } });

  const onSubmit = async (data) => {
    try {
      await userService.create({ ...data, branchId: data.branchId || null });
      toast.success(t('staff.createSuccess'));
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.message || t('staff.createError'));
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-900">{t('staff.newStaff')}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-4">
          <div>
            <label className="field-label">{t('staff.fullName')}</label>
            <input
              type="text"
              className="input-field"
              placeholder={t('staff.fullNamePlaceholder')}
              autoFocus
              {...register('fullName', { required: true })}
            />
            {errors.fullName && <p className="field-error">{t('common.required')}</p>}
          </div>
          <div>
            <label className="field-label">{t('staff.username')}</label>
            <input
              type="text"
              className="input-field"
              placeholder={t('staff.usernamePlaceholder')}
              {...register('username', { required: true })}
            />
            {errors.username && <p className="field-error">{t('common.required')}</p>}
          </div>
          <div>
            <label className="field-label">{t('staff.password')}</label>
            <input type="password" className="input-field" {...register('password', { required: true, minLength: 4 })} />
            {errors.password && <p className="field-error">{t('common.required')}</p>}
          </div>
          <div>
            <label className="field-label">{t('staff.role')}</label>
            <select className="input-field" {...register('role', { required: true })}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`staff.roles.${r}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">{t('staff.branch')}</label>
            <select className="input-field" {...register('branchId')}>
              <option value="">{t('staff.selectBranch')}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
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

export default function StaffListPage() {
  const { t } = useTranslation();
  const { isOwner } = useTenantAuthContext();
  const [staff, setStaff] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [staffRes, branchesRes] = await Promise.all([userService.list(), branchService.list()]);
      setStaff(staffRes.data);
      setBranches(branchesRes.data);
    } catch {
      toast.error(t('staff.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([userService.list(), branchService.list()])
      .then(([staffRes, branchesRes]) => {
        if (cancelled) return;
        setStaff(staffRes.data);
        setBranches(branchesRes.data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('staff.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleCreated = () => {
    setModalOpen(false);
    reload();
  };

  const branchName = (id) => branches.find((b) => b.id === id)?.name || '—';

  const roleBadgeClass = (role) => {
    if (role === 'OWNER') return 'badge badge-amber';
    if (role === 'MANAGER') return 'badge badge-blue';
    return 'badge badge-slate';
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('staff.title')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('staff.subtitle')}</p>
        </div>
        {isOwner && (
          <button type="button" onClick={() => setModalOpen(true)} className="btn btn-primary">
            <Plus size={16} />
            {t('staff.newStaff')}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm">{t('common.loading')}</div>
      ) : staff.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
            <Users size={24} className="text-slate-400" />
          </div>
          <p className="text-slate-500 text-sm">{t('staff.empty')}</p>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('staff.fullName')}</th>
                <th>{t('staff.username')}</th>
                <th>{t('staff.role')}</th>
                <th>{t('staff.branch')}</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id ?? s.username}>
                  <td className="font-medium text-slate-900">{s.fullName}</td>
                  <td className="text-slate-600">{s.username}</td>
                  <td>
                    <span className={roleBadgeClass(s.role)}>{t(`staff.roles.${s.role}`)}</span>
                  </td>
                  <td className="text-slate-600">{s.branchName || branchName(s.branchId)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && <CreateStaffModal branches={branches} onClose={() => setModalOpen(false)} onCreated={handleCreated} />}
    </div>
  );
}
