import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './components/LanguageSwitcher';
import AuthButton from './components/AuthButton';
import VideoConference from './components/VideoConference';
import HealthCheck from './components/HealthCheck';
import './i18n'; // Initialize i18n

const App = () => {
    const { t } = useTranslation();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [meetingId, setMeetingId] = useState('');
    const [userId, setUserId] = useState('');
    const [showVideoConference, setShowVideoConference] = useState(false);

    useEffect(() => {
        checkAuthStatus();
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
        if (!meetingId.trim()) {
            setError(t('invalid_meeting_id'));
            return;
        }
        
        if (!userId.trim()) {
            setError(t('invalid_user_id'));
            return;
        }
        
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
                            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                                <div className="flex items-center">
                                    <span className="mr-2">⚠️</span>
                                    {error}
                                </div>
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
                                                onChange={(e) => setMeetingId(e.target.value)}
                                                placeholder={t('meeting_id_placeholder')}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                aria-describedby="meetingId-help"
                                            />
                                            <p id="meetingId-help" className="mt-1 text-sm text-gray-500">
                                                {t('meeting_instructions')}
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
                                                onChange={(e) => setUserId(e.target.value)}
                                                placeholder={t('user_id_placeholder')}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>

                                        <button
                                            onClick={handleJoinMeeting}
                                            disabled={!meetingId.trim() || !userId.trim()}
                                            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors duration-200 ${
                                                meetingId.trim() && userId.trim()
                                                    ? 'bg-green-500 text-white hover:bg-green-600 focus:ring-2 focus:ring-green-500'
                                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            }`}
                                            aria-label={t('join_meeting')}
                                        >
                                            {t('join_meeting')}
                                        </button>
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