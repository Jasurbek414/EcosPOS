import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Building2, Plus } from 'lucide-react';
import { companyService } from '../../services/platformApi';

const STATUS_BADGE = {
  ACTIVE: 'badge badge-green',
  BLOCKED: 'badge badge-slate',
  SUSPENDED_UNPAID: 'badge badge-amber',
};

export default function CompanyListPage() {
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('superadmin.companies')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('superadmin.companiesSubtitle')}</p>
        </div>
        <button type="button" onClick={() => navigate('/spd/companies/new')} className="btn" style={{ background: '#d97706', color: '#fff' }}>
          <Plus size={16} />
          {t('superadmin.newCompany')}
        </button>
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm">{t('common.loading')}</div>
      ) : companies.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
            <Building2 size={24} className="text-slate-400" />
          </div>
          <p className="text-slate-500 text-sm">{t('superadmin.empty')}</p>
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
              {companies.map((c) => (
                <tr key={c.id} onClick={() => navigate(`/spd/companies/${c.id}`)} className="cursor-pointer">
                  <td className="font-medium text-slate-900">{c.name}</td>
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
