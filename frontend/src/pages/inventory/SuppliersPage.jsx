import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Truck, Plus, X, Pencil, Trash2 } from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { supplierService } from '../../services/api';
import InventoryTabs from './InventoryTabs';

function SupplierModal({ supplier, onClose, onSaved }) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: supplier?.name || '',
      phone: supplier?.phone || '',
      address: supplier?.address || '',
      contactPerson: supplier?.contactPerson || '',
    },
  });

  const onSubmit = async (data) => {
    try {
      if (supplier) {
        await supplierService.update(supplier.id, data);
        toast.success(t('inventory.suppliers.updateSuccess'));
      } else {
        await supplierService.create(data);
        toast.success(t('inventory.suppliers.createSuccess'));
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || t(supplier ? 'inventory.suppliers.updateError' : 'inventory.suppliers.createError'));
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-900">
            {supplier ? t('inventory.suppliers.editSupplier') : t('inventory.suppliers.newSupplier')}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-4">
          <div>
            <label className="field-label">{t('inventory.suppliers.name')}</label>
            <input
              type="text"
              className="input-field"
              placeholder={t('inventory.suppliers.namePlaceholder')}
              autoFocus
              {...register('name', { required: true })}
            />
            {errors.name && <p className="field-error">{t('common.required')}</p>}
          </div>
          <div>
            <label className="field-label">{t('inventory.suppliers.phone')}</label>
            <input type="text" className="input-field" placeholder={t('inventory.suppliers.phonePlaceholder')} {...register('phone')} />
          </div>
          <div>
            <label className="field-label">{t('inventory.suppliers.address')}</label>
            <input
              type="text"
              className="input-field"
              placeholder={t('inventory.suppliers.addressPlaceholder')}
              {...register('address')}
            />
          </div>
          <div>
            <label className="field-label">{t('inventory.suppliers.contactPerson')}</label>
            <input
              type="text"
              className="input-field"
              placeholder={t('inventory.suppliers.contactPersonPlaceholder')}
              {...register('contactPerson')}
            />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={onClose} className="btn btn-outline">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {supplier ? t('common.save') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SuppliersPage() {
  const { t } = useTranslation();
  const { isManager } = useTenantAuthContext();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await supplierService.list();
      setSuppliers(res.data);
    } catch {
      toast.error(t('inventory.suppliers.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    supplierService
      .list()
      .then((res) => {
        if (!cancelled) setSuppliers(res.data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('inventory.suppliers.loadError'));
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

  const openEdit = (supplier) => {
    setEditing(supplier);
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

  const handleDelete = async (supplier) => {
    if (!window.confirm(t('inventory.suppliers.deleteConfirm'))) return;
    try {
      await supplierService.remove(supplier.id);
      toast.success(t('inventory.suppliers.deleteSuccess'));
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || t('inventory.suppliers.deleteError'));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <InventoryTabs />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('inventory.suppliers.title')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('inventory.suppliers.subtitle')}</p>
        </div>
        {isManager && (
          <button type="button" onClick={openCreate} className="btn btn-primary">
            <Plus size={16} />
            {t('inventory.suppliers.newSupplier')}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm">{t('common.loading')}</div>
      ) : suppliers.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
            <Truck size={24} className="text-slate-400" />
          </div>
          <p className="text-slate-500 text-sm">{t('inventory.suppliers.empty')}</p>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('inventory.suppliers.name')}</th>
                <th>{t('inventory.suppliers.phone')}</th>
                <th>{t('inventory.suppliers.address')}</th>
                <th>{t('inventory.suppliers.contactPerson')}</th>
                {isManager && <th>{t('common.actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium text-slate-900">{s.name}</td>
                  <td className="text-slate-600">{s.phone || '—'}</td>
                  <td className="text-slate-600">{s.address || '—'}</td>
                  <td className="text-slate-600">{s.contactPerson || '—'}</td>
                  {isManager && (
                    <td>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => openEdit(s)} className="btn-icon" title={t('common.edit')}>
                          <Pencil size={15} />
                        </button>
                        <button type="button" onClick={() => handleDelete(s)} className="btn-icon danger" title={t('common.delete')}>
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

      {modalOpen && <SupplierModal supplier={editing} onClose={closeModal} onSaved={handleSaved} />}
    </div>
  );
}
