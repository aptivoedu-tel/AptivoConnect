import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import { CalendarEvent, University } from '@/lib/mongodb/models';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    // Ensure university model is loaded
    const __ = University;
    
    // Only return published events for students
    const events = await CalendarEvent.find({ is_published: true })
      .populate('university_id', 'name logo_url')
      .sort({ event_date: 1 })
      .lean();
      
    return NextResponse.json(events);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
