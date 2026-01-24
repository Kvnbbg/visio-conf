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
import './i18n';

const MEETING_ID_PATTERN = /^[\w-]{3,50}$/;
const USER_ID_PATTERN = /^[\w-]{2,50}$/;
const STORAGE_KEYS = {
    meetingId: 'lastMeetingId',
    userId: 'lastUserId'
};
const PAGES = {
    landing: 'landing',
    index: 'index',
    conference: 'conference'
};
const ENDPOINTS = {
    authStatus: '/api/auth/status',
    authLogout: '/api/auth/logout',
    authRefresh: '/api/auth/refresh',
    clientConfig: '/api/config/client'
};
const DEFAULT_USER_ID = 'user';
const logger = {
    error: (message, error) => {
        if (process.env.NODE_ENV !== 'production') {
            console.error(message, error);
        }
    },
    warn: (message, error) => {
        if (process.env.NODE_ENV !== 'production') {
            console.warn(message, error);
        }
    }
};

const getStoredValue = (key) => {
    try {
        return localStorage.getItem(key);
    } catch (storageError) {
        logger.warn('Unable to read from local storage', storageError);
        return null;
    }
};

const setStoredValue = (key, value) => {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (storageError) {
        logger.warn('Unable to write to local storage', storageError);
        return false;
    }
};

const removeStoredValue = (key) => {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (storageError) {
        logger.warn('Unable to remove from local storage', storageError);
        return false;
    }
};

const readJson = async (response) => {
    try {
        return await response.json();
    } catch (parseError) {
        logger.warn('Unable to parse JSON response', parseError);
        return null;
    }
};

/**
 * Renders the main Visio-Conf application shell and handles session state.
 * @returns {JSX.Element} The application layout.
 */
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
    const [activePage, setActivePage] = useState(PAGES.landing);
    const [authMode, setAuthMode] = useState('register');

    useEffect(() => {
        checkAuthStatus();
    }, []);

    useEffect(() => {
        const savedMeetingId = getStoredValue(STORAGE_KEYS.meetingId);
        const savedUserId = getStoredValue(STORAGE_KEYS.userId);

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
                const response = await fetch(ENDPOINTS.clientConfig);
                if (!response.ok) {
                    throw new Error('Failed to fetch client config');
                }
                const configData = await readJson(response);
                setClientConfig((previous) => ({
                    ...previous,
                    demoMode: Boolean(configData?.demoMode),
                    franceTravailEnabled: Boolean(configData?.franceTravailEnabled)
                }));
            } catch (configError) {
                logger.warn('Unable to load client config, falling back to defaults', configError);
            }
        };

        fetchClientConfig();
    }, []);

    /**
     * Loads the current auth state and updates the session context.
     * @returns {Promise<void>} Resolves when auth status has been checked.
     */
    const checkAuthStatus = async () => {
        try {
            const response = await fetch(ENDPOINTS.authStatus);
            if (!response.ok) {
                throw new Error(`Auth status failed with ${response.status}`);
            }
            const authStatus = await readJson(response);

            if (authStatus?.authenticated) {
                setUser(authStatus.user);
                setUserId(authStatus.user?.id || authStatus.user?.name || DEFAULT_USER_ID);
            }
        } catch (err) {
            logger.error('Error checking auth status:', err);
            setError(t('error_status'));
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = () => {
        window.location.href = '/auth/francetravail/login';
    };

    /**
     * Logs out the current user and clears local session state.
     * @returns {Promise<void>} Resolves when logout flow is complete.
     */
    const handleLogout = async () => {
        try {
            const response = await fetch(ENDPOINTS.authLogout, { method: 'POST' });
            
            if (response.ok) {
                setUser(null);
                setShowVideoConference(false);
                setMeetingId('');
                setUserId('');
                setError('');
                removeStoredValue(STORAGE_KEYS.meetingId);
                removeStoredValue(STORAGE_KEYS.userId);
                setRestoredPreferences(false);
            } else {
                throw new Error('Logout failed');
            }
        } catch (err) {
            logger.error('Error during logout:', err);
            setError(t('error_logout'));
        }
    };

    /**
     * Validates inputs and prepares the user for joining a meeting.
     * @returns {void}
     */
    const handleJoinMeeting = () => {
        const sanitizedMeetingId = meetingId.trim();
        const sanitizedUserId = userId.trim();
        const meetingIdValid = MEETING_ID_PATTERN.test(sanitizedMeetingId);
        const userIdValid = USER_ID_PATTERN.test(sanitizedUserId);

        if (!meetingIdValid) {
            setError(t('invalid_meeting_id_strict'));
            return;
        }

        if (!userIdValid) {
            setError(t('invalid_user_id_strict'));
            return;
        }

        setStoredValue(STORAGE_KEYS.meetingId, sanitizedMeetingId);
        setStoredValue(STORAGE_KEYS.userId, sanitizedUserId);
        setError('');
        setShowVideoConference(true);
    };

    const handleLeaveMeeting = () => {
        setShowVideoConference(false);
    };

    /**
     * Updates the UI with the authenticated user details.
     * @param {object} authUser - Authenticated user payload.
     */
    const handleAuthSuccess = (authUser) => {
        setUser(authUser);
        setUserId(authUser?.id || authUser?.name || DEFAULT_USER_ID);
        setError('');
    };

    /**
     * Refreshes the auth token when the session is unauthorized.
     * @returns {Promise<void>} Resolves when token refresh completes.
     */
    const refreshToken = async () => {
        try {
            const response = await fetch(ENDPOINTS.authRefresh, { method: 'POST' });
            const data = await readJson(response);

            if (response.ok && data?.success) {
                return;
            } else {
                setUser(null);
                setError(t('session_expired'));
            }
        } catch (err) {
            logger.error('Error refreshing token:', err);
            setUser(null);
            setError(t('session_expired'));
        }
    };

    useEffect(() => {
        const handleUnauthorized = (event) => {
            if (event.detail?.status === 401 && user) {
                refreshToken();
            }
        };

        window.addEventListener('unauthorized', handleUnauthorized);
        return () => window.removeEventListener('unauthorized', handleUnauthorized);
    }, [user]);

    const trimmedMeetingId = meetingId.trim();
    const trimmedUserId = userId.trim();
    const isMeetingIdValid = MEETING_ID_PATTERN.test(trimmedMeetingId);
    const isUserIdValid = USER_ID_PATTERN.test(trimmedUserId);
    const isJoinDisabled = !isMeetingIdValid || !trimmedUserId || !isUserIdValid;

    const footerLinks = [
        { href: '/terms', label: t('terms') },
        { href: '/privacy', label: t('privacy') },
        { href: '/about', label: t('about') }
    ];

    const backgroundStyle = {
        backgroundImage:
            'radial-gradient(circle at top left, rgba(99,102,241,0.35), transparent 45%), radial-gradient(circle at 20% 20%, rgba(14,116,144,0.25), transparent 50%), radial-gradient(circle at bottom right, rgba(168,85,247,0.4), transparent 45%)'
    };

    const handleGetStarted = () => {
        setActivePage(PAGES.conference);
        setAuthMode('register');
    };

    const handleViewIndex = () => {
        setActivePage(PAGES.index);
    };

    const handleJoinConsultation = () => {
        setActivePage(PAGES.conference);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-900" style={backgroundStyle}>
            <div className="container mx-auto px-4 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
                <header className="mb-10 space-y-6 rounded-3xl border border-white/15 bg-white/10 px-6 py-8 text-white shadow-[0_20px_60px_-35px_rgba(15,23,42,0.8)] backdrop-blur-xl">
                    <div className="flex flex-col items-center gap-4 text-center">
                        <h1 className="text-4xl font-bold text-white sm:text-5xl">
                            {t('welcome')}
                        </h1>
                        <p className="max-w-2xl text-base text-white/80 sm:text-lg">
                            {t('landing_subtitle')}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-4">
                            <HealthCheck />
                            <LanguageSwitcher />
                        </div>
                    </div>
                    <div className="flex justify-center">
                        <div className="rounded-full bg-white/10 px-4 py-2 shadow-lg shadow-black/10">
                            <PageTabs activePage={activePage} onChange={setActivePage} />
                        </div>
                    </div>
                </header>

                {activePage === PAGES.landing && (
                    <ReadinessPanel
                        isMeetingIdValid={isMeetingIdValid}
                        isUserIdValid={isUserIdValid}
                        restoredPreferences={restoredPreferences}
                    />
                )}

                <div className="mx-auto max-w-5xl">
                    <div className="rounded-[32px] border border-white/60 bg-white/90 p-8 shadow-[0_40px_80px_-50px_rgba(15,23,42,0.7)] backdrop-blur">
                        {error && (
                            <div
                                className="mb-6 rounded-lg border border-red-400 bg-red-100 p-4 text-red-700 shadow-sm"
                                role="alert"
                                aria-live="assertive"
                            >
                                <div className="flex items-center">
                                    <span className="mr-2">⚠️</span>
                                    {error}
                                </div>
                            </div>
                        )}

                        {restoredPreferences && !showVideoConference && activePage === PAGES.conference && (
                            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800">
                                {t('restored_preferences')}
                            </div>
                        )}

                        {activePage === PAGES.landing && (
                            <LandingPage onGetStarted={handleGetStarted} onViewIndex={handleViewIndex} />
                        )}

                        {activePage === PAGES.index && (
                            <ConsultationIndex onJoinConsultation={handleJoinConsultation} />
                        )}

                        {activePage === PAGES.conference && (
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

                                {user && !showVideoConference && (
                                    <div className="space-y-4">
                                        <div className="border-t pt-6">
                                            <h2 className="text-xl font-semibold mb-4 text-gray-800">
                                                {t('join_meeting')}
                                            </h2>

                                            <div className="space-y-4">
                                                <div>
                                                    <label htmlFor="meetingId" className="block text-base font-medium text-gray-700 mb-2">
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
                                                    <p id="meetingId-help" className="mt-1 text-base text-gray-500">
                                                        {t('meeting_instructions')}
                                                        <br />
                                                        <span className={isMeetingIdValid ? 'text-green-600' : 'text-red-600'}>
                                                            {t('meeting_id_rules')}
                                                        </span>
                                                    </p>
                                                </div>

                                                <div>
                                                    <label htmlFor="userId" className="block text-base font-medium text-gray-700 mb-2">
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
                                                    <p className="mt-1 text-base text-gray-500">
                                                        <span className={isUserIdValid ? 'text-green-600' : 'text-red-600'}>
                                                            {t('user_id_rules')}
                                                        </span>
                                                    </p>
                                                </div>

                                                <button
                                                    onClick={handleJoinMeeting}
                                                    disabled={isJoinDisabled}
                                                    className={`w-full min-h-[44px] py-3 px-4 rounded-lg font-medium transition-colors duration-200 ${
                                                        !isJoinDisabled
                                                            ? 'bg-green-500 text-white hover:bg-green-600 focus:ring-2 focus:ring-green-500'
                                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                    }`}
                                                    aria-label={t('join_meeting')}
                                                >
                                                    {t('join_meeting')}
                                                </button>
                                                <p className="text-base text-gray-500 text-center">
                                                    {isJoinDisabled ? t('join_requirements_unmet') : t('join_ready')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {user && showVideoConference && (
                                    <VideoConference
                                        meetingId={meetingId}
                                        user={{ ...user, id: userId }}
                                        onLeave={handleLeaveMeeting}
                                    />
                                )}
                            </div>
                        )}

                        <footer className="mt-10 border-t pt-6 text-center text-base text-gray-500">
                            <div className="flex flex-wrap items-center justify-center gap-3">
                                {footerLinks.map((link, index) => (
                                    <React.Fragment key={link.href}>
                                        <a href={link.href} className="inline-flex min-h-[44px] items-center justify-center px-2 hover:text-blue-600 transition-colors">
                                            {link.label}
                                        </a>
                                        {index !== footerLinks.length - 1 && <span className="text-gray-300">|</span>}
                                    </React.Fragment>
                                ))}
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
