import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import en from '../public/locales/en/translation.json';
import fr from '../public/locales/fr/translation.json';
import es from '../public/locales/es/translation.json';
import zh from '../public/locales/zh/translation.json';

const resources = {
    en: { translation: en },
    fr: { translation: fr },
    es: { translation: es },
    zh: { translation: zh }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'fr', // Default to French as it's France Travail
        debug: process.env.NODE_ENV === 'development',
        
        detection: {
            order: ['localStorage', 'navigator', 'htmlTag'],
            caches: ['localStorage'],
        },
        
        interpolation: {
            escapeValue: false, // React already escapes values
        },
        
        react: {
            useSuspense: false,
        }
    });

export default i18n;