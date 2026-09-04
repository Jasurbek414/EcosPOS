import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Building2, CheckCircle2, Ban } from 'lucide-react';
import { companyService } from '../../services/platformApi';
import { STATUS_BADGE } from './constants';

export default function SuperAdminDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    companyService
      .list()
      .then((res) => {
        if (!cancelled) setCompanies(res.data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('superadmin.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const total = companies.length;
  const active = companies.filter((c) => c.status === 'ACTIVE').length;
  const blocked = companies.filter((c) => c.status === 'BLOCKED').length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('superadmin.dashboard')}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('superadmin.dashboardSubtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Building2 size={22} />
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide">{t('superadmin.totalCompanies')}</p>
            <p className="text-slate-900 dark:text-slate-100 text-2xl font-bold mt-0.5">{loading ? '—' : total}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide">{t('superadmin.activeCompanies')}</p>
            <p className="text-slate-900 dark:text-slate-100 text-2xl font-bold mt-0.5">{loading ? '—' : active}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
            <Ban size={22} />
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide">{t('superadmin.blockedCompanies')}</p>
            <p className="text-slate-900 dark:text-slate-100 text-2xl font-bold mt-0.5">{loading ? '—' : blocked}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{t('superadmin.companies')}</h3>
          <button type="button" onClick={() => navigate('/spd/companies')} className="text-amber-600 text-sm font-semibold cursor-pointer">
            →
          </button>
        </div>
        {loading ? (
          <div className="px-6 py-10 flex flex-col items-center gap-3">
            <span className="w-7 h-7 border-[3px] border-slate-200 dark:border-slate-700 border-t-amber-500 rounded-full animate-spin" />
            <p className="text-slate-400 dark:text-slate-500 text-sm">{t('common.loading')}</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="px-6 py-8 text-slate-500 dark:text-slate-400 text-sm">{t('superadmin.empty')}</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {companies.slice(0, 5).map((c) => (
              <div
                key={c.id}
                onClick={() => navigate(`/spd/companies/${c.id}`)}
                className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Building2 size={15} />
                  </div>
                  <span className="text-slate-900 dark:text-slate-100 text-sm font-medium truncate">{c.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={STATUS_BADGE[c.status] || 'badge badge-slate'}>{c.status}</span>
                  <span className="text-slate-500 dark:text-slate-400 text-xs font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">{c.slug}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
