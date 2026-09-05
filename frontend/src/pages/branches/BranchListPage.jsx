import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Building2, Plus, Trash2, Search, CheckCircle2, X } from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { branchService } from '../../services/api';

// Faqat yaratish uchun — tahrirlash endi BranchDetailPage.jsx'da joyida (inline) amalga
// oshiriladi (EditBranchInfoForm), shu sabab bu yerda `branch` prop/isActive checkbox
// endi kerak emas: CompanyCreatePage.jsx / CompanyDetailPage.jsx'dagi kabi yaratish va
// joyida-tahrirlash formalari bu kodeksda doim mustaqil.
function BranchModal({ onClose, onCreated }) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { name: '', address: '', phone: '', workingHours: '' } });

  const onSubmit = async (data) => {
    try {
      await branchService.create({
        name: data.name,
        address: data.address,
        phone: data.phone || null,
        workingHours: data.workingHours || null,
      });
      toast.success(t('branches.createSuccess'));
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.message || t('branches.createError'));
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">{t('branches.newBranch')}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer">
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

export default function BranchListPage() {
  const { t } = useTranslation();
  const { isOwner } = useTenantAuthContext();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');

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

  const handleCreated = () => {
    setModalOpen(false);
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

  // Qidiruv nomi bo'yicha — allaqachon yuklangan `branches` massividan mijoz tomonida,
  // ProductsPage.jsx'dagi kategoriya filtri konventsiyasiga muvofiq (filiallar ro'yxati
  // odatda kichik bo'lgani uchun debounce/server so'rovi shart emas).
  const filteredBranches = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter((b) => b.name?.toLowerCase().includes(q));
  }, [branches, searchInput]);

  const activeCount = useMemo(() => branches.filter((b) => b.isActive ?? true).length, [branches]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('branches.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('branches.subtitle')}</p>
        </div>
        {isOwner && (
          <button type="button" onClick={() => setModalOpen(true)} className="btn btn-primary">
            <Plus size={16} />
            {t('branches.newBranch')}
          </button>
        )}
      </div>

      {!loading && branches.length > 0 && (
        <div className="grid grid-cols-2 gap-5 max-w-lg">
          <div className="card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
              <Building2 size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide truncate">
                {t('branches.stats.total')}
              </p>
              <p className="text-slate-900 dark:text-slate-100 text-2xl font-bold mt-0.5">{branches.length}</p>
            </div>
          </div>
          <div className="card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide truncate">
                {t('branches.stats.active')}
              </p>
              <p className="text-slate-900 dark:text-slate-100 text-2xl font-bold mt-0.5">{activeCount}</p>
            </div>
          </div>
        </div>
      )}

      {!loading && branches.length > 0 && (
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            className="input-field !pl-9"
            placeholder={t('branches.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      )}

      {loading ? (
        <div className="text-slate-500 dark:text-slate-400 text-sm">{t('common.loading')}</div>
      ) : branches.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <Building2 size={24} className="text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('branches.empty')}</p>
        </div>
      ) : filteredBranches.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <Search size={24} className="text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('branches.empty')}</p>
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
              {filteredBranches.map((b) => (
                <tr key={b.id}>
                  <td className="font-medium">
                    <Link to={`/branches/${b.id}`} className="text-amber-700 hover:text-amber-800 hover:underline">
                      {b.name}
                    </Link>
                  </td>
                  <td className="text-slate-600 dark:text-slate-300">{b.address}</td>
                  <td>
                    <span className={b.isActive ? 'badge badge-green' : 'badge badge-slate'}>
                      {b.isActive ? t('branches.active') : t('branches.inactive')}
                    </span>
                  </td>
                  {isOwner && (
                    <td>
                      <div className="flex items-center gap-1">
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

      {modalOpen && <BranchModal onClose={() => setModalOpen(false)} onCreated={handleCreated} />}
    </div>
  );
}
