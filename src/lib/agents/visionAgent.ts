import { callAgent } from './gemini';
import { VisionAnalysis } from '@/types/agents';

const RegionSchema = {
  type: 'OBJECT',
  properties: {
    x: { type: 'NUMBER', description: 'Left coordinate of region boundary as a percentage (0-100)' },
    y: { type: 'NUMBER', description: 'Top coordinate of region boundary as a percentage (0-100)' },
    width: { type: 'NUMBER', description: 'Width of the region as a percentage of canvas width (0-100)' },
    height: { type: 'NUMBER', description: 'Height of the region as a percentage of canvas height (0-100)' },
    label: { type: 'STRING', description: 'Identifying label for the region (e.g. face, diamond-necklace, watch)' }
  },
  required: ['x', 'y', 'width', 'height']
};

const VisionAnalysisSchema = {
  type: 'OBJECT',
  properties: {
    width: { type: 'INTEGER', description: 'Calculated or native width of the image in pixels' },
    height: { type: 'INTEGER', description: 'Calculated or native height of the image in pixels' },
    aspectRatio: { type: 'STRING', description: 'Image aspect ratio, e.g. "4:5", "1:1", "16:9"' },
    dominantColors: { 
      type: 'ARRAY', 
      items: { type: 'STRING' }, 
      description: 'Dominant colors in hex format (e.g. ["#0f172a", "#f8fafc"])' 
    },
    faceRegions: { 
      type: 'ARRAY', 
      items: RegionSchema, 
      description: 'Bounding boxes surrounding any human faces. Must be extremely accurate.' 
    },
    productRegions: { 
      type: 'ARRAY', 
      items: RegionSchema, 
      description: 'Bounding boxes surrounding core products or items (jewellery, clothing, packshots).' 
    },
    backgroundRegions: { 
      type: 'ARRAY', 
      items: RegionSchema, 
      description: 'Broad background zones that can serve as texture/context' 
    },
    emptyRegions: { 
      type: 'ARRAY', 
      items: RegionSchema, 
      description: 'Uncluttered, low detail, negative space zones ideal for copy overlay.' 
    },
    safeTextRegions: { 
      type: 'ARRAY', 
      items: RegionSchema, 
      description: 'Suggested regions for typography overlays.' 
    },
    logoSafeRegions: { 
      type: 'ARRAY', 
      items: RegionSchema, 
      description: 'Safe zones (usually corners or low detail patches) for logo placements.' 
    },
    compositionStyle: { type: 'STRING', description: 'e.g. "symmetric", "rule of thirds", "asymmetric", "minimalist"' },
    visualDensity: { type: 'STRING', description: 'e.g. "low", "medium", "high"' },
    designStyleClassification: { type: 'STRING', description: 'e.g. "luxury", "minimalist", "editorial", "fashion", "tech", "brutalist"' }
  },
  required: [
    'width', 'height', 'aspectRatio', 'dominantColors',
    'faceRegions', 'productRegions', 'backgroundRegions',
    'emptyRegions', 'safeTextRegions', 'logoSafeRegions',
    'compositionStyle', 'visualDensity', 'designStyleClassification'
  ]
};

/**
 * Vision Agent: Spatially segments the canvas and classifies styling properties.
 */
export async function runVisionAgent(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<VisionAnalysis> {
  const systemInstruction = `You are a professional Vision Analysis Agent for an autonomous design system.
Your goal is to perform a spatial segmentation analysis on the provided image and return coordinates as percentages from 0 to 100 relative to the canvas.
- (0, 0) is top-left, (100, 100) is bottom-right.
- Be very conservative with faceRegions and productRegions; trace their bounding boxes accurately.
- Empty regions are flat, low-detail areas where text can sit without clutter.
- Dominant colors must be hex codes.
Return strictly JSON conforming to the schema. Do not write markdown blocks or text before/after.`;

  const prompt = `Analyze this image. Identify aspect ratios, dominant colors, and outline bounding boxes (x, y, width, height in 0-100 percentage values) for faces, products, empty negative spaces, background zones, safe text margins, and logo-safe slots.`;

  const result = await callAgent({
    prompt,
    systemInstruction,
    images: [{
      inlineData: {
        mimeType,
        data: imageBase64
      }
    }],
    responseSchema: VisionAnalysisSchema,
    temperature: 0.1
  });

  return result as VisionAnalysis;
}

export default runVisionAgent;
