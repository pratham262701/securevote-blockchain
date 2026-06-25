import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from './locales/en.json';
import translationTA from './locales/ta.json';

const resources = {
  en: {
    translation: translationEN
  },
  ta: {
    translation: translationTA
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    lng: localStorage.getItem('language') || 'en',
    debug: false,
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
