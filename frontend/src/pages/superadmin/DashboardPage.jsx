import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Building2, CheckCircle2 } from 'lucide-react';
import { companyService } from '../../services/platformApi';

export default function SuperAdminDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    companyService
      .list()
      .then((res) => setCompanies(res.data))
      .catch(() => toast.error(t('superadmin.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  const total = companies.length;
  const active = companies.filter((c) => c.status === 'ACTIVE').length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t('superadmin.dashboard')}</h1>
        <p className="text-slate-500 text-sm mt-1">{t('superadmin.dashboardSubtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Building2 size={22} />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{t('superadmin.totalCompanies')}</p>
            <p className="text-slate-900 text-2xl font-bold mt-0.5">{loading ? '—' : total}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Faol</p>
            <p className="text-slate-900 text-2xl font-bold mt-0.5">{loading ? '—' : active}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-900 text-sm">{t('superadmin.companies')}</h3>
          <button type="button" onClick={() => navigate('/spd/companies')} className="text-amber-600 text-sm font-semibold cursor-pointer">
            →
          </button>
        </div>
        {loading ? (
          <div className="px-6 py-8 text-slate-500 text-sm">{t('common.loading')}</div>
        ) : companies.length === 0 ? (
          <div className="px-6 py-8 text-slate-500 text-sm">{t('superadmin.empty')}</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {companies.slice(0, 5).map((c) => (
              <div
                key={c.id}
                onClick={() => navigate(`/spd/companies/${c.id}`)}
                className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 cursor-pointer"
              >
                <span className="text-slate-900 text-sm font-medium">{c.name}</span>
                <span className="text-slate-500 text-xs font-mono bg-slate-100 px-2 py-1 rounded">{c.slug}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
