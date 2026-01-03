import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './components/LanguageSwitcher';
import AuthPanel from './components/AuthPanel';
import LandingPage from './components/LandingPage';
import ConsultationIndex from './components/ConsultationIndex';
import PageTabs from './components/PageTabs';
import VideoConference from './components/VideoConference';
import HealthCheck from './components/HealthCheck';
import ReadinessPanel from './components/ReadinessPanel';
import './i18n'; // Initialize i18n

const App = () => {
    const { t } = useTranslation();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [meetingId, setMeetingId] = useState('');
    const [userId, setUserId] = useState('');
    const [showVideoConference, setShowVideoConference] = useState(false);
    const [restoredPreferences, setRestoredPreferences] = useState(false);
    const [clientConfig, setClientConfig] = useState({
        demoMode: false,
        franceTravailEnabled: false
    });
    const [activePage, setActivePage] = useState('landing');
    const [authMode, setAuthMode] = useState('register');

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
                    demoMode: Boolean(data.demoMode),
                    franceTravailEnabled: Boolean(data.franceTravailEnabled)
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
                localStorage.removeItem('lastMeetingId');
                localStorage.removeItem('lastUserId');
                setRestoredPreferences(false);
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

    const handleAuthSuccess = (authUser) => {
        setUser(authUser);
        setUserId(authUser.id || authUser.name || 'user');
        setError('');
    };

    const refreshToken = async () => {
        try {
            const response = await fetch('/api/auth/refresh', { method: 'POST' });
            let data = null;

            try {
                data = await response.json();
            } catch (parseError) {
                data = null;
            }

            if (response.ok && data?.success) {
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

    const handleGetStarted = () => {
        setActivePage('conference');
        setAuthMode('register');
    };

    const handleViewIndex = () => {
        setActivePage('index');
    };

    const handleJoinConsultation = () => {
        setActivePage('conference');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <header className="mb-8 space-y-4">
                    <div className="flex flex-col items-center gap-4 text-center">
                        <h1 className="text-4xl font-bold text-white mb-2">
                            {t('welcome')}
                        </h1>
                        <div className="flex flex-wrap items-center justify-center gap-4">
                            <HealthCheck />
                            <LanguageSwitcher />
                        </div>
                    </div>
                    <div className="flex justify-center">
                        <PageTabs activePage={activePage} onChange={setActivePage} />
                    </div>
                </header>

                {activePage === 'landing' && (
                    <ReadinessPanel
                        isMeetingIdValid={isMeetingIdValid}
                        isUserIdValid={isUserIdValid}
                        restoredPreferences={restoredPreferences}
                    />
                )}

                {/* Main Content */}
                <div className="mx-auto max-w-4xl">
                    <div className="rounded-3xl bg-white p-8 shadow-2xl">
                        {/* Error Display */}
                        {error && (
                            <div
                                className="mb-6 rounded-lg border border-red-400 bg-red-100 p-4 text-red-700"
                                role="alert"
                                aria-live="assertive"
                            >
                                <div className="flex items-center">
                                    <span className="mr-2">⚠️</span>
                                    {error}
                                </div>
                            </div>
                        )}

                        {restoredPreferences && !showVideoConference && activePage === 'conference' && (
                            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800">
                                {t('restored_preferences')}
                            </div>
                        )}

                        {activePage === 'landing' && (
                            <LandingPage onGetStarted={handleGetStarted} onViewIndex={handleViewIndex} />
                        )}

                        {activePage === 'index' && (
                            <ConsultationIndex onJoinConsultation={handleJoinConsultation} />
                        )}

                        {activePage === 'conference' && (
                            <div className="space-y-8">
                                <AuthPanel
                                    user={user}
                                    loading={loading}
                                    onLogout={handleLogout}
                                    onAuthSuccess={handleAuthSuccess}
                                    onFranceTravailLogin={handleLogin}
                                    demoMode={clientConfig.demoMode}
                                    franceTravailEnabled={clientConfig.franceTravailEnabled}
                                    mode={authMode}
                                    onModeChange={setAuthMode}
                                />

                                {/* Meeting Controls - Only show when authenticated */}
                                {user && !showVideoConference && (
                                    <div className="space-y-4">
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
                                    />
                                )}
                            </div>
                        )}

                        {/* Footer */}
                        <footer className="mt-10 border-t pt-6 text-center text-sm text-gray-500">
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
