
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { NotificationPreferences, NotificationCategory } from '../types';
import { getSubscriptionPreferences, updateSubscriptionPreferences } from '../services/api';

interface SettingsProps {
    isOpen: boolean;
    onClose: () => void;
    isSupported: boolean;
    isSubscribed: boolean;
    permissionStatus: NotificationPermission;
    onSubscribe: () => void;
    onUnsubscribe: () => void;
    isProcessing: boolean;
}

const PreferenceToggle: React.FC<{ label: string; isEnabled: boolean; onToggle: (enabled: boolean) => void; isDisabled: boolean; }> = ({ label, isEnabled, onToggle, isDisabled }) => (
    <div className={`flex items-center justify-between py-3 px-4 rounded-lg transition-colors ${isDisabled ? 'bg-gray-100' : 'bg-white'}`}>
        <span className={`font-medium ${isDisabled ? 'text-gray-400' : 'text-gray-700'}`}>{label}</span>
        <button
            onClick={() => onToggle(!isEnabled)}
            disabled={isDisabled}
            role="switch"
            aria-checked={isEnabled}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                isEnabled ? 'bg-indigo-500' : 'bg-gray-300'
            } ${isDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
        >
            <span
                className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                    isEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
        </button>
    </div>
);


const Settings: React.FC<SettingsProps> = ({
    isOpen,
    onClose,
    isSupported,
    isSubscribed,
    permissionStatus,
    onSubscribe,
    onUnsubscribe,
    isProcessing,
}) => {
    const defaultPreferences = useMemo<NotificationPreferences>(() => ({
        flashSales: true,
        newArrivals: true,
        priceDrops: true,
        backInStock: true,
        quietHours: {
            enabled: false,
            start: '22:00',
            end: '08:00',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        mutedUntil: null,
    }), []);

    const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
    const [isLoadingPrefs, setIsLoadingPrefs] = useState(false);

    const fetchPreferences = useCallback(async () => {
        if (!isSubscribed) {
            setPreferences(null);
            return;
        }
        setIsLoadingPrefs(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                const prefs = await getSubscriptionPreferences(subscription.endpoint);
                if (prefs) {
                    setPreferences({
                        ...defaultPreferences,
                        ...prefs,
                        quietHours: {
                            ...defaultPreferences.quietHours,
                            ...(prefs.quietHours ?? {}),
                        },
                    });
                } else {
                    setPreferences(defaultPreferences);
                }
            }
        } catch (error) {
            console.error("Error fetching preferences", error);
        } finally {
            setIsLoadingPrefs(false);
        }
    }, [defaultPreferences, isSubscribed]);

    useEffect(() => {
        if (isOpen && isSubscribed) {
            fetchPreferences();
        }
         if (!isSubscribed) {
            setPreferences(null);
        }
    }, [defaultPreferences, isOpen, isSubscribed, fetchPreferences]);

    // Keep hooks BEFORE any conditional returns
    const updatePreferences = useCallback(async (nextPreferences: NotificationPreferences, rollback?: NotificationPreferences) => {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            const success = await updateSubscriptionPreferences(subscription.endpoint, nextPreferences);
            if (!success && rollback) {
                setPreferences(rollback);
            }
        }
    }, []);

    const handlePreferenceChange = async (category: NotificationCategory, value: boolean) => {
        if (!preferences) return;
        const previous = preferences;
        const next = { ...preferences, [category]: value };
        setPreferences(next);
        await updatePreferences(next, previous);
    };

    if (!isOpen) return null;

    const preferenceCategories: { key: NotificationCategory; label: string }[] = [
        { key: 'flashSales', label: 'Flash Sales' },
        { key: 'newArrivals', label: 'New Arrivals' },
        { key: 'priceDrops', label: 'Price Drops' },
        { key: 'backInStock', label: 'Back in Stock Alerts' },
    ];

    const quietHours = preferences?.quietHours ?? defaultPreferences.quietHours;

    const handleQuietHourToggle = async (enabled: boolean) => {
        if (!preferences) return;
        const next = {
            ...preferences,
            quietHours: {
                ...quietHours,
                enabled,
            },
        };
        setPreferences(next);
        await updatePreferences(next, preferences);
    };

    const handleQuietHourChange = async (field: 'start' | 'end', value: string) => {
        if (!preferences) return;
        const sanitized = /^\d{2}:\d{2}$/.test(value) ? value : quietHours[field];
        const next = {
            ...preferences,
            quietHours: {
                ...quietHours,
                [field]: sanitized,
            },
        };
        setPreferences(next);
        await updatePreferences(next, preferences);
    };

    const handleSnooze = async (hours: number) => {
        if (!preferences) return;
        const previous = preferences;
        const mutedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
        const next = { ...preferences, mutedUntil };
        setPreferences(next);
        await updatePreferences(next, previous);
    };

    const handleClearSnooze = async () => {
        if (!preferences || !preferences.mutedUntil) return;
        const previous = preferences;
        const next = { ...preferences, mutedUntil: null };
        setPreferences(next);
        await updatePreferences(next, previous);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div className="m-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Notification Preferences</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="rounded-lg bg-gray-100 p-4 text-center">
                        {!isSupported ? (
                            <p className="text-sm text-gray-600">Push notifications are not supported on this device/browser.</p>
                        ) : permissionStatus === 'denied' ? (
                            <p className="text-sm text-gray-600">Notifications are blocked in your browser settings. Please allow notifications and reopen this dialog.</p>
                        ) : isSubscribed ? (
                            <>
                                <p className="font-semibold text-green-700">You are subscribed to notifications.</p>
                                <button
                                    onClick={onUnsubscribe}
                                    disabled={isProcessing}
                                    className="mt-2 text-sm text-red-600 hover:underline disabled:text-gray-400"
                                >
                                    {isProcessing ? 'Processing...' : 'Unsubscribe'}
                                </button>
                            </>
                        ) : (
                            <>
                                <p className="font-semibold">
                                    {permissionStatus === 'default'
                                        ? 'Get alerts for new sales and products!'
                                        : "You've granted permission!"}
                                </p>
                                <button
                                    onClick={onSubscribe}
                                    disabled={isProcessing}
                                    className="mt-2 w-full rounded-lg bg-blue-500 py-2 px-4 font-bold text-white transition-colors hover:bg-blue-600 disabled:bg-gray-400"
                                >
                                    {isProcessing ? 'Processing...' : 'Subscribe Now'}
                                </button>
                            </>
                        )}
                    </div>

                    <div className="space-y-2">
                        {isLoadingPrefs ? (
                            <div className="p-4 text-center">Loading preferences...</div>
                        ) : preferences ? (
                            preferenceCategories.map(({ key, label }) => (
                                <PreferenceToggle
                                    key={key}
                                    label={label}
                                    isEnabled={preferences[key]}
                                    onToggle={(value) => handlePreferenceChange(key, value)}
                                    isDisabled={!isSubscribed || isProcessing}
                                />
                            ))
                        ) : (
                            <div className="mt-4 border-t pt-4 text-center text-sm text-gray-500">
                                {isSubscribed
                                    ? 'Could not load preferences.'
                                    : 'Subscribe to notifications to manage your alert preferences.'}
                            </div>
                        )}
                    </div>

                    {preferences && (
                        <section className="mt-5 border-t pt-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-800">Quiet Hours</h3>
                                    <p className="text-sm text-gray-500">
                                        Pause alerts between selected times ({quietHours.timezone}).
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleQuietHourToggle(!quietHours.enabled)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${quietHours.enabled ? 'bg-blue-500' : 'bg-gray-300'}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${quietHours.enabled ? 'translate-x-6' : 'translate-x-1'}`}
                                    />
                                </button>
                            </div>

                            <div className={`mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 ${quietHours.enabled ? '' : 'pointer-events-none opacity-60'}`}>
                                <label className="flex flex-col text-sm font-medium text-gray-600">
                                    Start
                                    <input
                                        type="time"
                                        value={quietHours.start}
                                        onChange={(event) => handleQuietHourChange('start', event.target.value)}
                                        className="mt-1 rounded-md border px-3 py-2 focus:ring focus:ring-blue-200"
                                    />
                                </label>
                                <label className="flex flex-col text-sm font-medium text-gray-600">
                                    End
                                    <input
                                        type="time"
                                        value={quietHours.end}
                                        onChange={(event) => handleQuietHourChange('end', event.target.value)}
                                        className="mt-1 rounded-md border px-3 py-2 focus:ring focus:ring-blue-200"
                                    />
                                </label>
                            </div>

                            <div className="mt-4 flex flex-col gap-3 border-t pt-4">
                                <button
                                    onClick={() => handleSnooze(12)}
                                    className="rounded-lg border border-blue-200 bg-blue-50 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-100"
                                >
                                    Snooze notifications for 12 hours
                                </button>
                                <button
                                    onClick={() => handleSnooze(24)}
                                    className="rounded-lg border border-blue-200 bg-blue-50 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-100"
                                >
                                    Snooze for 1 day
                                </button>
                                {preferences.mutedUntil && (
                                    <>
                                        <button
                                            onClick={handleClearSnooze}
                                            className="rounded-lg border border-gray-200 bg-white py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
                                        >
                                            Resume notifications now
                                        </button>
                                        <p className="text-xs text-gray-500">
                                            Snoozed until {new Date(preferences.mutedUntil).toLocaleString()}.
                                        </p>
                                    </>
                                )}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
