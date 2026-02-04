import React from 'react';
import { useTranslation } from 'react-i18next';

const ConsultationIndex = ({ onJoinConsultation }) => {
    const { t } = useTranslation();

    const consultCards = [
        {
            title: t('index_card_career_title'),
            description: t('index_card_career_desc'),
            tag: t('index_card_tag_today')
        },
        {
            title: t('index_card_support_title'),
            description: t('index_card_support_desc'),
            tag: t('index_card_tag_new')
        },
        {
            title: t('index_card_family_title'),
            description: t('index_card_family_desc'),
            tag: t('index_card_tag_private')
        }
    ];

    const checklist = [
        t('index_checklist_profile'),
        t('index_checklist_schedule'),
        t('index_checklist_join')
    ];

    return (
        <section className="space-y-8">
            <div className="rounded-3xl bg-white p-6 shadow">
                <h2 className="text-2xl font-semibold text-gray-800">{t('index_title')}</h2>
                <p className="mt-2 text-base text-gray-600">{t('index_subtitle')}</p>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                    {consultCards.map((card) => (
                        <div key={card.title} className="rounded-2xl border border-gray-200 p-4 shadow-sm">
                            <div className="mb-2 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-base font-semibold text-indigo-700">
                                {card.tag}
                            </div>
                            <h3 className="text-base font-semibold text-gray-800">{card.title}</h3>
                            <p className="mt-2 text-base text-gray-600">{card.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-6">
                <h3 className="text-lg font-semibold text-indigo-800">{t('index_checklist_title')}</h3>
                <ul className="mt-4 space-y-2 text-base text-indigo-700">
                    {checklist.map((item) => (
                        <li key={item} className="flex items-start gap-3">
                            <span className="mt-0.5">✓</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
                <button type="button"
                    onClick={onJoinConsultation}
                    className="mt-6 min-h-[44px] rounded-full bg-indigo-600 px-5 py-2.5 text-base font-semibold text-white hover:bg-indigo-700"
                >
                    {t('index_cta')}
                </button>
            </div>
        </section>
    );
};

export default ConsultationIndex;
