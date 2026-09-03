import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import uz from './locales/uz.json';
import ru from './locales/ru.json';

const LANG_STORAGE_KEY = 'savdo_lang';
const savedLang = localStorage.getItem(LANG_STORAGE_KEY) || 'uz';

i18n.use(initReactI18next).init({
  resources: {
    uz: { translation: uz },
    ru: { translation: ru },
  },
  lng: savedLang,
  fallbackLng: 'uz',
  interpolation: { escapeValue: false },
});

export const changeLanguage = (lang) => {
  i18n.changeLanguage(lang);
  localStorage.setItem(LANG_STORAGE_KEY, lang);
};

export default i18n;
