import { createContext, useContext, useCallback, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

const THEME_KEY = 'savdo_theme';
const ACCENT_KEY = 'savdo_accent';

const VALID_THEMES = ['light', 'dark'];
const VALID_ACCENTS = ['blue', 'emerald', 'violet', 'rose', 'amber'];

function readStoredTheme() {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return VALID_THEMES.includes(value) ? value : 'light';
  } catch {
    return 'light';
  }
}

function readStoredAccent() {
  try {
    const value = localStorage.getItem(ACCENT_KEY);
    return VALID_ACCENTS.includes(value) ? value : 'blue';
  } catch {
    return 'blue';
  }
}

// Butun ilova (tenant tomoni HAM, superadmin /spd tomoni HAM) uchun yagona,
// brauzerga bog'liq ko'rinish sozlamasi — rolga qarab emas. `<html>` elementiga
// `data-theme`/`data-accent` atributlarini qo'yamiz, index.css shu atributlarga
// qarab CSS custom property'larni qayta belgilaydi (@custom-variant dark orqali
// Tailwind'ning "dark:" utility'lari ham shu atributga bog'langan).
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme);
  const [accent, setAccentState] = useState(readStoredAccent);

  useEffect(() => {
    const root = document.documentElement;
    // "light" — standart holat, shuning uchun atribut umuman qo'yilmaydi
    // (index.css'dagi :root standart qiymatlar allaqachon yorug' mavzu).
    if (theme === 'dark') {
      root.dataset.theme = 'dark';
    } else {
      delete root.dataset.theme;
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
  }, [accent]);

  const setTheme = useCallback((next) => {
    if (!VALID_THEMES.includes(next)) return;
    setThemeState(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // localStorage yo'q bo'lsa ham ilova ishlashda davom etsin — shunchaki eslab qolinmaydi.
    }
  }, []);

  const setAccent = useCallback((next) => {
    if (!VALID_ACCENTS.includes(next)) return;
    setAccentState(next);
    try {
      localStorage.setItem(ACCENT_KEY, next);
    } catch {
      // localStorage yo'q bo'lsa ham ilova ishlashda davom etsin — shunchaki eslab qolinmaydi.
    }
  }, []);

  const value = { theme, accent, setTheme, setAccent };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Provider komponenti bilan bir faylda: reference (invertizatsiya) loyihasidagi
// konventsiyaga muvofiq (useTenantAuthContext.jsx bilan bir xil naqsh).
// eslint-disable-next-line react-refresh/only-export-components
export const useThemeContext = () => useContext(ThemeContext);
