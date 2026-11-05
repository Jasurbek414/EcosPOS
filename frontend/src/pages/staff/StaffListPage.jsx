import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
  Users, Plus, X, Pencil, Trash2, KeyRound, ShieldAlert, Copy, Search, ShieldCheck, Check, Minus,
  ChevronDown, ChevronUp, Crown, Briefcase, ShoppingBag, LayoutGrid, Table,
} from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { useDefaultBranchId } from '../../hooks/useDefaultBranchId';
import { userService } from '../../services/api';
import StaffStatsHeader from '../../components/ui/StaffStatsHeader';
import TableSkeleton from '../../components/ui/TableSkeleton';

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
    manager: { level: 'partial', note: 'ownBranch' },
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

const ROLE_CONFIGS = [
  {
    role: 'OWNER',
    icon: Crown,
    gradient: 'from-amber-500 to-orange-500',
    lightBg: 'bg-amber-500/10',
    badgeClass: 'badge-amber',
    borderActive: 'border-amber-500 ring-2 ring-amber-500/20',
    accentText: 'text-amber-600 dark:text-amber-400',
    descKey: 'ownerDesc',
    score: 10,
    maxScore: 10,
  },
  {
    role: 'MANAGER',
    icon: Briefcase,
    gradient: 'from-blue-500 to-indigo-600',
    lightBg: 'bg-blue-500/10',
    badgeClass: 'badge-blue',
    borderActive: 'border-blue-500 ring-2 ring-blue-500/20',
    accentText: 'text-blue-600 dark:text-blue-400',
    descKey: 'managerDesc',
    score: 7,
    maxScore: 10,
  },
  {
    role: 'CASHIER',
    icon: ShoppingBag,
    gradient: 'from-emerald-500 to-teal-600',
    lightBg: 'bg-emerald-500/10',
    badgeClass: 'badge-slate',
    borderActive: 'border-emerald-500 ring-2 ring-emerald-500/20',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    descKey: 'cashierDesc',
    score: 3,
    maxScore: 10,
  },
];

const PERMISSION_GROUPS = [
  {
    groupKey: 'sales',
    keys: ['pos'],
  },
  {
    groupKey: 'stock',
    keys: ['stockView', 'stockManage', 'catalogView', 'catalogManage'],
  },
  {
    groupKey: 'reports',
    keys: ['reports'],
  },
  {
    groupKey: 'management',
    keys: ['staffView', 'staffManage', 'companySettings', 'ownProfile'],
  },
];

function PermissionStatusChip({ cell, t }) {
  if (!cell) return <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>;

  const noteText = cell.note ? t(`staff.rolesPermissions.notes.${cell.note}`) : null;

  if (cell.level === 'full') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
        <Check size={12} className="stroke-[2.5]" />
        <span>{noteText || t('staff.rolesPermissions.yes')}</span>
      </span>
    );
  }
  if (cell.level === 'none') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100/80 text-slate-400 dark:bg-slate-800/80 dark:text-slate-500 border border-slate-200/50 dark:border-slate-700/50">
        <X size={12} className="stroke-[2.5]" />
        <span>{t('staff.rolesPermissions.no')}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
      <Minus size={12} className="stroke-[2.5]" />
      <span>{noteText || t('staff.rolesPermissions.partialAccess')}</span>
    </span>
  );
}

function RolesPermissionsCard() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'matrix'
  const [selectedRole, setSelectedRole] = useState('OWNER');

  const selectedConfig = useMemo(
    () => ROLE_CONFIGS.find((c) => c.role === selectedRole) || ROLE_CONFIGS[0],
    [selectedRole]
  );

  return (
    <div className="card overflow-hidden border border-slate-200 dark:border-slate-800 transition-all shadow-sm">
      {/* Kartochka sarlavhasi */}
      <div className="px-5 py-4 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm md:text-base">
                {t('staff.rolesPermissions.title')}
              </h3>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                3 ta rol
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs truncate mt-0.5">
              {t('staff.rolesPermissions.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Ko'rinish rejimi tanlash (Karta / Matritsa) */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <button
              type="button"
              onClick={() => {
                setViewMode('cards');
                setIsOpen(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'cards' && isOpen
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <LayoutGrid size={13} />
              <span className="hidden sm:inline">{t('staff.rolesPermissions.viewCards')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('matrix');
                setIsOpen(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'matrix' && isOpen
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Table size={13} />
              <span className="hidden sm:inline">{t('staff.rolesPermissions.viewMatrix')}</span>
            </button>
          </div>

          {/* Yashirish / Ko'rsatish toggle */}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="btn-icon !w-8 !h-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 cursor-pointer"
            title={isOpen ? t('staff.rolesPermissions.hide') : t('staff.rolesPermissions.show')}
          >
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Kontent qismi */}
      {isOpen && (
        <div className="p-5 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-5">
          {/* 3 ta Rol tezkor kartasi */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {ROLE_CONFIGS.map((c) => {
              const RoleIcon = c.icon;
              const isSelected = viewMode === 'cards' && selectedRole === c.role;
              const percentage = Math.round((c.score / c.maxScore) * 100);

              return (
                <button
                  key={c.role}
                  type="button"
                  onClick={() => {
                    setSelectedRole(c.role);
                    setViewMode('cards');
                  }}
                  className={`text-left p-4 rounded-2xl border transition-all cursor-pointer bg-white dark:bg-slate-800/90 hover:shadow-md ${
                    isSelected
                      ? `${c.borderActive} shadow-sm`
                      : 'border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center text-white shadow-xs`}>
                        <RoleIcon size={17} />
                      </div>
                      <div>
                        <span className={`badge ${c.badgeClass} font-bold text-xs`}>
                          {t(`staff.roles.${c.role}`)}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 font-mono">
                      {c.score}/{c.maxScore}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mb-3">
                    {t(`staff.rolesPermissions.${c.descKey}`)}
                  </p>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${c.gradient} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* VIEW MODE 1: Rollar bo'yicha batafsil */}
          {viewMode === 'cards' && (
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-br ${selectedConfig.gradient}`} />
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {t(`staff.roles.${selectedRole}`)} {t('staff.rolesPermissions.title').toLowerCase()}
                  </h4>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  {selectedConfig.score} ta ruxsat berilgan
                </span>
              </div>

              {/* Guruhlangan huquqlar grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PERMISSION_GROUPS.map((grp) => {
                  const roleKey = selectedRole.toLowerCase();

                  return (
                    <div
                      key={grp.groupKey}
                      className="rounded-xl border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30 p-3.5 flex flex-col gap-2.5"
                    >
                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        {t(`staff.rolesPermissions.groups.${grp.groupKey}`)}
                      </span>

                      <div className="flex flex-col gap-2">
                        {grp.keys.map((permKey) => {
                          const row = PERMISSION_ROWS.find((r) => r.key === permKey);
                          if (!row) return null;
                          const cell = row[roleKey];

                          return (
                            <div
                              key={permKey}
                              className="flex items-center justify-between gap-3 py-1.5 px-2 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/40"
                            >
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                                {t(`staff.rolesPermissions.rows.${permKey}`)}
                              </span>
                              <PermissionStatusChip cell={cell} t={t} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW MODE 2: Taqqoslash matritsasi */}
          {viewMode === 'matrix' && (
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-xs">
              <div className="table-wrap">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-100/70 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {t('staff.rolesPermissions.action')}
                      </th>
                      {ROLE_CONFIGS.map((c) => (
                        <th key={c.role} className="py-3 px-4 text-center">
                          <span className={`badge ${c.badgeClass} font-bold text-xs`}>
                            {t(`staff.roles.${c.role}`)}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {PERMISSION_GROUPS.map((grp) => (
                      <Fragment key={grp.groupKey}>
                        <tr className="bg-slate-50 dark:bg-slate-800/40">
                          <td
                            colSpan={4}
                            className="py-2 px-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider"
                          >
                            {t(`staff.rolesPermissions.groups.${grp.groupKey}`)}
                          </td>
                        </tr>
                        {grp.keys.map((key) => {
                          const row = PERMISSION_ROWS.find((r) => r.key === key);
                          if (!row) return null;

                          return (
                            <tr key={key} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                              <td className="py-2.5 px-4 text-xs font-medium text-slate-800 dark:text-slate-200">
                                {t(`staff.rolesPermissions.rows.${key}`)}
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                <PermissionStatusChip cell={row.owner} t={t} />
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                <PermissionStatusChip cell={row.manager} t={t} />
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                <PermissionStatusChip cell={row.cashier} t={t} />
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Legenda */}
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>{t('staff.rolesPermissions.fullAccess')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>{t('staff.rolesPermissions.partialAccess')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>{t('staff.rolesPermissions.noAccess')}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CreateStaffModal({ defaultBranchId, defaultRole, onClose, onCreated }) {
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
    },
  });

  const onSubmit = async (data) => {
    try {
      await userService.create({ ...data, branchId: defaultBranchId ?? null });
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
function EditStaffModal({ staffMember, isSelf, onClose, onSaved }) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      fullName: staffMember.fullName || '',
      role: staffMember.role || 'CASHIER',
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
        branchId: staffMember.branchId ?? null,
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
  const { branchId: defaultBranchId } = useDefaultBranchId();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaults, setCreateDefaults] = useState(null);

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

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userService.list();
      setStaff(res.data);
    } catch {
      toast.error(t('staff.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    userService
      .list()
      .then((res) => {
        if (!cancelled) setStaff(res.data);
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
      return matchesQuery && matchesRole;
    });
  }, [staff, searchInput, roleFilter]);

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
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={5} cols={5} />
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
          defaultBranchId={defaultBranchId}
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
          isSelf={!!user?.username && user.username === editing.username}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
