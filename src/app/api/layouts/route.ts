import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'all';

    if (type === 'memory') {
      const layouts = db.prepare('SELECT * FROM layout_memory ORDER BY score DESC, id DESC').all();
      return NextResponse.json({ success: true, layouts });
    }

    if (type === 'jobs') {
      const jobs = db.prepare('SELECT * FROM jobs ORDER BY created_at DESC').all();
      return NextResponse.json({ success: true, jobs });
    }

    // Default: Return both
    const layouts = db.prepare('SELECT * FROM layout_memory ORDER BY score DESC, id DESC LIMIT 20').all();
    const jobs = db.prepare('SELECT * FROM jobs ORDER BY created_at DESC LIMIT 20').all();

    return NextResponse.json({
      success: true,
      layouts,
      jobs
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageType, goal, style, score, layoutJson } = body as {
      imageType: string;
      goal: string;
      style: string;
      score: number;
      layoutJson: string; // JSON string of coordinates elements
    };

    if (!imageType || !goal || !style || !score || !layoutJson) {
      return NextResponse.json({ success: false, error: 'Missing imageType, goal, style, score, or layoutJson.' }, { status: 400 });
    }

    db.prepare(`
      INSERT INTO layout_memory (image_type, goal, style, headline_strategy, score, layout_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(imageType, goal, style, 'manual_override', score, layoutJson, new Date().toISOString());

    return NextResponse.json({ success: true, message: 'Layout added to memory successfully.' });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
