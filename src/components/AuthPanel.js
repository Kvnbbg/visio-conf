import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const AuthPanel = ({
    user,
    loading,
    onLogout,
    onAuthSuccess,
    onFranceTravailLogin,
    demoMode,
    franceTravailEnabled,
    mode,
    onModeChange
}) => {
    const { t } = useTranslation();
    const [formState, setFormState] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [status, setStatus] = useState({ error: '', success: '' });
    const [submitting, setSubmitting] = useState(false);

    const isRegister = mode === 'register';

    const clearStatus = () => {
        setStatus({ error: '', success: '' });
    };

    const updateForm = (field, value) => {
        setFormState((prev) => ({ ...prev, [field]: value }));
        if (status.error || status.success) {
            clearStatus();
        }
    };

    const formReady = useMemo(() => {
        const hasEmail = formState.email.trim();
        const hasPassword = formState.password.trim();
        const hasName = formState.name.trim();
        const hasConfirm = formState.confirmPassword.trim();

        if (isRegister) {
            return hasEmail && hasPassword && hasName && hasConfirm;
        }

        return hasEmail && hasPassword;
    }, [formState, isRegister]);

    const submitAuth = async () => {
        if (!formReady || submitting) {
            return;
        }

        if (isRegister && formState.password !== formState.confirmPassword) {
            setStatus({ error: t('register_password_mismatch'), success: '' });
            return;
        }

        setSubmitting(true);
        clearStatus();

        try {
            const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
            const payload = isRegister
                ? {
                    name: formState.name.trim(),
                    email: formState.email.trim(),
                    password: formState.password
                }
                : {
                    email: formState.email.trim(),
                    password: formState.password
                };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || t('auth_generic_error'));
            }

            onAuthSuccess(data.user);
            setStatus({ error: '', success: isRegister ? t('register_success') : t('login_success') });
        } catch (err) {
            setStatus({ error: err.message, success: '' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-base text-gray-600">{t('loading')}</span>
            </div>
        );
    }

    if (user) {
        return (
            <div className="space-y-4">
                <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                    <div className="flex items-center space-x-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white font-semibold">
                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                            <p className="font-medium text-green-800">
                                {t('welcome_user', { name: user.name || user.id })}
                            </p>
                            <p className="text-base text-green-600">
                                {user.email || t('authenticated')}
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onLogout}
                    className="w-full min-h-[44px] rounded-xl bg-red-500 px-4 py-3 font-medium text-white transition-colors duration-200 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    aria-label={t('logout_button')}
                >
                    {t('logout_button')}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-center text-indigo-800">
                <p className="text-base font-semibold">{t('family_invite_title')}</p>
                <p className="mt-1 text-base text-indigo-700">{t('family_invite_body')}</p>
            </div>

            <div className="flex gap-2 rounded-full bg-gray-100 p-1">
                <button
                    onClick={() => onModeChange('register')}
                    className={`flex-1 min-h-[44px] rounded-full px-4 py-2 text-base font-semibold ${
                        isRegister ? 'bg-white text-indigo-700 shadow' : 'text-gray-500'
                    }`}
                    aria-pressed={isRegister}
                >
                    {t('register_tab')}
                </button>
                <button
                    onClick={() => onModeChange('login')}
                    className={`flex-1 min-h-[44px] rounded-full px-4 py-2 text-base font-semibold ${
                        !isRegister ? 'bg-white text-indigo-700 shadow' : 'text-gray-500'
                    }`}
                    aria-pressed={!isRegister}
                >
                    {t('login_tab')}
                </button>
            </div>

            {status.error && (
                <div
                    className="rounded-xl border border-red-200 bg-red-50 p-3 text-base text-red-700"
                    role="alert"
                    aria-live="assertive"
                >
                    {status.error}
                </div>
            )}

            {status.success && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-base text-green-700">
                    {status.success}
                </div>
            )}

            <div className="space-y-4">
                {isRegister && (
                    <div>
                        <label htmlFor="auth-name" className="block text-base font-medium text-gray-700 mb-2">
                            {t('register_name')}
                        </label>
                        <input
                            id="auth-name"
                            type="text"
                            value={formState.name}
                            onChange={(event) => updateForm('name', event.target.value)}
                            placeholder={t('register_name_placeholder')}
                            className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                )}

                <div>
                    <label htmlFor="auth-email" className="block text-base font-medium text-gray-700 mb-2">
                        {t('auth_email')}
                    </label>
                    <input
                        id="auth-email"
                        type="email"
                        value={formState.email}
                        onChange={(event) => updateForm('email', event.target.value)}
                        placeholder={t('auth_email_placeholder')}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>

                <div>
                    <label htmlFor="auth-password" className="block text-base font-medium text-gray-700 mb-2">
                        {t('auth_password')}
                    </label>
                    <input
                        id="auth-password"
                        type="password"
                        value={formState.password}
                        onChange={(event) => updateForm('password', event.target.value)}
                        placeholder={t('auth_password_placeholder')}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    {isRegister && (
                        <p className="mt-1 text-base text-gray-500">{t('register_password_hint')}</p>
                    )}
                </div>

                {isRegister && (
                    <div>
                        <label htmlFor="auth-password-confirm" className="block text-base font-medium text-gray-700 mb-2">
                            {t('register_confirm_password')}
                        </label>
                        <input
                            id="auth-password-confirm"
                            type="password"
                            value={formState.confirmPassword}
                            onChange={(event) => updateForm('confirmPassword', event.target.value)}
                            placeholder={t('register_confirm_password_placeholder')}
                            className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                )}

                <button
                    onClick={submitAuth}
                    disabled={!formReady || submitting}
                    className={`w-full min-h-[44px] rounded-xl px-4 py-3 font-medium transition-colors duration-200 ${
                        formReady && !submitting
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    {submitting
                        ? t('auth_processing')
                        : isRegister
                            ? t('register_cta')
                            : t('login_cta')}
                </button>
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-3 text-base text-gray-400">
                    <span className="h-px flex-1 bg-gray-200"></span>
                    <span>{t('auth_alt_label')}</span>
                    <span className="h-px flex-1 bg-gray-200"></span>
                </div>

                <button
                    onClick={onFranceTravailLogin}
                    disabled={!franceTravailEnabled}
                    className={`w-full min-h-[44px] rounded-xl px-4 py-3 font-medium transition-colors duration-200 ${
                        franceTravailEnabled
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    {franceTravailEnabled ? t('login_button') : t('login_button_disabled')}
                </button>

                {demoMode && (
                    <button
                        onClick={async () => {
                            setSubmitting(true);
                            clearStatus();
                            try {
                                const response = await fetch('/api/auth/demo-login', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        name: t('demo_user_name'),
                                        email: 'demo@visio-conf.local'
                                    })
                                });
                                const data = await response.json();
                                if (!response.ok) {
                                    throw new Error(data?.error || t('auth_generic_error'));
                                }
                                onAuthSuccess(data.user);
                            } catch (err) {
                                setStatus({ error: err.message, success: '' });
                            } finally {
                                setSubmitting(false);
                            }
                        }}
                        className="w-full min-h-[44px] rounded-xl border border-gray-200 bg-white px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-50"
                    >
                        {t('demo_login_cta')}
                    </button>
                )}
            </div>
        </div>
    );
};

export default AuthPanel;
