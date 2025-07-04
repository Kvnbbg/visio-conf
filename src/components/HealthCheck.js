import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const HealthCheck = () => {
    const { t } = useTranslation();
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkHealth = async () => {
            try {
                const response = await fetch('/api/health');
                const data = await response.json();
                setHealth(data);
            } catch (error) {
                setHealth({ status: 'error', message: 'Failed to check health' });
            } finally {
                setLoading(false);
            }
        };

        checkHealth();
        
        // Check health every 30 seconds
        const interval = setInterval(checkHealth, 30000);
        
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                <span>{t('loading')}</span>
            </div>
        );
    }

    const isHealthy = health?.status === 'ok';
    
    return (
        <div className={`flex items-center space-x-2 text-sm ${
            isHealthy ? 'text-green-600' : 'text-red-600'
        }`}>
            <div className={`w-2 h-2 rounded-full ${
                isHealthy ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span>
                {isHealthy ? t('health_ok') : t('health_error')}
            </span>
        </div>
    );
};

export default HealthCheck;