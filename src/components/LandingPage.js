import React from 'react';
import { useTranslation } from 'react-i18next';

const LandingPage = ({ onGetStarted, onViewIndex }) => {
    const { t } = useTranslation();

    const highlights = [
        { title: t('landing_highlight_secure_title'), description: t('landing_highlight_secure_desc') },
        { title: t('landing_highlight_bilingual_title'), description: t('landing_highlight_bilingual_desc') },
        { title: t('landing_highlight_family_title'), description: t('landing_highlight_family_desc') }
    ];

    const steps = [
        t('landing_step_one'),
        t('landing_step_two'),
        t('landing_step_three')
    ];

    const ctaButtons = [
        {
            label: t('landing_cta_primary'),
            onClick: onGetStarted,
            className: 'bg-white text-indigo-700 hover:bg-indigo-50'
        },
        {
            label: t('landing_cta_secondary'),
            onClick: onViewIndex,
            className: 'border border-white/60 text-white hover:bg-white/10'
        }
    ];

    return (
        <section className="space-y-8">
            <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 p-8 text-white shadow-xl shadow-indigo-900/30">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-4">
                        <p className="text-sm uppercase tracking-[0.2em] text-indigo-100">
                            {t('landing_badge')}
                        </p>
                        <h2 className="text-3xl font-bold sm:text-4xl">{t('landing_title')}</h2>
                        <p className="max-w-2xl text-base text-indigo-100 sm:text-lg">
                            {t('landing_subtitle')}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {ctaButtons.map((button) => (
                            <button
                                key={button.label}
                                onClick={button.onClick}
                                className={`rounded-full px-5 py-2.5 text-sm font-semibold shadow transition ${button.className}`}
                            >
                                {button.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {highlights.map((item) => (
                    <div key={item.title} className="rounded-2xl border border-indigo-100 bg-white/80 p-5 shadow-sm backdrop-blur">
                        <h3 className="text-base font-semibold text-indigo-700">{item.title}</h3>
                        <p className="mt-2 text-sm text-gray-600">{item.description}</p>
                    </div>
                ))}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800">{t('landing_steps_title')}</h3>
                <ul className="mt-4 space-y-3 text-sm text-gray-600">
                    {steps.map((step) => (
                        <li key={step} className="flex items-start gap-3">
                            <span className="mt-0.5 text-indigo-600">●</span>
                            <span>{step}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
};

export default LandingPage;
