import { useTranslation } from 'react-i18next';
import { Sun, Moon, Check, Palette } from 'lucide-react';
import { useThemeContext } from '../../hooks/useThemeContext';

const ACCENTS = [
  { key: 'blue', hex: '#2563eb' },
  { key: 'emerald', hex: '#059669' },
  { key: 'violet', hex: '#7c3aed' },
  { key: 'rose', hex: '#e11d48' },
  { key: 'amber', hex: '#d97706' },
];

// Sozlamalar (tenant) va Profil (superadmin) sahifalarida bir xil ishlatiladigan
// "Ko'rinish" kartasi — yorug'/qorong'i mavzu va rangli urg'u tanlovi. Saqlash
// tugmasi shart emas: har bir bosishda darhol qo'llanadi (useThemeContext orqali
// localStorage'ga yoziladi va <html> atributlari yangilanadi).
export default function ThemeSettingsCard() {
  const { t } = useTranslation();
  const { theme, accent, setTheme, setAccent } = useThemeContext();

  return (
    <div className="card overflow-hidden">
      <div className="p-6 flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <Palette size={15} className="text-slate-400 dark:text-slate-500" />
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{t('theme.title')}</h3>
        </div>

        <div>
          <span className="field-label">{t('theme.mode')}</span>
          <div className="theme-toggle w-fit">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`theme-toggle-btn ${theme === 'light' ? 'theme-toggle-btn-active' : ''}`}
            >
              <Sun size={15} />
              {t('theme.light')}
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`theme-toggle-btn ${theme === 'dark' ? 'theme-toggle-btn-active' : ''}`}
            >
              <Moon size={15} />
              {t('theme.dark')}
            </button>
          </div>
        </div>

        <div>
          <span className="field-label">{t('theme.accent')}</span>
          <div className="flex items-center gap-3">
            {ACCENTS.map((item) => (
              <button
                key={item.key}
                type="button"
                title={t(`theme.accentNames.${item.key}`)}
                onClick={() => setAccent(item.key)}
                style={{ background: item.hex }}
                className={`accent-swatch ${accent === item.key ? 'accent-swatch-active' : ''}`}
              >
                {accent === item.key && <Check size={14} className="accent-swatch-check" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
