import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import db from '@/lib/db';

// Ensure the local font uploads directory exists inside public/
const FONTS_DIR = path.join(process.cwd(), 'public', 'uploads', 'fonts');
if (!fs.existsSync(FONTS_DIR)) {
  fs.mkdirSync(FONTS_DIR, { recursive: true });
}

export async function GET() {
  try {
    const fonts = db.prepare('SELECT * FROM fonts ORDER BY id DESC').all();
    return NextResponse.json({ success: true, fonts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const familyName = formData.get('familyName') as string;
    const category = formData.get('category') as string; // 'display' | 'body'

    if (!file || !familyName || !category) {
      return NextResponse.json({ success: false, error: 'Missing file, familyName or category.' }, { status: 400 });
    }

    const fileExtension = path.extname(file.name).toLowerCase();
    const allowedExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
    if (!allowedExtensions.includes(fileExtension)) {
      return NextResponse.json({ success: false, error: `Invalid format ${fileExtension}. Supported formats: TTF, OTF, WOFF, WOFF2.` }, { status: 400 });
    }

    const cleanFilename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(FONTS_DIR, cleanFilename);

    // Write file binary payload
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const relativeUrl = `/uploads/fonts/${cleanFilename}`;

    // Save details to database
    db.prepare(`
      INSERT INTO fonts (name, file_path, family_name, category, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(file.name, relativeUrl, familyName, category, new Date().toISOString());

    return NextResponse.json({
      success: true,
      font: {
        name: file.name,
        file_path: relativeUrl,
        familyName,
        category
      }
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
