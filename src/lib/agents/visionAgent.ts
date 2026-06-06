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
      description: 'Bounding boxes surrounding core products or items.' 
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
    // Evolved Visual Pattern Fields
    subjectCount: { type: 'INTEGER', description: 'Number of distinct foreground subjects or products detected in the image.' },
    negativeSpaceRatio: { type: 'NUMBER', description: 'Estimate of the negative space ratio in the image (0.0 to 1.0).' },
    visualComplexity: { type: 'STRING', enum: ['low', 'medium', 'high'], description: 'Visual clutter or pattern complexity level.' },
    subjectDominance: { type: 'STRING', enum: ['low', 'medium', 'high'], description: 'Scale/dominance of the main subject/product.' },
    imageContrast: { type: 'STRING', enum: ['low', 'medium', 'high'], description: 'Contrast level between main subject and background.' },
    compositionType: { type: 'STRING', enum: ['minimalist', 'rule_of_thirds', 'symmetric', 'asymmetric', 'diagonal', 'centered'], description: 'Core composition pattern.' },
    readingFlowOpportunities: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Natural eye paths / layout flows available, e.g. ["top_left_to_bottom_right", "z_pattern", "central_focal"].'
    },
    visualWeightMap: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          regionType: { type: 'STRING', enum: ['face', 'product', 'object', 'background', 'negative_space'] },
          importanceScore: { type: 'INTEGER', description: 'Importance value from 0 (background) to 100 (focal subject)' },
          attentionScore: { type: 'INTEGER', description: 'Attention-grabbing visual weight from 0 to 100' },
          visualDensity: { type: 'INTEGER', description: 'Texture or pattern density from 0 to 100' },
          protectionPriority: { type: 'INTEGER', description: 'Required protection level from 0 (can place text on top) to 100 (never overlap)' }
        },
        required: ['regionType', 'importanceScore', 'attentionScore', 'visualDensity', 'protectionPriority']
      },
      description: 'Visual weight map: importance and attention profile for each structural element of the image.'
    },
    negativeSpaceDiscovery: {
      type: 'OBJECT',
      properties: {
        candidateTextZones: { type: 'ARRAY', items: RegionSchema, description: 'Zones suitable for placing primary headlines and text elements.' },
        candidateLogoZones: { type: 'ARRAY', items: RegionSchema, description: 'Zones suitable for logo placement.' },
        candidateCTAZones: { type: 'ARRAY', items: RegionSchema, description: 'Zones suitable for call-to-action buttons.' }
      },
      required: ['candidateTextZones', 'candidateLogoZones', 'candidateCTAZones'],
      description: 'Specific empty coordinate boxes for text, logo, and CTA.'
    },
    attentionHeatmap: {
      type: 'ARRAY',
      items: {
        type: 'ARRAY',
        items: { type: 'INTEGER', description: 'Attention score 0-100 for this grid cell' }
      },
      description: '5x5 grid of attention scores (0-100). Row 0 = top, Col 0 = left. High values = viewer eye is drawn here. Based on visual saliency, contrast, faces, and subject placement.'
    },
    negativeSpaceMap: {
      type: 'ARRAY',
      items: {
        type: 'ARRAY',
        items: { type: 'INTEGER', description: 'Openness score 0-100 for this grid cell' }
      },
      description: '5x5 grid of openness/emptiness scores (0-100). High values = clean, uncluttered space ideal for text. Low values = visually busy areas.'
    },
    safeTextZoneRanking: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          zone: { type: 'STRING', enum: ['top-left', 'top-center', 'top-right', 'center-left', 'center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'], description: 'Which of the 9 placement zones' },
          confidence: { type: 'INTEGER', description: 'Confidence 0-100 that text placed here will be readable and non-obstructive' },
          reason: { type: 'STRING', description: 'Why this zone is safe or unsafe for text' }
        },
        required: ['zone', 'confidence', 'reason']
      },
      description: 'All 9 placement zones ranked by safety for text overlay.'
    },
    compositionAnalysis: {
      type: 'OBJECT',
      properties: {
        primaryFocalPoint: { type: 'STRING', description: 'Where the eye lands first (e.g. "center-right face", "top-left product")' },
        naturalReadingFlow: { type: 'STRING', description: 'The natural eye movement path across the image (e.g. "Z-pattern from top-left to bottom-right")' },
        visualTension: { type: 'STRING', description: 'Where visual tension exists (contrasts, edges, directional lines)' },
        emotionalTone: { type: 'STRING', description: 'The emotional feeling of the image (e.g. "warm luxury", "cool minimalism", "energetic boldness")' },
        recommendedContentPlacement: { type: 'STRING', description: 'Where content should go to complement rather than compete with the image' }
      },
      required: ['primaryFocalPoint', 'naturalReadingFlow', 'visualTension', 'emotionalTone', 'recommendedContentPlacement']
    }
  },
  required: [
    'width', 'height', 'aspectRatio', 'dominantColors',
    'faceRegions', 'productRegions', 'backgroundRegions',
    'emptyRegions', 'safeTextRegions', 'logoSafeRegions',
    'compositionStyle', 'visualDensity', 'subjectCount',
    'negativeSpaceRatio', 'visualComplexity', 'subjectDominance',
    'imageContrast', 'compositionType', 'readingFlowOpportunities',
    'visualWeightMap', 'negativeSpaceDiscovery',
    'attentionHeatmap', 'negativeSpaceMap', 'safeTextZoneRanking', 'compositionAnalysis'
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
- Do NOT classify or refer to the industry or business category (like jewellery, fashion, food, etc.). Instead focus on abstract visual structure, negative space ratio, subject counts, and composition patterns.
Return strictly JSON conforming to the schema. Do not write markdown blocks or text before/after.`;

  const prompt = `Analyze this image. Identify aspect ratios, dominant colors, and outline bounding boxes (x, y, width, height in 0-100 percentage values) for faces, products, empty negative spaces, background zones, safe text margins, and logo-safe slots. Assess subject count, negative space ratio, complexity, dominance, contrast, composition, and natural eye flow paths.`;

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
