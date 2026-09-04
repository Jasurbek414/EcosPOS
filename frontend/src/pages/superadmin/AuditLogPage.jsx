import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { History, X } from 'lucide-react';
import { auditLogService } from '../../services/platformApi';

const ACTION_KEYS = ['COMPANY_CREATED', 'COMPANY_BLOCKED', 'COMPANY_UNBLOCKED', 'ADMIN_PASSWORD_RESET'];

const ACTION_BADGE = {
  COMPANY_CREATED: 'badge badge-green',
  COMPANY_BLOCKED: 'badge badge-amber',
  COMPANY_UNBLOCKED: 'badge badge-blue',
  ADMIN_PASSWORD_RESET: 'badge badge-slate',
};

export default function AuditLogPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const companyId = searchParams.get('companyId') || undefined;
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    auditLogService
      .list(companyId)
      .then((res) => {
        if (!cancelled) setEntries(res.data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('auditLog.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, t]);

  const actionLabel = (action) => (ACTION_KEYS.includes(action) ? t(`auditLog.actions.${action}`) : action);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('auditLog.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('auditLog.subtitle')}</p>
        </div>
        {companyId && (
          <button
            type="button"
            onClick={() => navigate('/spd/audit-log')}
            className="flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer hover:bg-amber-100"
          >
            {t('superadmin.filteredByCompany')}
            <X size={13} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="card py-16 flex flex-col items-center gap-3">
          <span className="w-8 h-8 border-[3px] border-slate-200 dark:border-slate-700 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-slate-400 dark:text-slate-500 text-sm">{t('common.loading')}</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <History size={24} className="text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('auditLog.empty')}</p>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('auditLog.time')}</th>
                <th>{t('auditLog.actor')}</th>
                <th>{t('auditLog.action')}</th>
                <th>{t('auditLog.company')}</th>
                <th>{t('auditLog.details')}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                    {e.createdAt ? new Date(e.createdAt).toLocaleString('uz-UZ') : '—'}
                  </td>
                  <td className="text-slate-600 dark:text-slate-300">{e.actorUsername || '—'}</td>
                  <td>
                    <span className={ACTION_BADGE[e.action] || 'badge badge-slate'}>{actionLabel(e.action)}</span>
                  </td>
                  <td>
                    {e.companySlug ? (
                      <Link
                        to={`/spd/companies/${e.companyId}`}
                        className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                      >
                        {e.companySlug}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="text-slate-600 dark:text-slate-300 text-sm max-w-xs truncate" title={e.details}>
                    {e.details || '—'}
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
