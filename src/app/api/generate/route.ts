import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { generateInitialLayout } from '@/lib/agents/orchestrator';

// Ensure background images upload directory exists
const IMAGES_DIR = path.join(process.cwd(), 'public', 'uploads', 'images');
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const intent = formData.get('intent') as string;
    const fontsJson = formData.get('fonts') as string; // JSON array of available fonts

    if (!file || !intent) {
      return NextResponse.json({ success: false, error: 'Missing image file or design intent.' }, { status: 400 });
    }

    // Parse fonts if passed
    let availableFonts = [];
    if (fontsJson) {
      try {
        availableFonts = JSON.parse(fontsJson);
      } catch (e) {
        console.error('Failed to parse fonts list in generate API:', e);
      }
    }

    const fileExtension = path.extname(file.name).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    if (!allowedExtensions.includes(fileExtension)) {
      return NextResponse.json({ success: false, error: `Unsupported image format: ${fileExtension}` }, { status: 400 });
    }

    const uniqueFilename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(IMAGES_DIR, uniqueFilename);

    // Write image file
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const relativeUrl = `/uploads/images/${uniqueFilename}`;
    const base64Data = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';

    // Execute the Orchestrator for initial layout coordinates
    const result = await generateInitialLayout(
      uniqueFilename,
      base64Data,
      mimeType,
      intent,
      availableFonts
    );

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      imageUrl: relativeUrl,
      vision: result.vision,
      concept: result.concept,
      copy: result.copy,
      typography: result.typography,
      layout: result.layout
    });

  } catch (error: any) {
    console.error('API /api/generate error:', error);
    return NextResponse.json({ success: false, error: error.message || error }, { status: 500 });
  }
}
