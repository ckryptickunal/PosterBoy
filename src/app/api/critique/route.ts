import { NextRequest, NextResponse } from 'next/server';
import { processCritiqueAndRepair } from '@/lib/agents/orchestrator';
import { LayoutOutput, VisionAnalysis } from '@/types/agents';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, iteration, layout, screenshot, vision } = body as {
      jobId: string;
      iteration: number;
      layout: LayoutOutput;
      screenshot: string; // Base64 string of the canvas rendering
      vision: VisionAnalysis;
    };

    if (!jobId || iteration === undefined || !layout || !screenshot || !vision) {
      return NextResponse.json({ success: false, error: 'Missing jobId, iteration, layout, screenshot, or vision.' }, { status: 400 });
    }

    // Strip prefix from base64 if present (e.g. data:image/png;base64,)
    let cleanScreenshot = screenshot;
    if (screenshot.startsWith('data:image')) {
      const parts = screenshot.split(',');
      if (parts.length > 1) {
        cleanScreenshot = parts[1];
      }
    }

    // Run the critique & repair loop
    const result = await processCritiqueAndRepair(
      jobId,
      iteration,
      layout,
      cleanScreenshot,
      vision
    );

    return NextResponse.json({
      success: true,
      score: result.score,
      issues: result.issues,
      fixes: result.fixes,
      repairedLayout: result.repairedLayout,
      status: result.status
    });

  } catch (error: any) {
    console.error('API /api/critique error:', error);
    return NextResponse.json({ success: false, error: error.message || error }, { status: 500 });
  }
}
