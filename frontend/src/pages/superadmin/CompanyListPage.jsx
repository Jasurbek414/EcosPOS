import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Building2, Plus, Search } from 'lucide-react';
import { companyService } from '../../services/platformApi';
import { STATUS_BADGE } from './constants';

export default function CompanyListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

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

  // Ro'yxat backenddan to'liq yuklab olinadi — qo'shimcha so'rovga hojat yo'q,
  // qidiruv shu yerda, mijoz tomonida, filtrlanadi.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => [c.name, c.slug, c.status, c.plan].some((v) => (v || '').toLowerCase().includes(q)));
  }, [companies, query]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('superadmin.companies')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('superadmin.companiesSubtitle')}</p>
        </div>
        <button type="button" onClick={() => navigate('/spd/companies/new')} className="btn" style={{ background: '#d97706', color: '#fff' }}>
          <Plus size={16} />
          {t('superadmin.newCompany')}
        </button>
      </div>

      {!loading && companies.length > 0 && (
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input-field !pl-9"
            placeholder={t('superadmin.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {loading ? (
        <div className="card py-16 flex flex-col items-center gap-3">
          <span className="w-8 h-8 border-[3px] border-slate-200 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">{t('common.loading')}</p>
        </div>
      ) : companies.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
            <Building2 size={24} className="text-slate-400" />
          </div>
          <p className="text-slate-500 text-sm">{t('superadmin.empty')}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
            <Search size={22} className="text-slate-400" />
          </div>
          <p className="text-slate-500 text-sm">{t('superadmin.noSearchResults')}</p>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('superadmin.name')}</th>
                <th>{t('superadmin.slug')}</th>
                <th>{t('common.status')}</th>
                <th>{t('superadmin.plan')}</th>
                <th>{t('common.createdAt')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} onClick={() => navigate(`/spd/companies/${c.id}`)} className="cursor-pointer">
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Building2 size={15} />
                      </div>
                      <span className="font-medium text-slate-900">{c.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{c.slug}</span>
                  </td>
                  <td>
                    <span className={STATUS_BADGE[c.status] || 'badge badge-slate'}>{c.status}</span>
                  </td>
                  <td className="text-slate-600">{c.plan || '—'}</td>
                  <td className="text-slate-500 text-xs">
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
