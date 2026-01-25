import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './components/LanguageSwitcher';
import AuthPanel from './components/AuthPanel';
import LandingPage from './components/LandingPage';
import ConsultationIndex from './components/ConsultationIndex';
import VideoConference from './components/VideoConference';
import HealthCheck from './components/HealthCheck';
import ReadinessPanel from './components/ReadinessPanel';
import SocialFeed from './components/SocialFeed';
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
    conference: 'conference',
    feed: 'feed'
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

const Panel = ({ title, description, children, className = '' }) => (
    <section className={`rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm ${className}`}>
        <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
            {description && <p className="mt-1 text-base text-slate-600">{description}</p>}
        </div>
        {children}
    </section>
);

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
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [theme, setTheme] = useState('dark');

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

    const handleNavChange = (page) => {
        setActivePage(page);
        setIsMobileNavOpen(false);
    };

    const toggleTheme = () => {
        setTheme((previous) => (previous === 'dark' ? 'light' : 'dark'));
    };

    const trimmedMeetingId = meetingId.trim();
    const trimmedUserId = userId.trim();
    const isMeetingIdValid = MEETING_ID_PATTERN.test(trimmedMeetingId);
    const isUserIdValid = USER_ID_PATTERN.test(trimmedUserId);
    const isJoinDisabled = !isMeetingIdValid || !trimmedUserId || !isUserIdValid;
    const isDark = theme === 'dark';

    const navLinks = useMemo(
        () => [
            { id: PAGES.landing, label: t('nav_landing'), description: t('nav_landing_desc') },
            { id: PAGES.index, label: t('nav_index'), description: t('nav_index_desc') },
            { id: PAGES.feed, label: t('nav_feed'), description: t('nav_feed_desc') },
            { id: PAGES.conference, label: t('nav_conference'), description: t('nav_conference_desc') }
        ],
        [t]
    );

    const activeNav = navLinks.find((link) => link.id === activePage) || navLinks[0];

    const pageMeta = useMemo(() => {
        switch (activePage) {
            case PAGES.index:
                return { title: t('index_title'), description: t('index_subtitle') };
            case PAGES.feed:
                return { title: t('feed_title'), description: t('feed_subtitle') };
            case PAGES.conference:
                return { title: t('nav_conference'), description: t('nav_conference_desc') };
            case PAGES.landing:
            default:
                return { title: t('landing_title'), description: t('landing_subtitle') };
        }
    }, [activePage, t]);

    const footerLinks = [
        { href: '/terms', label: t('terms') },
        { href: '/privacy', label: t('privacy') },
        { href: '/about', label: t('about') }
    ];

    const backgroundStyle = {
        backgroundImage: isDark
            ? 'radial-gradient(circle at top left, rgba(99,102,241,0.35), transparent 45%), radial-gradient(circle at 20% 20%, rgba(14,116,144,0.25), transparent 50%), radial-gradient(circle at bottom right, rgba(168,85,247,0.4), transparent 45%)'
            : 'radial-gradient(circle at top left, rgba(99,102,241,0.15), transparent 45%), radial-gradient(circle at 20% 20%, rgba(14,116,144,0.15), transparent 50%), radial-gradient(circle at bottom right, rgba(168,85,247,0.18), transparent 45%)'
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

    const showAside = !(activePage === PAGES.conference && showVideoConference) && activePage !== PAGES.feed;
    const mainColumnClass = showAside ? 'lg:col-span-8' : 'lg:col-span-12';

    return (
        <div
            className={`min-h-screen text-base ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}
            style={backgroundStyle}
        >
            <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 text-white backdrop-blur">
                <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-base font-bold text-white shadow">
                            VC
                        </div>
                        <div>
                            <p className="text-base font-semibold">Visio-Conf</p>
                            <p className="text-xs text-white/70">Dashboard</p>
                        </div>
                    </div>

                    <div className="hidden flex-1 justify-center lg:flex">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 p-2">
                            {navLinks.map((link) => (
                                <button
                                    key={link.id}
                                    onClick={() => handleNavChange(link.id)}
                                    className={`min-h-[44px] rounded-full px-4 text-base font-semibold transition ${
                                        activePage === link.id
                                            ? 'bg-white text-slate-900 shadow'
                                            : 'text-white/80 hover:bg-white/10'
                                    }`}
                                    aria-current={activePage === link.id ? 'page' : undefined}
                                >
                                    {link.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={toggleTheme}
                            className="min-h-[44px] rounded-full border border-white/20 px-4 text-base font-semibold text-white transition hover:bg-white/10"
                            aria-pressed={!isDark}
                            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {isDark ? 'Light' : 'Dark'}
                        </button>
                        <LanguageSwitcher compact />
                        {user && (
                            <button
                                onClick={handleLogout}
                                className="min-h-[44px] rounded-full bg-red-500 px-4 text-base font-semibold text-white transition hover:bg-red-600"
                            >
                                {t('logout_button')}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setIsMobileNavOpen((open) => !open)}
                            className="min-h-[44px] rounded-full border border-white/20 px-4 text-base font-semibold text-white transition hover:bg-white/10 lg:hidden"
                            aria-expanded={isMobileNavOpen}
                            aria-controls="mobile-nav"
                        >
                            ☰
                        </button>
                    </div>
                </nav>
                <div
                    id="mobile-nav"
                    className={`${isMobileNavOpen ? 'block' : 'hidden'} border-t border-white/10 bg-slate-950/95 px-4 py-4 lg:hidden`}
                >
                    <div className="space-y-2">
                        {navLinks.map((link) => (
                            <button
                                key={link.id}
                                onClick={() => handleNavChange(link.id)}
                                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-base font-semibold transition min-h-[44px] ${
                                    activePage === link.id
                                        ? 'border-white/30 bg-white text-slate-900'
                                        : 'border-white/10 bg-white/5 text-white'
                                }`}
                            >
                                <span>{link.label}</span>
                                <span className="text-sm text-white/70">{link.description}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8">
                <section className="mb-8 rounded-3xl border border-white/20 bg-white/90 p-6 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.6)] backdrop-blur">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-2">
                            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-500">
                                {activeNav.label}
                            </p>
                            <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">{pageMeta.title}</h1>
                            <p className="max-w-2xl text-base text-slate-600">{pageMeta.description}</p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                    {t('health_check')}
                                </p>
                                <div className="mt-2">
                                    <HealthCheck />
                                </div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                    {user ? t('welcome_user', { name: user.name || user.id }) : t('login_tab')}
                                </p>
                                <p className="mt-2 text-base font-semibold text-slate-900">
                                    {user?.email || t('family_invite_body')}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-12">
                    <div className={`space-y-6 ${mainColumnClass}`}>
                        {error && (
                            <div
                                className="rounded-2xl border border-red-400 bg-red-50 p-4 text-red-700 shadow-sm"
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
                            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-800">
                                {t('restored_preferences')}
                            </div>
                        )}

                        {activePage === PAGES.landing && (
                            <Panel title={t('landing_title')} description={t('landing_subtitle')}>
                                <LandingPage onGetStarted={handleGetStarted} onViewIndex={handleViewIndex} />
                            </Panel>
                        )}

                        {activePage === PAGES.index && (
                            <Panel title={t('index_title')} description={t('index_subtitle')}>
                                <ConsultationIndex onJoinConsultation={handleJoinConsultation} />
                            </Panel>
                        )}

                        {activePage === PAGES.feed && (
                            <Panel title={t('feed_title')} description={t('feed_subtitle')}>
                                <SocialFeed
                                    currentUser={
                                        user
                                            ? { ...user, handle: `@${user.name || user.id}` }
                                            : { id: 'guest', name: t('feed_guest_name'), handle: '@guest' }
                                    }
                                />
                            </Panel>
                        )}

                        {activePage === PAGES.conference && (
                            <div className="space-y-6">
                                <Panel
                                    title={authMode === 'register' ? t('register_tab') : t('login_tab')}
                                    description={t('family_invite_body')}
                                >
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
                                </Panel>

                                {user && !showVideoConference && (
                                    <Panel title={t('join_meeting')} description={t('meeting_instructions')}>
                                        <div className="space-y-4">
                                            <div>
                                                <label
                                                    htmlFor="meetingId"
                                                    className="mb-2 block text-base font-medium text-gray-700"
                                                >
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
                                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-transparent focus:ring-2 focus:ring-blue-500"
                                                    aria-describedby="meetingId-help"
                                                    aria-invalid={!isMeetingIdValid}
                                                />
                                                <p id="meetingId-help" className="mt-1 text-base text-gray-500">
                                                    {t('meeting_instructions')}
                                                    <br />
                                                    <span
                                                        className={isMeetingIdValid ? 'text-green-600' : 'text-red-600'}
                                                    >
                                                        {t('meeting_id_rules')}
                                                    </span>
                                                </p>
                                            </div>

                                            <div>
                                                <label htmlFor="userId" className="mb-2 block text-base font-medium text-gray-700">
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
                                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-transparent focus:ring-2 focus:ring-blue-500"
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
                                                className={`min-h-[48px] w-full rounded-lg px-4 py-3 text-base font-semibold transition-colors duration-200 ${
                                                    !isJoinDisabled
                                                        ? 'bg-green-500 text-white hover:bg-green-600 focus:ring-2 focus:ring-green-500'
                                                        : 'cursor-not-allowed bg-gray-300 text-gray-500'
                                                }`}
                                                aria-label={t('join_meeting')}
                                            >
                                                {t('join_meeting')}
                                            </button>
                                            <p className="text-base text-gray-500 text-center">
                                                {isJoinDisabled ? t('join_requirements_unmet') : t('join_ready')}
                                            </p>
                                        </div>
                                    </Panel>
                                )}

                                {user && showVideoConference && (
                                    <Panel title={t('nav_conference')} description={t('nav_conference_desc')}>
                                        <VideoConference
                                            meetingId={meetingId}
                                            user={{ ...user, id: userId }}
                                            onLeave={handleLeaveMeeting}
                                        />
                                    </Panel>
                                )}
                            </div>
                        )}
                    </div>

                    {showAside && (
                        <aside className="space-y-6 lg:col-span-4">
                            {activePage === PAGES.landing && (
                                <ReadinessPanel
                                    isMeetingIdValid={isMeetingIdValid}
                                    isUserIdValid={isUserIdValid}
                                    restoredPreferences={restoredPreferences}
                                />
                            )}

                            <Panel title={t('health_check')} description={t('connection_mode_label')}>
                                <div className="space-y-3">
                                    <HealthCheck />
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-base text-slate-700">
                                        {clientConfig.demoMode ? t('connection_mode_fallback') : t('connection_mode_api')}
                                    </div>
                                </div>
                            </Panel>
                        </aside>
                    )}
                </section>

                <footer className="mt-12 rounded-2xl border border-white/20 bg-white/80 px-6 py-6 text-center text-base text-slate-600 shadow-sm backdrop-blur">
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        {footerLinks.map((link, index) => (
                            <React.Fragment key={link.href}>
                                <a
                                    href={link.href}
                                    className="inline-flex min-h-[44px] items-center justify-center px-2 font-medium text-slate-600 transition-colors hover:text-indigo-600"
                                >
                                    {link.label}
                                </a>
                                {index !== footerLinks.length - 1 && <span className="text-slate-300">|</span>}
                            </React.Fragment>
                        ))}
                    </div>
                    <p>{t('powered_by')}</p>
                    <p className="mt-1">{t('version')}</p>
                </footer>
            </main>
        </div>
    );
};

export default App;
