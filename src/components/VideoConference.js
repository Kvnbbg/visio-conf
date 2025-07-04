import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const VideoConference = ({ meetingId, user, onLeave }) => {
    const { t } = useTranslation();
    const zegoRef = useRef(null);
    const [isJoined, setIsJoined] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [participants, setParticipants] = useState([]);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isMicOn, setIsMicOn] = useState(true);

    useEffect(() => {
        // Initialize ZEGOCLOUD SDK when component mounts
        const initZego = async () => {
            try {
                // This would be replaced with actual ZEGOCLOUD SDK initialization
                console.log('Initializing ZEGOCLOUD SDK...');
                // zegoRef.current = new ZegoExpressEngine(...);
            } catch (error) {
                console.error('Failed to initialize ZEGOCLOUD:', error);
                setError(t('error_join_meeting'));
            }
        };

        initZego();

        return () => {
            // Cleanup on unmount
            if (zegoRef.current && isJoined) {
                leaveRoom();
            }
        };
    }, []);

    const joinRoom = async () => {
        if (!meetingId || !user) {
            setError(t('invalid_meeting_id'));
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Generate token for ZEGOCLOUD
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
                throw new Error('Failed to generate token');
            }

            const { token } = await response.json();

            // Join room with ZEGOCLOUD SDK
            // This would be replaced with actual ZEGOCLOUD SDK calls
            console.log('Joining room with token:', token);
            
            // Simulate successful join
            setIsJoined(true);
            setParticipants([{ id: user.id, name: user.name }]);
            
        } catch (error) {
            console.error('Error joining meeting:', error);
            setError(t('error_join_meeting'));
        } finally {
            setIsLoading(false);
        }
    };

    const leaveRoom = async () => {
        try {
            // Leave room with ZEGOCLOUD SDK
            // zegoRef.current.logoutRoom();
            console.log('Leaving room...');
            
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
        // zegoRef.current.enableCamera(!isCameraOn);
        console.log('Camera toggled:', !isCameraOn);
    };

    const toggleMicrophone = () => {
        setIsMicOn(!isMicOn);
        // zegoRef.current.enableMicrophone(!isMicOn);
        console.log('Microphone toggled:', !isMicOn);
    };

    if (!isJoined) {
        return (
            <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                <h3 className="text-lg font-semibold mb-4">{t('join_meeting')}</h3>
                <p className="text-gray-600 mb-4">{t('meeting_instructions')}</p>
                
                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                        {error}
                    </div>
                )}
                
                <button
                    onClick={joinRoom}
                    disabled={isLoading || !meetingId}
                    className={`w-full py-2 px-4 rounded-md font-medium transition-colors duration-200 ${
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
                <span className="text-sm text-gray-600">
                    {t('participants')}: {participants.length}
                </span>
            </div>

            {/* Video container - placeholder for actual video streams */}
            <div className="bg-black rounded-lg mb-4 h-64 flex items-center justify-center">
                <div className="text-white text-center">
                    <div className="text-4xl mb-2">📹</div>
                    <p>Video Conference Area</p>
                    <p className="text-sm text-gray-300">
                        ZEGOCLOUD video streams would appear here
                    </p>
                </div>
            </div>

            {/* Control buttons */}
            <div className="flex justify-center space-x-4 mb-4">
                <button
                    onClick={toggleCamera}
                    className={`p-3 rounded-full transition-colors duration-200 ${
                        isCameraOn
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                    aria-label={isCameraOn ? t('camera_off') : t('camera_on')}
                    title={isCameraOn ? t('camera_off') : t('camera_on')}
                >
                    {isCameraOn ? '📹' : '📷'}
                </button>

                <button
                    onClick={toggleMicrophone}
                    className={`p-3 rounded-full transition-colors duration-200 ${
                        isMicOn
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                    aria-label={isMicOn ? t('microphone_off') : t('microphone_on')}
                    title={isMicOn ? t('microphone_off') : t('microphone_on')}
                >
                    {isMicOn ? '🎤' : '🔇'}
                </button>

                <button
                    onClick={leaveRoom}
                    className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors duration-200"
                    aria-label={t('end_call')}
                    title={t('end_call')}
                >
                    📞
                </button>
            </div>

            {/* Participants list */}
            <div className="border-t pt-4">
                <h4 className="font-medium mb-2">{t('participants')}:</h4>
                <div className="space-y-2">
                    {participants.map((participant) => (
                        <div key={participant.id} className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                                {participant.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm">{participant.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default VideoConference;