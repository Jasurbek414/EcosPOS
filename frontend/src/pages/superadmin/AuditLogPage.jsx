import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { History } from 'lucide-react';
import { auditLogService } from '../../services/platformApi';

const ACTION_KEYS = ['COMPANY_CREATED', 'COMPANY_BLOCKED', 'COMPANY_UNBLOCKED', 'ADMIN_PASSWORD_RESET'];

export default function AuditLogPage() {
  const { t } = useTranslation();
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
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t('auditLog.title')}</h1>
        <p className="text-slate-500 text-sm mt-1">{t('auditLog.subtitle')}</p>
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm">{t('common.loading')}</div>
      ) : entries.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
            <History size={24} className="text-slate-400" />
          </div>
          <p className="text-slate-500 text-sm">{t('auditLog.empty')}</p>
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
                  <td className="text-slate-500 text-xs whitespace-nowrap">
                    {e.createdAt ? new Date(e.createdAt).toLocaleString('uz-UZ') : '—'}
                  </td>
                  <td className="text-slate-600">{e.actorUsername || '—'}</td>
                  <td>
                    <span className="badge badge-slate">{actionLabel(e.action)}</span>
                  </td>
                  <td>
                    {e.companySlug ? (
                      <Link
                        to={`/spd/companies/${e.companyId}`}
                        className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 hover:text-slate-900"
                      >
                        {e.companySlug}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="text-slate-600 text-sm max-w-xs truncate" title={e.details}>
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
