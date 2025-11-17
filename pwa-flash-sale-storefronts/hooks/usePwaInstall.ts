
import { useState, useEffect, useCallback, useRef } from 'react';
import { recordInstallEvent } from '../services/api';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string,
  }>;
  prompt(): Promise<void>;
}

export const usePwaInstall = () => {
    const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
    const [isAppInstalled, setIsAppInstalled] = useState(false);
    const acceptedLoggedRef = useRef(false);
    const fallbackLoggedRef = useRef(false);

    useEffect(() => {
        const handleBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();
            setInstallPromptEvent(event as BeforeInstallPromptEvent);
            recordInstallEvent({
                event: 'prompt-shown',
                platform: navigator.platform,
                occurredAt: new Date().toISOString(),
            }).catch(() => undefined);
        };
        
        const handleAppInstalled = () => {
             setInstallPromptEvent(null);
             setIsAppInstalled(true);
             console.log('PWA was installed');
            if (!acceptedLoggedRef.current) {
                acceptedLoggedRef.current = true;
                recordInstallEvent({
                    event: 'accepted',
                    platform: navigator.platform,
                    occurredAt: new Date().toISOString(),
                    reason: 'appinstalled',
                }).catch(() => undefined);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        // Check if the app is already installed in standalone mode
        if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
            setIsAppInstalled(true);
        }

        if (!('onbeforeinstallprompt' in window) && !fallbackLoggedRef.current) {
            fallbackLoggedRef.current = true;
            recordInstallEvent({
                event: 'fallback',
                platform: navigator.platform,
                occurredAt: new Date().toISOString(),
                reason: 'no-beforeinstallprompt',
            }).catch(() => undefined);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const triggerInstall = useCallback(async () => {
        if (!installPromptEvent) return;

        installPromptEvent.prompt();
        const { outcome } = await installPromptEvent.userChoice;
        if (outcome === 'accepted') {
            setIsAppInstalled(true);
            acceptedLoggedRef.current = true;
            try {
                await recordInstallEvent({
                    event: 'accepted',
                    platform: installPromptEvent.platforms?.[0] ?? navigator.platform,
                    occurredAt: new Date().toISOString(),
                    reason: 'user-choice',
                });
            } catch {
                // ignore analytics failure
            }
        }
        if (outcome === 'dismissed') {
            try {
                await recordInstallEvent({
                    event: 'dismissed',
                    platform: installPromptEvent.platforms?.[0] ?? navigator.platform,
                    occurredAt: new Date().toISOString(),
                });
            } catch {
                // ignore analytics failure
            }
        }
        setInstallPromptEvent(null);
    }, [installPromptEvent]);

    return { canInstall: !!installPromptEvent, isAppInstalled, triggerInstall };
};
