import { NextRequest, NextResponse } from 'next/server';
import { processCritiqueAndRepair } from '@/lib/agents/orchestrator';
import { WebLayoutOutput, VisionAnalysis } from '@/types/agents';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, iteration, layout, screenshot, vision } = body as {
      jobId: string;
      iteration: number;
      layout: WebLayoutOutput;
      screenshot: string;
      vision: VisionAnalysis;
    };

    if (!jobId || iteration === undefined || !layout || !screenshot || !vision) {
      return NextResponse.json({ success: false, error: 'Missing jobId, iteration, layout, screenshot, or vision.' }, { status: 400 });
    }

    // Strip data URI prefix if present
    const cleanScreenshot = screenshot.startsWith('data:image')
      ? screenshot.split(',')[1] ?? screenshot
      : screenshot;

    const result = await processCritiqueAndRepair(jobId, iteration, layout, cleanScreenshot, vision);

    return NextResponse.json({
      success:        true,
      score:          result.score,
      bestScore:      result.bestScore,
      issues:         result.issues,
      fixes:          result.fixes,

      repairedLayout: result.repairedLayout,
      status:         result.status,
      iterationsRun:  result.iterationsRun,
    });

  } catch (error: any) {
    console.error('API /api/critique error:', error);
    return NextResponse.json({ success: false, error: error.message || error }, { status: 500 });
  }
}
