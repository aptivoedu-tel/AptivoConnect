type SystemSettingsResponse = {
    settings?: {
        maintenance_mode?: boolean;
        ai_chatbot_active?: boolean;
        practice_mcqs_limit?: number;
        [key: string]: unknown;
    };
    error?: string;
};

let cachedSettings: SystemSettingsResponse | null = null;
let cachedAt = 0;
let inFlight: Promise<SystemSettingsResponse> | null = null;

export class SystemSettingsService {
    static async getSettings(options: { ttlMs?: number; force?: boolean } = {}): Promise<SystemSettingsResponse> {
        const ttlMs = options.ttlMs ?? 600000;
        const now = Date.now();

        if (!options.force && cachedSettings && now - cachedAt < ttlMs) {
            return cachedSettings;
        }

        if (!options.force && inFlight) {
            return inFlight;
        }

        inFlight = fetch('/api/mongo/admin/settings')
            .then(async (res) => {
                if (!res.ok) {
                    return { error: `Settings request failed with ${res.status}` };
                }
                return res.json();
            })
            .then((data) => {
                cachedSettings = data;
                cachedAt = Date.now();
                return data;
            })
            .catch((error: unknown) => ({
                error: error instanceof Error ? error.message : 'Settings request failed'
            }))
            .finally(() => {
                inFlight = null;
            });

        return inFlight;
    }

    static clearCache() {
        cachedSettings = null;
        cachedAt = 0;
    }
}
