import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { MCQ } from '@/lib/mongodb/models';
import { computeMCQHash } from '@/lib/mongodb/mcq-utils';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const session = await getPortalSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!['super_admin', 'institution_admin'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { mcqs } = await req.json();
        await connectToDatabase();

        const details: any = {
            inFile: 0,
            exact: 0,
            similar: 0,
            items: []
        };

        const seenHashes = new Map<string, number>();
        const itemsToProcess: { idx: number, question: string, hash: string }[] = [];

        // 1. In-file check using robust hash
        mcqs.forEach((mcq: any, idx: number) => {
            const hash = computeMCQHash(mcq);
            if (seenHashes.has(hash)) {
                details.inFile++;
                details.items.push({
                    index: idx,
                    question: mcq.question,
                    type: 'in-file'
                });
            } else {
                seenHashes.set(hash, idx);
                itemsToProcess.push({ idx, question: mcq.question, hash });
            }
        });

        if (itemsToProcess.length === 0) return NextResponse.json(details);

        // 2. Exact DB check using hashes
        const dbHashes = await MCQ.find({
            question_hash: { $in: itemsToProcess.map(h => h.hash) }
        }).select('question_hash').lean();

        const existingHashSet = new Set(dbHashes.map(h => h.question_hash));

        itemsToProcess.forEach(h => {
            if (existingHashSet.has(h.hash)) {
                details.exact++;
                details.items.push({
                    index: h.idx,
                    question: h.question,
                    type: 'exact'
                });
            }
        });

        // 3. Similarity check (Simplified for MongoDB for now - could use Atlas Search later)
        // For now, we'll skip complex fuzzy text similarity in the basic migration
        // but it could be implemented with $text or Atlas Search.

        return NextResponse.json(details);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
