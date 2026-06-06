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
  telemetry?: {
    pipelineRunId: string;
    agentRunId: string;
  };
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

      // Record token usage if telemetry is specified
      if (params.telemetry) {
        try {
          const usage = response.usageMetadata;
          let promptTokens = usage?.promptTokenCount ?? 0;
          let completionTokens = usage?.candidatesTokenCount ?? 0;

          // Local token estimator fallback (1 token approx 4 characters)
          if (promptTokens === 0 && completionTokens === 0) {
            promptTokens = Math.ceil(params.prompt.length / 4) + (params.systemInstruction ? Math.ceil(params.systemInstruction.length / 4) : 0);
            completionTokens = Math.ceil(text.length / 4);
          }

          const { db, estimateCost } = require('../telemetry');
          const totalTokens = promptTokens + completionTokens;
          const cost = estimateCost(model, promptTokens, completionTokens);
          const now = new Date().toISOString();

          db.prepare(`
            INSERT INTO token_usage (pipeline_run_id, agent_run_id, model_name, prompt_tokens, completion_tokens, total_tokens, estimated_cost, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(params.telemetry.pipelineRunId, params.telemetry.agentRunId, model, promptTokens, completionTokens, totalTokens, cost, now);
        } catch (telemetryErr) {
          console.error('Failed to log telemetry token usage inside callAgent:', telemetryErr);
        }
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
      
      // Log retry event if telemetry available
      if (params.telemetry) {
        try {
          const { recordAgentEvent } = require('../telemetry');
          recordAgentEvent(
            params.telemetry.pipelineRunId,
            'Gemini Client',
            'retry',
            `Attempt ${attempt} failed: ${err.message || err}. Retrying...`
          );
        } catch (_) {}
      }

      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw new Error(`Failed after 3 attempts calling Gemini Agent. Last error: ${lastError?.message || lastError}`);
}

export default callAgent;
