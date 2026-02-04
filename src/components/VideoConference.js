import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const VideoConference = ({ meetingId, user, onLeave }) => {
    const { t } = useTranslation();
    const [isJoined, setIsJoined] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [participants, setParticipants] = useState([]);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isMicOn, setIsMicOn] = useState(true);

    const joinRoom = async () => {
        if (!meetingId || !user) {
            setError(t('invalid_meeting_id'));
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('/api/generate-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    roomID: meetingId,
                    userID: user.id
                })
            });

            if (!response.ok) {
                if (response.status === 401) {
                    window.dispatchEvent(new CustomEvent('unauthorized', { detail: { status: 401 } }));
                }
                throw new Error('Failed to generate token');
            }

            const { user: responseUser } = await response.json();

            setIsJoined(true);
            setParticipants([{ id: responseUser?.id || user.id, name: responseUser?.name || user.name }]);
        } catch (joinError) {
            console.error('Error joining meeting:', joinError);
            setError(t('error_join_meeting'));
        } finally {
            setIsLoading(false);
        }
    };

    const leaveRoom = () => {
        try {
            setIsJoined(false);
            setParticipants([]);

            if (onLeave) {
                onLeave();
            }
        } catch (error) {
            console.error('Error leaving meeting:', error);
        }
    };

    const toggleCamera = () => {
        setIsCameraOn(!isCameraOn);
    };

    const toggleMicrophone = () => {
        setIsMicOn(!isMicOn);
    };

    if (!isJoined) {
        return (
            <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                <h3 className="text-lg font-semibold mb-4">{t('join_meeting')}</h3>
                <p className="text-base text-gray-600 mb-4">{t('meeting_instructions')}</p>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                        {error}
                    </div>
                )}

                <button type="button"
                    onClick={joinRoom}
                    disabled={isLoading || !meetingId}
                    className={`w-full min-h-[44px] py-2 px-4 rounded-md font-medium transition-colors duration-200 ${
                        isLoading || !meetingId
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                    aria-label={t('join_meeting')}
                >
                    {isLoading ? t('loading') : t('join_meeting')}
                </button>
            </div>
        );
    }

    return (
        <div className="mt-6 p-4 border rounded-lg bg-gray-50">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                    {t('meeting_id')}: {meetingId}
                </h3>
                <span className="text-base text-gray-600">
                    {t('participants')}: {participants.length}
                </span>
            </div>

            <div className="bg-black rounded-lg mb-4 h-64 flex items-center justify-center">
                <div className="text-white text-center">
                    <div className="text-4xl mb-2">📹</div>
                    <p>Video Conference Area</p>
                    <p className="text-base text-gray-300">
                        OxyLayer video streams would appear here
                    </p>
                </div>
            </div>

            <div className="flex justify-center space-x-4 mb-4">
                <button type="button"
                    onClick={toggleCamera}
                    className={`min-h-[44px] min-w-[44px] p-3 rounded-full transition-colors duration-200 ${
                        isCameraOn
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                    aria-label={isCameraOn ? t('camera_off') : t('camera_on')}
                    title={isCameraOn ? t('camera_off') : t('camera_on')}
                >
                    {isCameraOn ? '📹' : '📷'}
                </button>

                <button type="button"
                    onClick={toggleMicrophone}
                    className={`min-h-[44px] min-w-[44px] p-3 rounded-full transition-colors duration-200 ${
                        isMicOn
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                    aria-label={isMicOn ? t('microphone_off') : t('microphone_on')}
                    title={isMicOn ? t('microphone_off') : t('microphone_on')}
                >
                    {isMicOn ? '🎤' : '🔇'}
                </button>
            </div>

            <div className="flex justify-center mb-4">
                <button type="button"
                    onClick={leaveRoom}
                    className="min-h-[44px] py-2 px-6 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors duration-200"
                    aria-label={t('end_call')}
                    title={t('end_call')}
                >
                    {t('end_call')}
                </button>
            </div>

            <div className="border-t pt-4">
                <h4 className="text-base font-medium mb-2">{t('participants')}:</h4>
                <div className="space-y-2">
                    {participants.map((participant) => (
                        <div key={participant.id} className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-base">
                                {participant.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-base">{participant.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default VideoConference;
