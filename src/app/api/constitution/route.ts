import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const activeConst = db.prepare(`
      SELECT version, rules_text, created_at 
      FROM constitutions 
      WHERE active = 1 
      ORDER BY version DESC LIMIT 1
    `).get() as { version: number; rules_text: string; created_at: string };

    if (!activeConst) {
      return NextResponse.json({ success: false, error: 'No active constitution rules found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      version: activeConst.version,
      rulesText: activeConst.rules_text,
      createdAt: activeConst.created_at
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rulesText } = body as { rulesText: string };

    if (!rulesText || rulesText.trim() === '') {
      return NextResponse.json({ success: false, error: 'Rules text cannot be empty.' }, { status: 400 });
    }

    // Deactivate previous active constitutions
    db.prepare('UPDATE constitutions SET active = 0').run();

    // Insert new version as active
    const info = db.prepare(`
      INSERT INTO constitutions (rules_text, active, created_at)
      VALUES (?, 1, ?)
    `).run(rulesText, new Date().toISOString());

    return NextResponse.json({
      success: true,
      version: info.lastInsertRowid,
      message: `Constitution updated successfully to Version ${info.lastInsertRowid}.`
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
