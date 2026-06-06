import { spawn } from 'child_process';
import path from 'path';
import { LayoutElement, Region } from '@/types/agents';

export interface GeometryInput {
  elements: LayoutElement[];
  faceRegions: Region[];
  productRegions: Region[];
  margins?: number;
}

export interface GeometryOutput {
  score: number;
  issues: string[];
  fixes: string[];
  faceViolations: Array<{ element: string; region: string; overlap_ratio: number }>;
  productViolations: Array<{ element: string; region: string; overlap_ratio: number }>;
  marginViolations: Array<{ element: string; details: string[] }>;
  textOverlaps: Array<{ element_a: string; element_b: string; overlap_ratio: number }>;
  error?: string;
}

export function runGeometryHelper(input: GeometryInput): Promise<GeometryOutput> {
  return new Promise((resolve) => {
    const pythonScript = path.join(process.cwd(), 'src', 'lib', 'python', 'geometry_helper.py');
    
    // Spawn Python3 process
    const py = spawn('python3', [pythonScript]);

    let stdoutData = '';
    let stderrData = '';

    py.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    py.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    py.on('close', (code) => {
      if (code !== 0) {
        return resolve({
          score: 0,
          issues: [`Geometry helper failed with code ${code}: ${stderrData.trim()}`],
          fixes: [],
          faceViolations: [],
          productViolations: [],
          marginViolations: [],
          textOverlaps: []
        });
      }

      try {
        const result = JSON.parse(stdoutData) as GeometryOutput;
        resolve(result);
      } catch (err) {
        resolve({
          score: 0,
          issues: ['Failed to parse python geometry response JSON', stdoutData],
          fixes: [],
          faceViolations: [],
          productViolations: [],
          marginViolations: [],
          textOverlaps: []
        });
      }
    });

    py.on('error', (err) => {
      resolve({
        score: 0,
        issues: [`Failed to spawn python interpreter: ${err.message}`],
        fixes: [],
        faceViolations: [],
        productViolations: [],
        marginViolations: [],
        textOverlaps: []
      });
    });

    // Write input JSON and end stdin
    py.stdin.write(JSON.stringify(input));
    py.stdin.end();
  });
}
export default runGeometryHelper;
