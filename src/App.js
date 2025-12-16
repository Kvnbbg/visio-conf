import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './components/LanguageSwitcher';
import AuthButton from './components/AuthButton';
import VideoConference from './components/VideoConference';
import HealthCheck from './components/HealthCheck';
import './i18n'; // Initialize i18n

const DEFAULT_ZEGO_CONFIG = {
    appId: 234470600,
    serverSecret: 'db9a379cd5f3c8a4268f61a00cdd8600',
    allowClientFallback: true,
    defaultMode: 'fallback',
    options: {
        turnOnMicrophoneWhenJoining: true,
        turnOnCameraWhenJoining: true,
        showMyCameraToggleButton: true,
        showMyMicrophoneToggleButton: true,
        showAudioVideoSettingsButton: true,
        showScreenSharingButton: true,
        showTextChat: true,
        showUserList: true,
        maxUsers: 50,
        layout: 'Auto',
        showLayoutButton: true,
        scenario: {
            mode: 'VideoConference',
            config: {
                role: 'Host'
            }
        }
    }
};

const App = () => {
    const { t } = useTranslation();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [meetingId, setMeetingId] = useState('');
    const [userId, setUserId] = useState('');
    const [showVideoConference, setShowVideoConference] = useState(false);
    const [restoredPreferences, setRestoredPreferences] = useState(false);
    const [clientConfig, setClientConfig] = useState({ zego: DEFAULT_ZEGO_CONFIG });

    useEffect(() => {
        checkAuthStatus();
    }, []);

    useEffect(() => {
        const savedMeetingId = localStorage.getItem('lastMeetingId');
        const savedUserId = localStorage.getItem('lastUserId');

        if (savedMeetingId) {
            setMeetingId(savedMeetingId);
        }
        if (savedUserId) {
            setUserId(savedUserId);
        }

        if (savedMeetingId || savedUserId) {
            setRestoredPreferences(true);
        }
    }, []);

    useEffect(() => {
        const fetchClientConfig = async () => {
            try {
                const response = await fetch('/api/config/client');
                if (!response.ok) {
                    throw new Error('Failed to fetch client config');
                }
                const data = await response.json();
                setClientConfig((previous) => ({
                    ...previous,
                    ...data,
                    zego: {
                        ...previous.zego,
                        ...(data.zego || {}),
                        options: {
                            ...previous.zego.options,
                            ...(data.zego?.options || {})
                        }
                    }
                }));
            } catch (configError) {
                console.warn('Unable to load client config, falling back to defaults', configError);
            }
        };

        fetchClientConfig();
    }, []);

    const checkAuthStatus = async () => {
        try {
            const response = await fetch('/api/auth/status');
            const data = await response.json();
            
            if (data.authenticated) {
                setUser(data.user);
                setUserId(data.user.id || data.user.name || 'user');
            }
        } catch (err) {
            console.error('Error checking auth status:', err);
            setError(t('error_status'));
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = () => {
        window.location.href = '/auth/francetravail/login';
    };

    const handleLogout = async () => {
        try {
            const response = await fetch('/api/auth/logout', { method: 'POST' });
            
            if (response.ok) {
                setUser(null);
                setShowVideoConference(false);
                setMeetingId('');
                setUserId('');
                setError('');
            } else {
                throw new Error('Logout failed');
            }
        } catch (err) {
            console.error('Error during logout:', err);
            setError(t('error_logout'));
        }
    };

    const handleJoinMeeting = () => {
        const sanitizedMeetingId = meetingId.trim();
        const sanitizedUserId = userId.trim();
        const meetingIdValid = /^[\w-]{3,50}$/.test(sanitizedMeetingId);
        const userIdValid = /^[\w-]{2,50}$/.test(sanitizedUserId);

        if (!meetingIdValid) {
            setError(t('invalid_meeting_id_strict'));
            return;
        }

        if (!userIdValid) {
            setError(t('invalid_user_id_strict'));
            return;
        }

        localStorage.setItem('lastMeetingId', sanitizedMeetingId);
        localStorage.setItem('lastUserId', sanitizedUserId);
        setError('');
        setShowVideoConference(true);
    };

    const handleLeaveMeeting = () => {
        setShowVideoConference(false);
    };

    const refreshToken = async () => {
        try {
            const response = await fetch('/api/auth/refresh');
            const data = await response.json();
            
            if (data.success) {
                // Token refreshed successfully
                console.log('Token refreshed');
            } else {
                // Refresh failed, redirect to login
                setUser(null);
                setError(t('session_expired'));
            }
        } catch (err) {
            console.error('Error refreshing token:', err);
            setUser(null);
            setError(t('session_expired'));
        }
    };

    // Auto-refresh token on 401 errors
    useEffect(() => {
        const handleUnauthorized = (event) => {
            if (event.detail?.status === 401 && user) {
                refreshToken();
            }
        };

        window.addEventListener('unauthorized', handleUnauthorized);
        return () => window.removeEventListener('unauthorized', handleUnauthorized);
    }, [user]);

    const isMeetingIdValid = /^[\w-]{3,50}$/.test(meetingId.trim());
    const isUserIdValid = /^[\w-]{2,50}$/.test(userId.trim());
    const isJoinDisabled = !isMeetingIdValid || !userId || !isUserIdValid;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">
                        {t('welcome')}
                    </h1>
                    <div className="flex justify-center mb-4">
                        <HealthCheck />
                    </div>
                </header>

                {/* Main Content */}
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white rounded-xl shadow-2xl p-8">
                        {/* Language Switcher */}
                        <LanguageSwitcher />

                        {/* Error Display */}
                        {error && (
                            <div
                                className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg"
                                role="alert"
                                aria-live="assertive"
                            >
                                <div className="flex items-center">
                                    <span className="mr-2">⚠️</span>
                                    {error}
                                </div>
                            </div>
                        )}

                        {restoredPreferences && !showVideoConference && (
                            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg">
                                {t('restored_preferences')}
                            </div>
                        )}

                        {/* Authentication Section */}
                        <AuthButton
                            user={user}
                            onLogin={handleLogin}
                            onLogout={handleLogout}
                            loading={loading}
                        />

                        {/* Meeting Controls - Only show when authenticated */}
                        {user && !showVideoConference && (
                            <div className="mt-8 space-y-4">
                                <div className="border-t pt-6">
                                    <h2 className="text-xl font-semibold mb-4 text-gray-800">
                                        {t('join_meeting')}
                                    </h2>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="meetingId" className="block text-sm font-medium text-gray-700 mb-2">
                                                {t('meeting_id')}
                                            </label>
                                            <input
                                                id="meetingId"
                                                type="text"
                                                value={meetingId}
                                                onChange={(e) => {
                                                    setMeetingId(e.target.value);
                                                    if (error) setError('');
                                                }}
                                                placeholder={t('meeting_id_placeholder')}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                aria-describedby="meetingId-help"
                                                aria-invalid={!isMeetingIdValid}
                                            />
                                            <p id="meetingId-help" className="mt-1 text-sm text-gray-500">
                                                {t('meeting_instructions')}
                                                <br />
                                                <span className={isMeetingIdValid ? 'text-green-600' : 'text-red-600'}>
                                                    {t('meeting_id_rules')}
                                                </span>
                                            </p>
                                        </div>

                                        <div>
                                            <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-2">
                                                {t('user_id')}
                                            </label>
                                            <input
                                                id="userId"
                                                type="text"
                                                value={userId}
                                                onChange={(e) => {
                                                    setUserId(e.target.value);
                                                    if (error) setError('');
                                                }}
                                                placeholder={t('user_id_placeholder')}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                aria-invalid={!isUserIdValid}
                                            />
                                            <p className="mt-1 text-sm text-gray-500">
                                                <span className={isUserIdValid ? 'text-green-600' : 'text-red-600'}>
                                                    {t('user_id_rules')}
                                                </span>
                                            </p>
                                        </div>

                                        <button
                                            onClick={handleJoinMeeting}
                                            disabled={isJoinDisabled}
                                            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors duration-200 ${
                                                !isJoinDisabled
                                                    ? 'bg-green-500 text-white hover:bg-green-600 focus:ring-2 focus:ring-green-500'
                                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            }`}
                                            aria-label={t('join_meeting')}
                                        >
                                            {t('join_meeting')}
                                        </button>
                                        <p className="text-xs text-gray-500 text-center">
                                            {isJoinDisabled ? t('join_requirements_unmet') : t('join_ready')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Video Conference Component */}
                        {user && showVideoConference && (
                            <VideoConference
                                meetingId={meetingId}
                                user={{ ...user, id: userId }}
                                onLeave={handleLeaveMeeting}
                                fallbackZegoConfig={clientConfig.zego}
                            />
                        )}

                        {/* Footer */}
                        <footer className="mt-8 pt-6 border-t text-center text-sm text-gray-500">
                            <div className="space-x-4 mb-4">
                                <a href="/terms" className="hover:text-blue-500 transition-colors">
                                    {t('terms')}
                                </a>
                                <span>|</span>
                                <a href="/privacy" className="hover:text-blue-500 transition-colors">
                                    {t('privacy')}
                                </a>
                                <span>|</span>
                                <a href="/about" className="hover:text-blue-500 transition-colors">
                                    {t('about')}
                                </a>
                            </div>
                            <p>{t('powered_by')}</p>
                            <p className="mt-1">{t('version')}</p>
                        </footer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;