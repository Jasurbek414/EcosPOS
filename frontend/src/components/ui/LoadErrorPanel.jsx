import { useTranslation } from 'react-i18next';
import { AlertTriangle, RotateCw } from 'lucide-react';

/**
 * Ma'lumot yuklanmaganda cheksiz spinner o'rniga ko'rsatiladigan panel.
 * Avval xatolar jimgina yutilar va sahifa abadiy "Yuklanmoqda..." holatida
 * qotib qolardi — foydalanuvchida na sabab, na chiqish yo'li bor edi.
 */
export default function LoadErrorPanel({ onRetry }) {
  const { t } = useTranslation();
  return (
    <div className="card py-16 flex flex-col items-center gap-3 text-center">
      <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
        <AlertTriangle size={24} className="text-red-600 dark:text-red-400" />
      </div>
      <p className="text-slate-600 dark:text-slate-300 text-sm max-w-sm">{t('common.loadFailed')}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-outline">
          <RotateCw size={15} />
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}
