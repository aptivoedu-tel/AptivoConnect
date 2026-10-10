import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { CalendarEvent, University } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();
    
    // Ensure university model is loaded
    const __ = University;
    
    const userRole = (session.user as any).role;
    const userInstId = Number((session.user as any).institution_id);

    const filter: any = {};
    if (userRole === 'institution_admin' || userRole === 'student') {
        const university = await University.findOne({ id: userInstId });
        if (university) {
            filter.university_id = university._id;
        } else {
            return NextResponse.json([]);
        }
    }

    const events = await CalendarEvent.find(filter)
      .populate('university_id', 'name logo_url')
      .sort({ event_date: 1 })
      .lean();
      
    return NextResponse.json(events);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = (session.user as any).role;
    const userInstId = Number((session.user as any).institution_id);

    if (userRole !== 'super_admin' && userRole !== 'institution_admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectToDatabase();
    const body = await req.json();

    if (userRole === 'institution_admin') {
        const university = await University.findOne({ id: userInstId });
        if (!university || university._id.toString() !== body.university_id) {
            return NextResponse.json({ error: 'Forbidden: You can only create events for your own university.' }, { status: 403 });
        }
    }

    const event = new CalendarEvent(body);
    await event.save();
    return NextResponse.json(event, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
