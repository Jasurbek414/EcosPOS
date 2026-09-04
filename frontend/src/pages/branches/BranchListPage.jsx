import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Building2, Plus, X, Pencil, Trash2 } from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { branchService } from '../../services/api';

function BranchModal({ branch, onClose, onSaved }) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: branch?.name || '',
      address: branch?.address || '',
      isActive: branch?.isActive ?? true,
    },
  });

  const onSubmit = async (data) => {
    try {
      if (branch) {
        await branchService.update(branch.id, { name: data.name, address: data.address, isActive: data.isActive });
        toast.success(t('branches.updateSuccess'));
      } else {
        await branchService.create({ name: data.name, address: data.address });
        toast.success(t('branches.createSuccess'));
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || t(branch ? 'branches.updateError' : 'branches.createError'));
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-900">{branch ? t('branches.editBranch') : t('branches.newBranch')}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-4">
          <div>
            <label className="field-label">{t('branches.name')}</label>
            <input
              type="text"
              className="input-field"
              placeholder={t('branches.namePlaceholder')}
              autoFocus
              {...register('name', { required: true })}
            />
            {errors.name && <p className="field-error">{t('common.required')}</p>}
          </div>
          <div>
            <label className="field-label">{t('branches.address')}</label>
            <input
              type="text"
              className="input-field"
              placeholder={t('branches.addressPlaceholder')}
              {...register('address', { required: true })}
            />
            {errors.address && <p className="field-error">{t('common.required')}</p>}
          </div>
          {branch && (
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
              <input type="checkbox" {...register('isActive')} />
              {t('branches.isActive')}
            </label>
          )}
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={onClose} className="btn btn-outline">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {branch ? t('common.save') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BranchListPage() {
  const { t } = useTranslation();
  const { isOwner } = useTenantAuthContext();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await branchService.list();
      setBranches(res.data);
    } catch {
      toast.error(t('branches.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    branchService
      .list()
      .then((res) => {
        if (!cancelled) setBranches(res.data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('branches.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (branch) => {
    setEditing(branch);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSaved = () => {
    closeModal();
    reload();
  };

  const handleDelete = async (branch) => {
    if (!window.confirm(t('branches.confirmDelete'))) return;
    try {
      await branchService.remove(branch.id);
      toast.success(t('branches.deleteSuccess'));
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || t('branches.deleteError'));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('branches.title')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('branches.subtitle')}</p>
        </div>
        {isOwner && (
          <button type="button" onClick={openCreate} className="btn btn-primary">
            <Plus size={16} />
            {t('branches.newBranch')}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm">{t('common.loading')}</div>
      ) : branches.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
            <Building2 size={24} className="text-slate-400" />
          </div>
          <p className="text-slate-500 text-sm">{t('branches.empty')}</p>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('branches.name')}</th>
                <th>{t('branches.address')}</th>
                <th>{t('common.status')}</th>
                {isOwner && <th>{t('common.actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id}>
                  <td className="font-medium text-slate-900">{b.name}</td>
                  <td className="text-slate-600">{b.address}</td>
                  <td>
                    <span className={b.isActive ? 'badge badge-green' : 'badge badge-slate'}>
                      {b.isActive ? t('branches.active') : t('branches.inactive')}
                    </span>
                  </td>
                  {isOwner && (
                    <td>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => openEdit(b)} className="btn-icon" title={t('common.edit')}>
                          <Pencil size={15} />
                        </button>
                        <button type="button" onClick={() => handleDelete(b)} className="btn-icon danger" title={t('common.delete')}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && <BranchModal branch={editing} onClose={closeModal} onSaved={handleSaved} />}
    </div>
  );
}
