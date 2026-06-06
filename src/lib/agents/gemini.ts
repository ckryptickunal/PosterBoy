import { GoogleGenAI } from '@google/genai';

// Retrieve keys from environment
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

if (!apiKey) {
  console.warn('WARNING: Gemini API Key is missing in environment variables. Calls will fail.');
}

export const ai = new GoogleGenAI({ apiKey });

// Defaulting to gemini-2.5-flash for speed, cost, and structured output reliability
export const DEFAULT_MODEL = 'gemini-2.5-flash';

export interface AgentCallParams {
  prompt: string;
  systemInstruction?: string;
  responseSchema?: any; // standard JSON Schema
  images?: Array<{ inlineData: { mimeType: string; data: string } }>; // Base64 images for multimodal vision
  temperature?: number;
  model?: string;
}

/**
 * Invokes the Gemini API with standard config, vision inputs, and strict JSON schemas.
 */
export async function callAgent(params: AgentCallParams): Promise<any> {
  const model = params.model || DEFAULT_MODEL;
  
  const contents: any[] = [];
  
  // Append images if available
  if (params.images && params.images.length > 0) {
    contents.push(...params.images.map(img => ({
      inlineData: {
        mimeType: img.inlineData.mimeType,
        data: img.inlineData.data
      }
    })));
  }
  
  // Append text prompt
  contents.push({ text: params.prompt });

  const config: any = {
    temperature: params.temperature ?? 0.2,
  };

  if (params.systemInstruction) {
    config.systemInstruction = params.systemInstruction;
  }

  if (params.responseSchema) {
    config.responseMimeType = 'application/json';
    config.responseSchema = params.responseSchema;
  }

  // Support retries for transient API errors
  let lastError: any = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config,
      });

      const text = response.text;
      if (!text) {
        throw new Error('Gemini API returned an empty response text.');
      }

      if (params.responseSchema) {
        let cleanText = text.trim();
        // Strip markdown code blocks if the model wrapped them anyway
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.substring(7, cleanText.length - 3).trim();
        } else if (cleanText.startsWith('```')) {
          cleanText = cleanText.substring(3, cleanText.length - 3).trim();
        }
        
        try {
          return JSON.parse(cleanText);
        } catch (parseErr) {
          console.warn(`JSON Parse failed on attempt ${attempt}. Content: ${cleanText}`);
          throw new Error(`Invalid JSON syntax returned from model: ${cleanText}`);
        }
      }

      return text;
    } catch (err: any) {
      lastError = err;
      console.warn(`Gemini call failed (attempt ${attempt}/3). Error: ${err.message || err}`);
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw new Error(`Failed after 3 attempts calling Gemini Agent. Last error: ${lastError?.message || lastError}`);
}

export default callAgent;
