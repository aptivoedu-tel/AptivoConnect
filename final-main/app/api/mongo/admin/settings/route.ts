import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { SystemSettings } from '@/lib/mongodb/models';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

let cachedSettings: unknown = null;
let cachedSettingsAt = 0;
const SETTINGS_CACHE_MS = 60000;

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        let settings = cachedSettings && Date.now() - cachedSettingsAt < SETTINGS_CACHE_MS
            ? cachedSettings
            : await SystemSettings.findOne({ setting_id: 'global_settings' }).lean();

        if (!settings) {
            const newDoc = await SystemSettings.create({
                setting_id: 'global_settings',
                practice_mcqs_limit: 20,
                ai_chatbot_active: true,
                updated_at: new Date()
            });
            settings = newDoc.toObject ? newDoc.toObject() : newDoc;
        }

        if (!cachedSettings || Date.now() - cachedSettingsAt >= SETTINGS_CACHE_MS) {
            cachedSettings = settings;
            cachedSettingsAt = Date.now();
        }

        return NextResponse.json({ settings }, {
            headers: {
                'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
            }
        });
    } catch (error: any) {
        console.error('[API/Settings] GET Internal Error:', error);
        // Never expose stack traces to the client
        return NextResponse.json({
            error: error.message || 'Settings retrieval failed'
        }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized configuration change' }, { status: 401 });
        }

        const body = await req.json();
        await connectToDatabase();

        // Targeted upsert ensuring setting_id is preserved
        const updateData: any = {
            updated_at: new Date(),
            setting_id: 'global_settings'
        };

        if (body.practice_mcqs_limit !== undefined) {
            const value = Number(body.practice_mcqs_limit);
            if (!Number.isInteger(value) || value < 1 || value > 500) {
                return NextResponse.json({ error: 'practice_mcqs_limit must be an integer from 1 to 500' }, { status: 400 });
            }
            updateData.practice_mcqs_limit = value;
        }
        if (body.ai_chatbot_active !== undefined) {
            updateData.ai_chatbot_active = !!body.ai_chatbot_active;
        }
        if (body.maintenance_mode !== undefined) {
            updateData.maintenance_mode = !!body.maintenance_mode;
        }

        const updatedSettings = await SystemSettings.findOneAndUpdate(
            { setting_id: 'global_settings' },
            { $set: updateData },
            {
                returnDocument: 'after',
                upsert: true,
                setDefaultsOnInsert: true,
                runValidators: true
            }
        ).lean();

        cachedSettings = updatedSettings;
        cachedSettingsAt = Date.now();

        revalidatePath('/', 'layout');
        revalidatePath('/admin/question-bank');
        revalidatePath('/practice');

        return NextResponse.json({ settings: updatedSettings }, {
            headers: {
                'Cache-Control': 'no-store',
            }
        });
    } catch (error: any) {
        console.error('[API/Settings] PATCH Sync Failure:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
