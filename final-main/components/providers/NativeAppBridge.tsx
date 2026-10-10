'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

declare global {
    interface Window {
        ReactNativeWebView?: { postMessage: (message: string) => void };
        AptivoNativeBridge?: { unregisterPushDevice: () => Promise<void> };
    }
}

function post(type: string, payload: Record<string, unknown> = {}) {
    window.ReactNativeWebView?.postMessage(JSON.stringify({ type, ...payload }));
}

function isBridgeMessage(value: unknown): value is { type: string; installationId?: string; expoPushToken?: string; platform?: string } {
    return Boolean(value) && typeof value === 'object' && typeof (value as { type?: unknown }).type === 'string';
}

export default function NativeAppBridge() {
    const pathname = usePathname();

    useEffect(() => {
        if (!window.ReactNativeWebView) return;
        let active = true;
        const syncAuthentication = async () => {
            try {
                const response = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
                if (!active) return;
                if (response.ok) post('AUTHENTICATED');
                else if (response.status === 401 || response.status === 403) post('LOGOUT');
                else post('WEBVIEW_READY');
            } catch {
                if (active) post('WEBVIEW_READY');
            }
        };
        void syncAuthentication();
        return () => { active = false; };
    }, [pathname]);

    useEffect(() => {
        if (!window.ReactNativeWebView) return;
        const handleMessage = async (event: MessageEvent) => {
            let message: unknown;
            try { message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; } catch { return; }
            if (!isBridgeMessage(message)) return;

            if (message.type === 'SET_INSTALLATION' && message.installationId) {
                sessionStorage.setItem('aptivo-native-installation', message.installationId);
                return;
            }
            if (!message.installationId) return;

            if (message.type === 'REGISTER_PUSH_DEVICE') {
                await fetch('/api/mobile/push/devices', {
                    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ installationId: message.installationId, expoPushToken: message.expoPushToken, platform: message.platform }),
                });
            }
            if (message.type === 'UNREGISTER_PUSH_DEVICE') {
                await fetch('/api/mobile/push/devices', {
                    method: 'DELETE', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ installationId: message.installationId }),
                });
            }
        };
        window.addEventListener('message', handleMessage);
        document.addEventListener('message', handleMessage as unknown as EventListener);
        window.AptivoNativeBridge = {
            unregisterPushDevice: async () => {
                const installationId = sessionStorage.getItem('aptivo-native-installation');
                if (!installationId) return;
                await fetch('/api/mobile/push/devices', {
                    method: 'DELETE', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ installationId }),
                }).catch(() => undefined);
            },
        };
        post('WEBVIEW_READY');
        return () => {
            window.removeEventListener('message', handleMessage);
            document.removeEventListener('message', handleMessage as unknown as EventListener);
            delete window.AptivoNativeBridge;
        };
    }, []);

    return null;
}
