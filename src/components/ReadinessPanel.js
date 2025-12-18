import React from 'react';
import { useTranslation } from 'react-i18next';

const ReadinessPanel = ({ isMeetingIdValid, isUserIdValid, restoredPreferences }) => {
    const { t } = useTranslation();

    const readinessCards = [
        {
            id: 'ux',
            title: t('readiness_ux_title'),
            badge: t('readiness_now'),
            tone: 'blue',
            description: t('readiness_ux_description'),
            metrics: [
                { label: t('readiness_fast_join'), complete: restoredPreferences },
                { label: t('readiness_valid_inputs'), complete: isMeetingIdValid && isUserIdValid },
                { label: t('readiness_accessibility'), complete: true },
            ],
            cta: {
                label: t('readiness_cta_preview'),
                href: '#',
            }
        },
        {
            id: 'security',
            title: t('readiness_security_title'),
            badge: t('readiness_in_progress'),
            tone: 'emerald',
            description: t('readiness_security_description'),
            metrics: [
                { label: t('readiness_surface_locked'), complete: true },
                { label: t('readiness_health_signal'), complete: true },
                { label: t('readiness_attack_plan'), complete: false },
            ],
            cta: {
                label: t('readiness_cta_pentest'),
                href: 'mailto:security@visio-conf.example?subject=Pentest%20coordination',
            }
        },
        {
            id: 'commercial',
            title: t('readiness_commercial_title'),
            badge: t('readiness_next'),
            tone: 'purple',
            description: t('readiness_commercial_description'),
            metrics: [
                { label: t('readiness_localized_assets'), complete: true },
                { label: t('readiness_billing_ready'), complete: false },
                { label: t('readiness_conversion_path'), complete: false },
            ],
            cta: {
                label: t('readiness_cta_sales'),
                href: 'mailto:partnerships@visio-conf.example?subject=Commercial%20launch%20planning',
            }
        }
    ];

    return (
        <section className="mb-8 bg-slate-900 text-white rounded-xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <p className="text-sm uppercase tracking-wide text-slate-400">{t('readiness_label')}</p>
                    <h2 className="text-2xl font-bold">{t('readiness_title')}</h2>
                </div>
                <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-200">
                    {t('readiness_live_status')}
                </span>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {readinessCards.map((card) => {
                    const completedCount = card.metrics.filter((metric) => metric.complete).length;
                    const progress = Math.round((completedCount / card.metrics.length) * 100);

                    return (
                        <div
                            key={card.id}
                            className="bg-white text-slate-900 rounded-lg p-4 flex flex-col shadow-lg border border-slate-100"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-slate-500">{card.title}</p>
                                    <h3 className="text-lg font-semibold text-slate-900">{card.description}</h3>
                                </div>
                                <span
                                    className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-${card.tone}-50 text-${card.tone}-700 border border-${card.tone}-100`}
                                >
                                    {card.badge}
                                </span>
                            </div>

                            <div className="flex items-center space-x-2 mb-3" aria-label={`${card.title} ${progress}%`}>
                                <div className="flex-1 h-2 rounded-full bg-slate-100">
                                    <div
                                        className={`h-2 rounded-full bg-${card.tone}-500 transition-all`}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <span className="text-xs font-medium text-slate-600">{progress}%</span>
                            </div>

                            <ul className="space-y-2 text-sm text-slate-700 mb-4">
                                {card.metrics.map((metric) => (
                                    <li key={metric.label} className="flex items-center space-x-2">
                                        <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                                            metric.complete
                                                ? 'bg-green-50 text-green-600 border-green-200'
                                                : 'bg-slate-50 text-slate-400 border-slate-200'
                                        }`}>
                                            {metric.complete ? '✓' : '•'}
                                        </span>
                                        <span>{metric.label}</span>
                                    </li>
                                ))}
                            </ul>

                            <a
                                href={card.cta.href}
                                className={`mt-auto inline-flex items-center justify-center px-3 py-2 text-sm font-semibold rounded-md bg-${card.tone}-600 text-white hover:bg-${card.tone}-700 transition-colors`}
                            >
                                {card.cta.label}
                            </a>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

export default ReadinessPanel;
