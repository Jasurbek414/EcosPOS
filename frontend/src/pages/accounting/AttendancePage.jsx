import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { CalendarCheck, Users } from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { attendanceService, branchService, userService } from '../../services/api';
import DateInput from '../../components/ui/DateInput';
import AccountingTabs from './AccountingTabs';

const STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'DAY_OFF', 'SICK_LEAVE', 'VACATION'];

const toISODate = (d) => {
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
};

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

// StaffListPage.jsx'dagi roleBadgeClass bilan bir xil naqsh — alohida umumiy
// util fayl yo'q bo'lgani uchun shu yerda takrorlanadi.
function roleBadgeClass(role) {
  if (role === 'OWNER') return 'badge badge-amber';
  if (role === 'MANAGER') return 'badge badge-blue';
  return 'badge badge-slate';
}

// Har bir holat uchun rang (tanlanganda) — PRESENT ijobiy, ABSENT salbiy, qolganlari
// neytral/amber, bir xil ma'no boshqa joylardagi badge ranglariga mos (badge-green/red/amber).
function statusButtonClass(status, active) {
  if (!active) {
    return 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600';
  }
  if (status === 'PRESENT') return 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
  if (status === 'ABSENT') return 'border-red-500 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400';
  return 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
}

// Bitta xodim qatori uchun segmentlangan holat tanlagich — bir xil holatga qayta
// bosilsa tanlov bekor qilinadi (bu xodim bulk so'rovda umuman yuborilmaydi).
function AttendanceStatusPicker({ value, onChange }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(value === s ? null : s)}
          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${statusButtonClass(s, value === s)}`}
        >
          {t(`attendance.statuses.${s}`)}
        </button>
      ))}
    </div>
  );
}

export default function AttendancePage() {
  const { t } = useTranslation();
  const { user, isOwner } = useTenantAuthContext();

  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(isOwner ? '' : (user?.branchId ?? ''));
  const [date, setDate] = useState(() => toISODate(new Date()));

  const [staff, setStaff] = useState([]);
  const [selections, setSelections] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Faqat OWNER uchun: filiallar ro'yxati (tanlash uchun).
  useEffect(() => {
    if (!isOwner) return undefined;
    let cancelled = false;
    branchService
      .list()
      .then((res) => {
        if (!cancelled) setBranches(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOwner]);

  // Tanlangan filial + sana bo'yicha: shu filialning faol xodimlari va o'sha kun
  // uchun allaqachon belgilangan holatlar (bo'lsa) — birga yuklanadi. `branchId` bo'sh
  // bo'lsa hech narsa yuklanmaydi — render qismi `!branchId` holatini alohida tekshirib
  // filial tanlash so'rovini ko'rsatadi, shuning uchun eski `staff`/`selections` qiymati
  // qolib ketishi zararsiz (ko'rsatilmaydi). Diqqat: effekt tanasida sinxron setState
  // chaqirish (masalan `setLoading(true)`) React Compiler'ning set-state-in-effect
  // qoidasini buzadi — shu sabab `loading` faqat .finally()'da `false`ga o'rnatiladi
  // (ProductsPage.jsx/AccountingPage.jsx'dagi filtr effektlari bilan bir xil konvensiya).
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

  // Shu oy uchun tarix — kontekst sifatida, asosiy kunlik belgilashdan alohida.
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

  const reloadHistory = useCallback(async () => {
    if (!branchId) return;
    const ref = new Date(date + 'T00:00:00');
    try {
      const res = await attendanceService.list({ branchId, from: toISODate(startOfMonth(ref)), to: toISODate(endOfMonth(ref)) });
      setHistory(res.data);
    } catch {
      // Tarixni yangilab bo'lmasa jimgina o'tkazib yuboramiz — asosiy saqlash muvaffaqiyatli bo'ldi.
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
      reloadHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || t('attendance.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const dateLabel = (v) => (v ? new Date(v).toLocaleDateString('uz-UZ') : '—');

  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => new Date(b.attendanceDate) - new Date(a.attendanceDate) || a.userFullName?.localeCompare(b.userFullName)),
    [history]
  );

  return (
    <div className="flex flex-col gap-6">
      <AccountingTabs />

      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('attendance.title')}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('attendance.subtitle')}</p>
      </div>

      <div className="card p-4 flex items-center gap-4 flex-wrap">
        <div>
          <label className="field-label">{t('attendance.date')}</label>
          <DateInput value={date} max={toISODate(new Date())} onChange={setDate} />
        </div>
        {isOwner && (
          <div>
            <label className="field-label">{t('attendance.branch')}</label>
            <select className="input-field min-w-[200px]" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">{t('staff.selectBranch')}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!branchId ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <CalendarCheck size={24} className="text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('attendance.selectBranchPrompt')}</p>
        </div>
      ) : loading ? (
        <div className="text-slate-500 dark:text-slate-400 text-sm">{t('common.loading')}</div>
      ) : staff.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <Users size={24} className="text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('attendance.empty')}</p>
        </div>
      ) : (
        <div className="card p-6 flex flex-col gap-4">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('staff.fullName')}</th>
                  <th>{t('staff.role')}</th>
                  <th>{t('attendance.status')}</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id}>
                    <td className="font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">{s.fullName}</td>
                    <td>
                      <span className={roleBadgeClass(s.role)}>{t(`staff.roles.${s.role}`)}</span>
                    </td>
                    <td>
                      <AttendanceStatusPicker value={selections[s.id] || null} onChange={(status) => setStatus(s.id, status)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={handleSave} disabled={saving} className="btn btn-primary">
              {t('common.save')}
            </button>
          </div>
        </div>
      )}

      {branchId && (
        <div className="card p-6">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">{t('attendance.historyTitle')}</h2>
          {historyLoading ? (
            <div className="text-slate-500 dark:text-slate-400 text-sm">{t('common.loading')}</div>
          ) : sortedHistory.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('attendance.empty')}</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t('attendance.date')}</th>
                    <th>{t('staff.fullName')}</th>
                    <th>{t('attendance.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedHistory.map((a) => (
                    <tr key={a.id}>
                      <td className="text-slate-600 dark:text-slate-300 whitespace-nowrap">{dateLabel(a.attendanceDate)}</td>
                      <td className="font-medium text-slate-900 dark:text-slate-100">{a.userFullName}</td>
                      <td>
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
