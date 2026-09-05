import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRight, ArrowRight } from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { useUnits } from '../../hooks/useUnits';
import { branchService, productService, stockTransferService, userService } from '../../services/api';
import InventoryTabs from './InventoryTabs';

// MANAGER faqat o'z filiali ishtirok etgan transferni amalga oshira oladi (chiqish
// YOKI kirish tomonidan). "Boshqa filialga yuborish" mental modeli "qayerdan
// olishga" qaraganda tabiiyroq (menejer o'z omboridan boshqa filialga jo'natadi),
// shuning uchun MANAGER'ning o'z filiali standart bo'yicha "qayerdan" (fromBranchId)
// tomoniga qo'yiladi, "qayerga" (toBranchId) esa erkin tanlanadi.
export default function TransfersPage() {
  const { t } = useTranslation();
  const { user, isOwner, isManager } = useTenantAuthContext();
  const { unitLabel } = useUnits();
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [usersById, setUsersById] = useState({});
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      productId: '',
      fromBranchId: isOwner ? '' : (user?.branchId ?? ''),
      toBranchId: '',
      quantity: '',
      note: '',
    },
  });

  // Mahsulotlar va filiallar ro'yxati — forma pikerlarini to'ldirish uchun bir marta
  // yuklanadi. Filiallar uchun ATAYLAB /branches/all-names ishlatiladi (oddiy
  // branchService.list() emas) — u MANAGER/CASHIER uchun faqat o'z filialini
  // qaytaradi, lekin transfer formasida "qayerga" pikeri BARCHA filiallarni
  // ko'rsatishi kerak (rolga qaramasdan).
  useEffect(() => {
    let cancelled = false;
    Promise.all([productService.list({}), branchService.listNames()])
      .then(([productsRes, branchesRes]) => {
        if (cancelled) return;
        setProducts(productsRes.data.filter((p) => p.isActive));
        setBranches(branchesRes.data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('inventory.transfers.loadError'));
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  // "Kim bajardi" ustuni uchun — StockTransferResponse'da faqat createdByUserId bor,
  // ism yo'q (StockMovementResponse'dan farqli). Shuning uchun xodimlar ro'yxatini
  // alohida yuklab, id -> F.I.O. mosligini o'zimiz quramiz. CASHIER uchun GET /users
  // 403 qaytaradi — bu holatda jadvalda shunchaki "—" ko'rsatiladi (xatolik ko'rsatilmaydi,
  // chunki bu ustun ixtiyoriy bezak, sahifaning asosiy vazifasi emas).
  useEffect(() => {
    if (!isManager) return undefined;
    let cancelled = false;
    userService
      .list()
      .then((res) => {
        if (cancelled) return;
        const map = {};
        res.data.forEach((u) => {
          map[u.id] = u.fullName;
        });
        setUsersById(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isManager]);

  // OWNER — barcha transferlar tarixini ko'radi; boshqalar uchun o'z filiali ishtirok
  // etgan (chiqish YOKI kirish) transferlar bilan cheklanadi (backend shu bo'yicha filtrlaydi).
  const branchFilter = isOwner ? undefined : user?.branchId;

  const reload = useCallback(async () => {
    try {
      const res = await stockTransferService.list(branchFilter);
      setTransfers(res.data);
    } catch {
      toast.error(t('inventory.transfers.loadError'));
    }
  }, [branchFilter, t]);

  useEffect(() => {
    let cancelled = false;
    stockTransferService
      .list(branchFilter)
      .then((res) => {
        if (!cancelled) setTransfers(res.data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('inventory.transfers.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchFilter, t]);

  const onSubmit = async (data) => {
    if (data.fromBranchId === data.toBranchId) {
      toast.error(t('inventory.transfers.sameBranchError'));
      return;
    }
    try {
      await stockTransferService.create({
        fromBranchId: data.fromBranchId,
        toBranchId: data.toBranchId,
        productId: data.productId,
        quantity: Number(data.quantity),
        note: data.note || null,
      });
      toast.success(t('inventory.transfers.createSuccess'));
      reset({
        productId: '',
        fromBranchId: data.fromBranchId,
        toBranchId: '',
        quantity: '',
        note: '',
      });
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || t('inventory.transfers.createError'));
    }
  };

  const formatDate = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleString('uz-UZ', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <InventoryTabs />

      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('inventory.transfers.title')}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('inventory.transfers.subtitle')}</p>
      </div>

      {isManager && (
        <form onSubmit={handleSubmit(onSubmit)} className="card p-6 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <label className="field-label">{t('inventory.transfers.product')}</label>
              <select className="input-field" {...register('productId', { required: true })}>
                <option value="">{t('inventory.transfers.selectProduct')}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {errors.productId && <p className="field-error">{t('common.required')}</p>}
            </div>
            <div>
              <label className="field-label">{t('inventory.transfers.fromBranch')}</label>
              <select className="input-field" disabled={!isOwner} {...register('fromBranchId', { required: true })}>
                <option value="">{t('inventory.transfers.selectBranch')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              {errors.fromBranchId && <p className="field-error">{t('common.required')}</p>}
            </div>
            <div>
              <label className="field-label">{t('inventory.transfers.toBranch')}</label>
              <select className="input-field" {...register('toBranchId', { required: true })}>
                <option value="">{t('inventory.transfers.selectBranch')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              {errors.toBranchId && <p className="field-error">{t('common.required')}</p>}
            </div>
            <div>
              <label className="field-label">{t('inventory.transfers.quantity')}</label>
              <input
                type="number"
                step="0.001"
                min="0"
                className="input-field"
                {...register('quantity', { required: true, validate: (v) => Number(v) > 0 })}
              />
              {errors.quantity && <p className="field-error">{t('common.required')}</p>}
            </div>
          </div>

          <div>
            <label className="field-label">{t('inventory.transfers.note')}</label>
            <input type="text" className="input-field" placeholder={t('inventory.transfers.notePlaceholder')} {...register('note')} />
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              <ArrowLeftRight size={16} />
              {t('inventory.transfers.submit')}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-slate-500 dark:text-slate-400 text-sm">{t('common.loading')}</div>
      ) : transfers.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <ArrowLeftRight size={24} className="text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('inventory.transfers.empty')}</p>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('inventory.transfers.date')}</th>
                <th>{t('inventory.transfers.product')}</th>
                <th>{t('inventory.transfers.route')}</th>
                <th>{t('inventory.transfers.quantity')}</th>
                <th>{t('inventory.transfers.note')}</th>
                <th>{t('inventory.transfers.performedBy')}</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((tr) => (
                <tr key={tr.id}>
                  <td className="text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatDate(tr.createdAt)}</td>
                  <td className="font-medium text-slate-900 dark:text-slate-100">{tr.productName}</td>
                  <td className="text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      {tr.fromBranchName}
                      <ArrowRight size={13} className="text-slate-400 dark:text-slate-500" />
                      {tr.toBranchName}
                    </span>
                  </td>
                  <td className="text-slate-600 dark:text-slate-300">
                    {Number(tr.quantity).toLocaleString('uz-UZ')} {unitLabel(tr.unit)}
                  </td>
                  <td className="text-slate-600 dark:text-slate-300">{tr.note || '—'}</td>
                  <td className="text-slate-600 dark:text-slate-300">{usersById[tr.createdByUserId] || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
