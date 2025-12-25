import React from 'react';
import { useTranslation } from 'react-i18next';

const PageTabs = ({ activePage, onChange }) => {
    const { t } = useTranslation();

    const tabs = [
        { id: 'landing', label: t('nav_landing'), description: t('nav_landing_desc') },
        { id: 'index', label: t('nav_index'), description: t('nav_index_desc') },
        { id: 'conference', label: t('nav_conference'), description: t('nav_conference_desc') }
    ];

    return (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/80 p-2 shadow-lg backdrop-blur">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={`flex flex-col rounded-xl px-4 py-2 text-left transition-all duration-200 sm:min-w-[180px] ${
                        activePage === tab.id
                            ? 'bg-indigo-600 text-white shadow'
                            : 'bg-white text-gray-700 hover:bg-indigo-50'
                    }`}
                    aria-pressed={activePage === tab.id}
                >
                    <span className="text-sm font-semibold">{tab.label}</span>
                    <span className={`text-xs ${activePage === tab.id ? 'text-indigo-100' : 'text-gray-500'}`}>
                        {tab.description}
                    </span>
                </button>
            ))}
        </div>
    );
};

export default PageTabs;
