import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
  Users, Plus, X, Pencil, Trash2, KeyRound, ShieldAlert, Copy, Search, ShieldCheck, Check, Minus,
} from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { branchService, userService } from '../../services/api';
import StaffStatsHeader from '../../components/ui/StaffStatsHeader';

const ROLES = ['OWNER', 'MANAGER', 'CASHIER'];

// Backend kodi asosida tasdiqlangan rollar/huquqlar matritsasi — StaffListPage'dagi
// "Rollar va huquqlar" ma'lumot kartochkasi uchun. Har bir katak {level, note} shaklida:
// level 'full' | 'partial' | 'none'; note bo'lsa aniqlashtiruvchi matn sifatida ko'rsatiladi.
const PERMISSION_ROWS = [
  {
    key: 'pos',
    owner: { level: 'full', note: 'allBranches' },
    manager: { level: 'partial', note: 'ownBranch' },
    cashier: { level: 'partial', note: 'ownBranch' },
  },
  {
    key: 'stockView',
    owner: { level: 'full', note: 'allBranches' },
    manager: { level: 'partial', note: 'ownBranch' },
    cashier: { level: 'partial', note: 'ownBranch' },
  },
  {
    key: 'stockManage',
    owner: { level: 'full', note: 'allBranches' },
    manager: { level: 'partial', note: 'ownBranchTransfer' },
    cashier: { level: 'none' },
  },
  {
    key: 'catalogView',
    owner: { level: 'full' },
    manager: { level: 'full' },
    cashier: { level: 'full' },
  },
  {
    key: 'catalogManage',
    owner: { level: 'full' },
    manager: { level: 'full' },
    cashier: { level: 'none' },
  },
  {
    key: 'reports',
    owner: { level: 'full' },
    manager: { level: 'full' },
    cashier: { level: 'none' },
  },
  {
    key: 'staffView',
    owner: { level: 'full', note: 'all' },
    manager: { level: 'partial', note: 'ownBranch' },
    cashier: { level: 'none' },
  },
  {
    key: 'staffManage',
    owner: { level: 'full' },
    manager: { level: 'none' },
    cashier: { level: 'none' },
  },
  {
    key: 'branchManage',
    owner: { level: 'full' },
    manager: { level: 'none', note: 'ownBranchViewOnly' },
    cashier: { level: 'none' },
  },
  {
    key: 'companySettings',
    owner: { level: 'full' },
    manager: { level: 'none' },
    cashier: { level: 'none' },
  },
  {
    key: 'ownProfile',
    owner: { level: 'full' },
    manager: { level: 'full' },
    cashier: { level: 'full' },
  },
];

// Ruxsat darajasini ({level, note}) ikonka + matn sifatida ko'rsatuvchi katak —
// full = yashil belgi, none = xira X, partial = amber chiziqcha + qisqartirilgan izoh.
function PermissionCell({ cell }) {
  const { t } = useTranslation();
  if (!cell) return <span className="text-slate-300 dark:text-slate-600">—</span>;

  const noteText = cell.note ? t(`staff.rolesPermissions.notes.${cell.note}`) : null;

  if (cell.level === 'full') {
    return (
      <div className="flex items-center gap-1.5 text-emerald-600">
        <Check size={15} className="shrink-0" />
        <span className="text-xs font-semibold">{noteText || t('staff.rolesPermissions.yes')}</span>
      </div>
    );
  }
  if (cell.level === 'none') {
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
          <X size={15} className="shrink-0" />
          <span className="text-xs font-semibold">{t('staff.rolesPermissions.no')}</span>
        </div>
        {noteText && <span className="text-slate-400 dark:text-slate-500 text-[11px] pl-[1.375rem]">{noteText}</span>}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-amber-600">
      <Minus size={15} className="shrink-0" />
      <span className="text-xs font-semibold">{noteText || t('staff.rolesPermissions.no')}</span>
    </div>
  );
}

// Rollarning nima qila olishi haqidagi statik ma'lumot kartochkasi — sof ma'lumotnoma,
// hech qanday tahrirlash imkoniyati yo'q. Backend kodidan tasdiqlangan haqiqiy huquqlar
// (PERMISSION_ROWS) asosida.
function RolesPermissionsCard() {
  const { t } = useTranslation();
  return (
    <div className="card p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          <ShieldCheck size={17} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{t('staff.rolesPermissions.title')}</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{t('staff.rolesPermissions.subtitle')}</p>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('staff.rolesPermissions.action')}</th>
              <th>{t('staff.roles.OWNER')}</th>
              <th>{t('staff.roles.MANAGER')}</th>
              <th>{t('staff.roles.CASHIER')}</th>
            </tr>
          </thead>
          <tbody>
            {PERMISSION_ROWS.map((row) => (
              <tr key={row.key}>
                <td className="font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                  {t(`staff.rolesPermissions.rows.${row.key}`)}
                </td>
                <td>
                  <PermissionCell cell={row.owner} />
                </td>
                <td>
                  <PermissionCell cell={row.manager} />
                </td>
                <td>
                  <PermissionCell cell={row.cashier} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CreateStaffModal({ branches, defaultBranchId, defaultRole, onClose, onCreated }) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      username: '',
      password: '',
      fullName: '',
      role: defaultRole || 'CASHIER',
      branchId: defaultBranchId != null ? String(defaultBranchId) : '',
    },
  });

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
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">{t('staff.newStaff')}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer">
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

// fullName/role/branchId/isActive'ni tahrirlash uchun alohida yengil modal — username/parol
// faqat yaratishda bir marta belgilanadi va backend kontraktiga ko'ra shu yerda o'zgartirilmaydi.
// `isSelf` — joriy tizimga kirgan foydalanuvchi o'zining qatorini tahrirlayotgan bo'lsa true:
// bunday holda backend baribir o'z rolini/faolligini o'zgartirishga yo'l qo'ymaydi, shuning
// uchun keraksiz so'rov yubormaslik uchun rol/faollik maydonlari shu yerda oldindan bloklanadi
// (asosiy tekshiruv baribir backendda — bu faqat UX yaxshilash).
function EditStaffModal({ staffMember, branches, isSelf, onClose, onSaved }) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      fullName: staffMember.fullName || '',
      role: staffMember.role || 'CASHIER',
      branchId: staffMember.branchId || '',
      isActive: staffMember.isActive ?? true,
      baseSalary: staffMember.baseSalary ?? '',
    },
  });

  const onSubmit = async (data) => {
    try {
      // `role`/`isActive` HTML orqali disabled qilinganda RHF ularni submissiya
      // ma'lumotlaridan chiqarib tashlashi mumkin — o'z qatorini tahrirlashda bu
      // maydonlar baribir o'zgarmasligi kerak bo'lgani uchun asl qiymatga qaytariladi.
      const payload = {
        ...data,
        branchId: data.branchId || null,
        role: isSelf ? staffMember.role : data.role,
        isActive: isSelf ? staffMember.isActive ?? true : data.isActive,
        baseSalary: data.baseSalary === '' || data.baseSalary == null ? null : Number(data.baseSalary),
      };
      await userService.update(staffMember.id, payload);
      toast.success(t('staff.updateSuccess'));
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || t('staff.updateError'));
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">{t('staff.editStaff')}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer">
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
            <label className="field-label">{t('staff.role')}</label>
            <select className="input-field" disabled={isSelf} {...register('role', { required: true })}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`staff.roles.${r}`)}
                </option>
              ))}
            </select>
            {isSelf && <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">{t('staff.editSelfHint')}</p>}
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
          <div>
            <label className="field-label">{t('staff.baseSalary')}</label>
            <input
              type="number"
              step="0.01"
              className="input-field"
              placeholder="0"
              {...register('baseSalary', { min: 0 })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer select-none">
            <input type="checkbox" disabled={isSelf} {...register('isActive')} />
            {t('staff.isActive')}
          </label>
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={onClose} className="btn btn-outline">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Parol tiklangandan keyin yangi login/parolni bir martalik ko'rsatish uchun doimiy panel —
// CompanyCreatePage'dagi administrator kirish ma'lumotlari paneli bilan bir xil uslub.
function ResetPasswordPanel({ result, onClose }) {
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
          <p className="text-amber-800 text-sm font-medium leading-relaxed">{t('staff.resetPasswordWarning')}</p>
        </div>
        <button type="button" onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer shrink-0">
          <X size={18} />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wide">{t('staff.username')}</p>
            <p className="text-slate-900 dark:text-slate-100 font-mono text-base font-semibold truncate">{result.username}</p>
          </div>
          <button
            type="button"
            onClick={() => copy(result.username, t('staff.username'))}
            className="shrink-0 w-9 h-9 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
          >
            <Copy size={16} />
          </button>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wide">{t('auth.password')}</p>
            <p className="text-slate-900 dark:text-slate-100 font-mono text-base font-semibold truncate">{result.newPassword}</p>
          </div>
          <button
            type="button"
            onClick={() => copy(result.newPassword, t('auth.password'))}
            className="shrink-0 w-9 h-9 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
          >
            <Copy size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StaffListPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isOwner } = useTenantAuthContext();
  const [staff, setStaff] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  // Filial profilidagi "Yangi login yaratish" tugmasi shu holatni yuborib, kelgan
  // zahoti xodim yaratish oynasini filial+MANAGER rol oldindan tanlangan holda ochadi.
  // Standart qiymatlar BIR MARTA (mount paytida) o'qib olinadi va alohida state'da
  // saqlanadi (location.state'ni to'g'ridan-to'g'ri JSX'da o'qish EMAS) — aks holda
  // keyinroq oddiy "+ Yangi xodim" tugmasi bosilganda ham shu eski filial/rol
  // qiymatlari sirtqi qayta ishlatilib qolar edi (foydalanuvchi buni sezmasdan).
  const [createOpen, setCreateOpen] = useState(() => Boolean(location.state?.autoCreate));
  const [createDefaults, setCreateDefaults] = useState(() =>
    location.state?.autoCreate ? { branchId: location.state.branchId, role: 'MANAGER' } : null
  );

  // Navigatsiya holatini (location.state) BIR MARTA ishlatilgach darhol tozalaymiz —
  // aks holda orqaga/oldinga tugmasi bilan shu sahifaga qaytilganda autoCreate qayta
  // ishga tushib, tahrirlash/yaratish oynasi kutilmaganda yana ochilib qolishi mumkin edi.
  useEffect(() => {
    if (location.state) {
      navigate(location.pathname, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [editing, setEditing] = useState(null);
  const [resetResult, setResetResult] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  // Filial profilidan ("Xodimlarni ko'rish") kelganda o'sha filial oldindan
  // tanlangan bo'lishi uchun — BranchDetailPage.jsx navigation state orqali yuboradi.
  const [branchFilter, setBranchFilter] = useState(() =>
    location.state?.branchId != null ? String(location.state.branchId) : ''
  );

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
    setCreateOpen(false);
    setCreateDefaults(null);
    reload();
  };

  // Oddiy "+ Yangi xodim" tugmasi HAR DOIM standart (bo'sh) qiymatlar bilan ochilishi
  // kerak — avvalgi autoCreate holatidan qolib ketgan filial/rol bo'lmasligi uchun.
  const openBlankCreateModal = () => {
    setCreateDefaults(null);
    setCreateOpen(true);
  };

  const handleSaved = () => {
    setEditing(null);
    reload();
  };

  const handleDelete = async (member) => {
    if (!window.confirm(t('staff.confirmDelete'))) return;
    try {
      await userService.remove(member.id);
      toast.success(t('staff.deleteSuccess'));
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || t('staff.deleteError'));
    }
  };

  const handleResetPassword = async (member) => {
    if (!window.confirm(t('staff.resetPasswordConfirm'))) return;
    try {
      const res = await userService.resetPassword(member.id);
      setResetResult(res.data);
      toast.success(t('staff.resetPasswordSuccess'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('staff.resetPasswordError'));
    }
  };

  const branchName = (id) => branches.find((b) => b.id === id)?.name || '—';

  const roleBadgeClass = (role) => {
    if (role === 'OWNER') return 'badge badge-amber';
    if (role === 'MANAGER') return 'badge badge-blue';
    return 'badge badge-slate';
  };

  // Qidiruv/rol/filial bo'yicha filtrlash — allaqachon yuklangan `staff` massividan
  // mijoz tomonida, ProductsPage.jsx'dagi kategoriya filtri konventsiyasiga muvofiq
  // (bu yerda esa yangi so'rov yubormasdan, chunki xodimlar ro'yxati odatda kichik).
  const filteredStaff = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    return staff.filter((s) => {
      const matchesQuery = !q || s.fullName?.toLowerCase().includes(q) || s.username?.toLowerCase().includes(q);
      const matchesRole = !roleFilter || s.role === roleFilter;
      const matchesBranch = !branchFilter || String(s.branchId ?? '') === branchFilter;
      return matchesQuery && matchesRole && matchesBranch;
    });
  }, [staff, searchInput, roleFilter, branchFilter]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('staff.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('staff.subtitle')}</p>
        </div>
        {isOwner && (
          <button type="button" onClick={openBlankCreateModal} className="btn btn-primary">
            <Plus size={16} />
            {t('staff.newStaff')}
          </button>
        )}
      </div>

      {!loading && <StaffStatsHeader staff={staff} />}

      <RolesPermissionsCard />

      {resetResult && <ResetPasswordPanel result={resetResult} onClose={() => setResetResult(null)} />}

      {!loading && staff.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              className="input-field !pl-9"
              placeholder={t('staff.searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <select className="input-field max-w-xs" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">{t('staff.filterAll')}</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`staff.roles.${r}`)}
              </option>
            ))}
          </select>
          <select className="input-field max-w-xs" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
            <option value="">{t('staff.filterAll')}</option>
            {branches.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="text-slate-500 dark:text-slate-400 text-sm">{t('common.loading')}</div>
      ) : staff.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <Users size={24} className="text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('staff.empty')}</p>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <Search size={24} className="text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('staff.empty')}</p>
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
                <th>{t('common.status')}</th>
                {isOwner && <th>{t('common.actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((s) => (
                <tr key={s.id ?? s.username}>
                  <td className="font-medium text-slate-900 dark:text-slate-100">{s.fullName}</td>
                  <td className="text-slate-600 dark:text-slate-300">{s.username}</td>
                  <td>
                    <span className={roleBadgeClass(s.role)}>{t(`staff.roles.${s.role}`)}</span>
                  </td>
                  <td className="text-slate-600 dark:text-slate-300">{s.branchName || branchName(s.branchId)}</td>
                  <td>
                    <span className={s.isActive ?? true ? 'badge badge-green' : 'badge badge-slate'}>
                      {(s.isActive ?? true) ? t('staff.active') : t('staff.inactive')}
                    </span>
                  </td>
                  {isOwner && (
                    <td>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setEditing(s)} className="btn-icon" title={t('common.edit')}>
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetPassword(s)}
                          className="btn-icon"
                          title={t('staff.resetPassword')}
                        >
                          <KeyRound size={15} />
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

      {createOpen && (
        <CreateStaffModal
          branches={branches}
          defaultBranchId={createDefaults?.branchId}
          defaultRole={createDefaults?.role}
          onClose={() => {
            setCreateOpen(false);
            setCreateDefaults(null);
          }}
          onCreated={handleCreated}
        />
      )}
      {editing && (
        <EditStaffModal
          staffMember={editing}
          branches={branches}
          isSelf={!!user?.username && user.username === editing.username}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
