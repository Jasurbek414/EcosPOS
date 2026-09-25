import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  CheckCircle2,
  Calendar,
  FileSpreadsheet,
  CheckCheck,
  AlertCircle,
} from 'lucide-react';
import { useDefaultBranchId } from '../../hooks/useDefaultBranchId';
import LoadErrorPanel from '../../components/ui/LoadErrorPanel';
import { attendanceService, userService } from '../../services/api';
import DateInput from '../../components/ui/DateInput';
import AccountingTabs from './AccountingTabs';

const STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'DAY_OFF', 'SICK_LEAVE', 'VACATION'];

const toISODate = (d) => {
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
};

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

function roleBadgeClass(role) {
  if (role === 'OWNER') return 'badge badge-amber';
  if (role === 'MANAGER') return 'badge badge-blue';
  return 'badge badge-slate';
}

function statusButtonClass(status, active) {
  if (!active) {
    return 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800';
  }
  if (status === 'PRESENT') return 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 font-bold shadow-2xs';
  if (status === 'ABSENT') return 'border-red-500 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 font-bold shadow-2xs';
  return 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 font-bold shadow-2xs';
}

function AttendanceStatusPicker({ value, onChange }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(value === s ? null : s)}
          className={`px-2.5 py-1 rounded-lg border text-xs transition-colors cursor-pointer ${statusButtonClass(s, value === s)}`}
        >
          {t(`attendance.statuses.${s}`)}
        </button>
      ))}
    </div>
  );
}

export default function AttendancePage() {
  const { t } = useTranslation();
  const { branchId, error: branchError, retry: retryBranch } = useDefaultBranchId();

  const [date, setDate] = useState(() => toISODate(new Date()));

  const [staff, setStaff] = useState([]);
  const [selections, setSelections] = useState({});
  const [savedSelections, setSavedSelections] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    if (!branchId) return undefined;
    let cancelled = false;
    Promise.all([userService.list(), attendanceService.list({ branchId, from: date, to: date })])
      .then(([usersRes, attendanceRes]) => {
        if (cancelled) return;
        const branchStaff = usersRes.data.filter((u) => String(u.branchId ?? '') === String(branchId) && (u.isActive ?? true));
        setStaff(branchStaff);
        const existing = {};
        attendanceRes.data.forEach((a) => {
          existing[a.userId] = a.status;
        });
        setSelections(existing);
        setSavedSelections(existing);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('attendance.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, date, t]);

  useEffect(() => {
    if (!branchId) return undefined;
    let cancelled = false;
    const ref = new Date(date + 'T00:00:00');
    attendanceService
      .list({ branchId, from: toISODate(startOfMonth(ref)), to: toISODate(endOfMonth(ref)) })
      .then((res) => {
        if (!cancelled) setHistory(res.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, date]);

  const isDirty = useMemo(
    () => JSON.stringify(selections) !== JSON.stringify(savedSelections),
    [selections, savedSelections]
  );

  useEffect(() => {
    const handler = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const confirmDiscardIfDirty = () => !isDirty || window.confirm(t('attendance.unsavedChangesConfirm'));

  const handleDateChange = (value) => {
    if (!confirmDiscardIfDirty()) return;
    setDate(value);
  };

  const setStatus = (userId, status) => {
    setSelections((prev) => {
      const next = { ...prev };
      if (status) {
        next[userId] = status;
      } else {
        delete next[userId];
      }
      return next;
    });
  };

  // Bir tugma bilan barcha xodimlarni "Keldi" (PRESENT) qilish
  const handleMarkAllPresent = () => {
    const next = { ...selections };
    staff.forEach((s) => {
      next[s.id] = 'PRESENT';
    });
    setSelections(next);
    toast.success("Barcha xodimlar 'Keldi' deb belgilandi");
  };

  const reloadHistory = useCallback(async () => {
    if (!branchId) return;
    const ref = new Date(date + 'T00:00:00');
    try {
      const res = await attendanceService.list({ branchId, from: toISODate(startOfMonth(ref)), to: toISODate(endOfMonth(ref)) });
      setHistory(res.data);
    } catch {
      // Tarixni yangilab bo'lmasa jimgina o'tkazib yuboramiz
    }
  }, [branchId, date]);

  const handleSave = async () => {
    const entries = Object.entries(selections).map(([userId, status]) => ({ userId: Number(userId), status }));
    if (entries.length === 0) {
      toast.error(t('attendance.noSelection'));
      return;
    }
    setSaving(true);
    try {
      await attendanceService.markBulk({ branchId: Number(branchId), attendanceDate: date, entries });
      toast.success(t('attendance.saveSuccess'));
      setSavedSelections(selections);
      reloadHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || t('attendance.saveError'));
    } finally {
      setSaving(false);
    }
  };

  // Joriy kunlik KPI hisob-kitoblari
  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let other = 0;
    staff.forEach((s) => {
      const st = selections[s.id];
      if (st === 'PRESENT') present++;
      else if (st === 'ABSENT') absent++;
      else if (st) other++;
    });
    const unmarked = staff.length - (present + absent + other);
    return { present, absent, other, unmarked, total: staff.length };
  }, [staff, selections]);

  // Excel (CSV UTF-8 BOM) eksport
  const exportAttendanceToCSV = () => {
    try {
      let csv = '\uFEFF';
      csv += `DAVOMAT JURNALI (${date} oyi bo'yicha)\n`;
      csv += 'Sana;Xodim;Holat\n';
      sortedHistory.forEach((a) => {
        const st = t(`attendance.statuses.${a.status}`) || a.status;
        csv += `"${a.attendanceDate || ''}";"${a.userFullName || ''}";"${st}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Davomat_Tarixi_${date}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Davomat hisoboti Excel fayli yuklab olindi");
    } catch {
      toast.error("Faylni yuklab bo'lmadi");
    }
  };

  const setQuickDate = (offsetDays) => {
    if (!confirmDiscardIfDirty()) return;
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    setDate(toISODate(d));
  };

  const dateLabel = (v) => (v ? new Date(v).toLocaleDateString('uz-UZ') : '—');

  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => new Date(b.attendanceDate) - new Date(a.attendanceDate) || a.userFullName?.localeCompare(b.userFullName)),
    [history]
  );

  return (
    <div className="flex flex-col gap-6">
      <AccountingTabs />

      {/* 1. SARLAVHA VA AMALLAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <UserCheck size={20} />
            </div>
            {t('attendance.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('attendance.subtitle')}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={exportAttendanceToCSV}
            disabled={sortedHistory.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
            title="Oylik davomatni Excel formatida yuklab olish"
          >
            <FileSpreadsheet size={14} />
            <span>Excel yuklab olish</span>
          </button>
        </div>
      </div>

      {/* 2. SANA VA TEZKOR TANLOV */}
      <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">{t('attendance.date')}:</span>
            <DateInput value={date} max={toISODate(new Date())} onChange={handleDateChange} />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setQuickDate(0)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors cursor-pointer"
            >
              Bugun
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(1)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors cursor-pointer"
            >
              Kecha
            </button>
          </div>
        </div>

        {staff.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleMarkAllPresent}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              <CheckCheck size={14} />
              <span>Barchasini keldi deb belgilash</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. EXECUTIVE ATTENDANCE KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Kelganlar */}
        <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Kelgan xodimlar
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <UserCheck size={17} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
              {stats.present} <span className="text-xs font-normal text-slate-400">/ {stats.total}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Bugungi kunda ish joyida</p>
          </div>
        </div>

        {/* Kelmaganlar */}
        <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Kelmaganlar
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
              <UserX size={17} />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-black tabular-nums ${stats.absent > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
              {stats.absent}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Sababsiz kelmaganlar</p>
          </div>
        </div>

        {/* Sababli / Kechikkan */}
        <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Sababli / Kechikkan
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
              <Clock size={17} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
              {stats.other}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Kechikkan, ta'tilda yoki kasal</p>
          </div>
        </div>

        {/* Belgilanmaganlar */}
        <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Belgilanmagan
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 flex items-center justify-center">
              <Users size={17} />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-black tabular-nums ${stats.unmarked > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
              {stats.unmarked}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Holat tanlanishi kutilmoqda</p>
          </div>
        </div>
      </div>

      {branchError ? (
        <LoadErrorPanel onRetry={retryBranch} />
      ) : !branchId || loading ? (
        <div className="text-slate-500 dark:text-slate-400 text-sm py-8 text-center">{t('common.loading')}</div>
      ) : staff.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Users size={24} className="text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('attendance.empty')}</p>
        </div>
      ) : (
        /* 4. KUNLIK DAVOMATNI BELGILASH JADVALI */
        <div className="card p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {date} sanasi uchun davomat jadvali
            </h2>
            <span className="text-xs text-slate-400">
              {staff.length} nafar xodim
            </span>
          </div>

          <div className="table-wrap">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700/60 text-xs text-slate-400 uppercase tracking-wider">
                  <th className="pb-3">{t('staff.fullName')}</th>
                  <th className="pb-3">{t('staff.role')}</th>
                  <th className="pb-3">{t('attendance.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {staff.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {s.fullName}
                    </td>
                    <td className="py-3.5">
                      <span className={roleBadgeClass(s.role)}>{t(`staff.roles.${s.role}`)}</span>
                    </td>
                    <td className="py-3.5">
                      <AttendanceStatusPicker value={selections[s.id] || null} onChange={(status) => setStatus(s.id, status)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              {isDirty ? (
                <span className="inline-flex items-center gap-1.5 text-amber-600 text-xs font-semibold">
                  <AlertCircle size={14} />
                  {t('attendance.unsavedChanges')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-emerald-600 text-xs font-semibold">
                  <CheckCircle2 size={14} />
                  Barcha o'zgarishlar saqlangan
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary cursor-pointer !py-2 !px-5"
            >
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </div>
      )}

      {/* 5. OYLIK DAVOMAT TARIXI */}
      {branchId && (
        <div className="card p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{t('attendance.historyTitle')}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Shu oy bo'yicha filial xodimlarining qayd etilgan davomatlari
              </p>
            </div>
            <span className="text-xs font-medium text-slate-400">
              {sortedHistory.length} ta yozuv
            </span>
          </div>

          {historyLoading ? (
            <div className="text-slate-500 dark:text-slate-400 text-sm py-4">{t('common.loading')}</div>
          ) : sortedHistory.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-sm py-4">{t('attendance.empty')}</p>
          ) : (
            <div className="table-wrap">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700/60 text-xs text-slate-400 uppercase tracking-wider">
                    <th className="pb-3">{t('attendance.date')}</th>
                    <th className="pb-3">{t('staff.fullName')}</th>
                    <th className="pb-3">{t('attendance.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {sortedHistory.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{dateLabel(a.attendanceDate)}</td>
                      <td className="py-3 font-semibold text-slate-900 dark:text-slate-100">{a.userFullName}</td>
                      <td className="py-3">
                        <span className={`badge ${a.status === 'PRESENT' ? 'badge-green' : a.status === 'ABSENT' ? 'badge-red' : 'badge-amber'}`}>
                          {t(`attendance.statuses.${a.status}`)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
