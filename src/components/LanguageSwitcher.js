import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
    const { i18n, t } = useTranslation();

    const languages = [
        { code: 'fr', name: 'Français', short: 'FR', flag: '🇫🇷' },
        { code: 'en', name: 'English', short: 'EN', flag: '🇬🇧' }
    ];

    const activeLanguage = (i18n.resolvedLanguage || i18n.language || 'fr').split('-')[0];

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
        localStorage.setItem('language', lng);
    };

    return (
        <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-base font-medium text-gray-700">{t('language')}</span>
                <span className="text-base text-gray-500">{t('language_hint')}</span>
            </div>
            <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 p-1 shadow-sm">
                {languages.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => changeLanguage(lang.code)}
                        className={`flex min-h-[44px] items-center gap-2 rounded-full px-3 py-1.5 text-base font-semibold transition-all duration-200 sm:px-4 ${
                            activeLanguage === lang.code
                                ? 'bg-blue-600 text-white shadow'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                        aria-pressed={activeLanguage === lang.code}
                        aria-label={`${t('language_switch_to')} ${lang.name}`}
                    >
                        <span>{lang.flag}</span>
                        <span>{lang.short}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default LanguageSwitcher;
