import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const PageTabs = ({ activePage, onChange }) => {
    const { t } = useTranslation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    const tabs = [
        { id: 'landing', label: t('nav_landing'), description: t('nav_landing_desc') },
        { id: 'index', label: t('nav_index'), description: t('nav_index_desc') },
        { id: 'conference', label: t('nav_conference'), description: t('nav_conference_desc') }
    ];

    const activeTab = tabs.find((tab) => tab.id === activePage) || tabs[0];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!menuRef.current || menuRef.current.contains(event.target)) {
                return;
            }
            setIsMenuOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleTabChange = (tabId) => {
        onChange(tabId);
        setIsMenuOpen(false);
    };

    return (
        <div ref={menuRef} className="relative w-full max-w-3xl">
            <button
                type="button"
                onClick={() => setIsMenuOpen((open) => !open)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white/90 px-4 py-3 text-base font-semibold text-gray-800 shadow-lg backdrop-blur sm:hidden min-h-[44px]"
                aria-expanded={isMenuOpen}
                aria-controls="page-tabs-menu"
            >
                <span className="text-left">
                    {activeTab.label}
                    <span className="mt-1 block text-base font-normal text-gray-500">
                        {activeTab.description}
                    </span>
                </span>
                <span aria-hidden="true" className="text-xl">☰</span>
            </button>

            {isMenuOpen && (
                <div
                    className="fixed inset-0 z-30 bg-slate-900/40 sm:hidden"
                    onClick={() => setIsMenuOpen(false)}
                    aria-hidden="true"
                />
            )}

            <div
                id="page-tabs-menu"
                className={`z-40 mt-3 flex flex-col gap-3 rounded-2xl bg-white/90 p-3 shadow-lg backdrop-blur sm:static sm:mt-0 sm:flex sm:flex-row sm:flex-wrap ${
                    isMenuOpen ? 'absolute left-0 right-0 top-full sm:relative' : 'hidden sm:flex'
                }`}
            >
                {tabs.map((tab) => (
                    <button type="button"
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`flex flex-1 flex-col rounded-xl px-4 py-3 text-left text-base transition-all duration-200 min-h-[44px] sm:min-w-[180px] ${
                            activePage === tab.id
                                ? 'bg-indigo-600 text-white shadow ring-2 ring-indigo-200'
                                : 'bg-white text-gray-700 hover:bg-indigo-50'
                        }`}
                        aria-pressed={activePage === tab.id}
                        aria-current={activePage === tab.id ? 'page' : undefined}
                    >
                        <span className="font-semibold">{tab.label}</span>
                        <span className={`text-base ${activePage === tab.id ? 'text-indigo-100' : 'text-gray-500'}`}>
                            {tab.description}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default PageTabs;
