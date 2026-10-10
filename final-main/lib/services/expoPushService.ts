import MobilePushDevice from '@/lib/mongodb/models/MobilePushDevice';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_TOKEN_PATTERN = /^ExponentPushToken\[[^\]]+\]$|^ExpoPushToken\[[^\]]+\]$/;

type PushDevice = { expo_push_token: string };
type ExpoTicket = { details?: { error?: string } };
type ExpoResponse = { data?: ExpoTicket[] };

function safePath(path: unknown) {
    return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') && !path.includes('\\')
        ? path
        : '/notifications';
}

export async function sendExpoPushToUsers(input: {
    userIds: string[];
    title: string;
    body: string;
    path?: string;
    notificationId: number;
}) {
    const devices = await MobilePushDevice.find({
        user_id: { $in: input.userIds },
        enabled: true,
    }).lean() as unknown as PushDevice[];

    const messages = devices
        .filter((device) => EXPO_TOKEN_PATTERN.test(device.expo_push_token))
        .map((device) => ({
            to: device.expo_push_token,
            title: input.title,
            body: input.body,
            sound: 'default',
            priority: 'default',
            data: { path: safePath(input.path), notificationId: input.notificationId },
        }));

    for (let index = 0; index < messages.length; index += 100) {
        try {
            const response = await fetch(EXPO_PUSH_URL, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    ...(process.env.EXPO_PUSH_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_PUSH_ACCESS_TOKEN}` } : {}),
                },
                body: JSON.stringify(messages.slice(index, index + 100)),
            });
            const result: ExpoResponse | null = await response.json().catch(() => null);
            if (!response.ok || !Array.isArray(result?.data)) {
                console.error('[Expo Push] Delivery request failed', response.status);
                continue;
            }
            const invalidTokens = result.data
                .map((ticket, ticketIndex) => ticket?.details?.error === 'DeviceNotRegistered'
                    ? messages[index + ticketIndex]?.to
                    : null)
                .filter(Boolean);
            if (invalidTokens.length) {
                await MobilePushDevice.updateMany(
                    { expo_push_token: { $in: invalidTokens } },
                    { $set: { enabled: false } },
                );
            }
        } catch (error) {
            // Native delivery is best-effort. Persisted Aptivo notifications remain authoritative.
            console.error('[Expo Push] Delivery request failed', error);
        }
    }
}
