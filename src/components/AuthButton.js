import React from 'react';
import { useTranslation } from 'react-i18next';

const AuthButton = ({ user, onLogin, onLogout, loading }) => {
    const { t } = useTranslation();

    if (loading) {
        return (
            <div className="flex items-center justify-center py-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600">{t('loading')}</span>
            </div>
        );
    }

    if (user) {
        return (
            <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                            <p className="font-medium text-green-800">
                                {t('welcome_user', { name: user.name || user.id })}
                            </p>
                            <p className="text-sm text-green-600">
                                {user.email || t('authenticated')}
                            </p>
                        </div>
                    </div>
                </div>
                
                <button
                    onClick={onLogout}
                    className="w-full py-3 px-4 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    aria-label={t('logout_button')}
                >
                    {t('logout_button')}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-center">
                    {t('description')}
                </p>
            </div>
            
            <button
                onClick={onLogin}
                className="w-full py-3 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center space-x-2"
                aria-label={t('login_button')}
            >
                <span>🏢</span>
                <span>{t('login_button')}</span>
            </button>
        </div>
    );
};

export default AuthButton;