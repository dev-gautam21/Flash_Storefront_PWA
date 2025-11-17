import { useState, useEffect, useCallback } from 'react';
import { saveSubscription, deleteSubscription, sendWelcomeNotification, recordPermissionEvent } from '../services/api';
import { urlBase64ToUint8Array } from '../utils/vapidHelper';

// ✅ Your VAPID public key (same as backend)
const VAPID_PUBLIC_KEY =
  'BPVVHy-VRp-j9HoTkemjVZZWa6nh92uObcTeyeS1mdLpj29NvgXl9T-PDiXj_PI2WpNSmgsoHf-yRUOD7POtkUQ';

export const usePushManager = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermissionStatus(Notification.permission);
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  const requestPermission = useCallback(async () => {
    recordPermissionEvent({
      action: 'request',
      status: Notification.permission,
      occurredAt: new Date().toISOString(),
      source: 'subscribe',
    }).catch(() => undefined);

    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);

    recordPermissionEvent({
      action: 'change',
      status: permission,
      occurredAt: new Date().toISOString(),
      source: 'subscribe',
    }).catch(() => undefined);

    return permission;
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported) return;

    setIsProcessing(true);
    console.log('⚡ Starting push subscription process...');

    try {
      let permission = permissionStatus;
      if (permission === 'default') {
        permission = await requestPermission();
      }
      if (permission !== 'granted') {
        console.warn('🚫 Notification permission denied.');
        setIsProcessing(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      console.log('✅ Service Worker ready.');

      const defaultPreferences = {
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
      };

      // Check if already subscribed
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        console.log('ℹ️ Already subscribed, updating backend...');
        const response = await saveSubscription(existing, defaultPreferences);
        console.log('🧾 Backend response:', response);
        setIsSubscribed(true);
        setIsProcessing(false);
        return;
      }

      // Create a new subscription
      console.log('🆕 Creating new subscription...');
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const newSub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      console.log('📡 Sending subscription to backend...');
      const res = await saveSubscription(newSub, defaultPreferences);
      console.log('✅ Backend save response:', res);

      console.log('🎉 Sending welcome notification...');
      await sendWelcomeNotification(newSub);

      setIsSubscribed(true);
    } catch (err) {
      console.error('💥 Error during subscription process:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [isSupported, permissionStatus, requestPermission]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;
    setIsProcessing(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        console.log('🗑️ Deleting subscription from backend...');
        await deleteSubscription(sub.endpoint);
        await sub.unsubscribe();
        console.log('✅ Unsubscribed successfully.');
        setIsSubscribed(false);
        recordPermissionEvent({
          action: 'change',
          status: Notification.permission,
          occurredAt: new Date().toISOString(),
          source: 'unsubscribe',
        }).catch(() => undefined);
      }
    } catch (err) {
      console.error('❌ Failed to unsubscribe:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    isSubscribed,
    permissionStatus,
    subscribe,
    unsubscribe,
    isProcessing,
  };
};
