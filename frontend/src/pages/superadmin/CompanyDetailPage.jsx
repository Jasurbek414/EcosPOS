import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Building2 } from 'lucide-react';
import { companyService } from '../../services/platformApi';

const STATUS_BADGE = {
  ACTIVE: 'badge badge-green',
  BLOCKED: 'badge badge-slate',
  SUSPENDED_UNPAID: 'badge badge-amber',
};

function Field({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wide">{label}</span>
      <span className="text-slate-900 text-sm font-medium">{value ?? '—'}</span>
    </div>
  );
}

export default function CompanyDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    companyService
      .detail(id)
      .then((res) => {
        if (!cancelled) setCompany(res.data);
      })
      .catch(() => {
        if (cancelled) return;
        setNotFound(true);
        toast.error(t('superadmin.detailLoadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-8">
      <button
        type="button"
        onClick={() => navigate('/spd/companies')}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm font-medium w-fit cursor-pointer"
      >
        <ArrowLeft size={16} />
        {t('superadmin.backToCompanies')}
      </button>

      {loading ? (
        <div className="text-slate-500 text-sm">{t('common.loading')}</div>
      ) : notFound || !company ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
            <Building2 size={24} className="text-slate-400" />
          </div>
          <p className="text-slate-500 text-sm">{t('superadmin.notFound')}</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
              <Building2 size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{company.name}</h1>
              <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{company.slug}</span>
            </div>
          </div>

          <div className="card p-7 grid grid-cols-2 gap-6">
            <Field label={t('superadmin.id')} value={company.id} />
            <Field
              label={t('common.status')}
              value={<span className={STATUS_BADGE[company.status] || 'badge badge-slate'}>{company.status}</span>}
            />
            <Field label={t('superadmin.plan')} value={company.plan} />
            <Field
              label={t('common.createdAt')}
              value={company.createdAt ? new Date(company.createdAt).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
            />
          </div>
        </>
      )}
    </div>
  );
}
