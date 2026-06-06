import { create } from 'zustand';
import { VisionAnalysis, CopywriterOutput, TypographyTokens, LayoutOutput, LayoutElement, CriticOutput } from '@/types/agents';

export interface CritiqueLog {
  iteration: number;
  score: number;
  issues: string[];
  fixes: string[];
  layout: LayoutOutput;
}

export interface ActiveJobState {
  id: string | null;
  status: 'idle' | 'analyzing' | 'designing' | 'copywriting' | 'typography' | 'arranging' | 'rendering' | 'critiquing' | 'completed' | 'failed';
  imageUrl: string | null;
  vision: VisionAnalysis | null;
  concept: any | null;
  copy: CopywriterOutput | null;
  typography: TypographyTokens | null;
  layout: LayoutOutput | null;
  critiqueLogs: CritiqueLog[];
  currentIteration: number;
  score: number | null;
  logs: string[]; // Telemetry execution traces
}

interface PosterBoyStore {
  activeJob: ActiveJobState;
  fonts: any[];
  layoutMemory: any[];
  jobsHistory: any[];
  rulesText: string;
  rulesVersion: number | null;
  isInitialLoading: boolean;

  // Actions
  fetchInitialData: () => Promise<void>;
  updateConstitution: (newRules: string) => Promise<boolean>;
  uploadFont: (file: File, familyName: string, category: string) => Promise<boolean>;
  startDesignPipeline: (imageFile: File, intent: string) => Promise<void>;
  updateElement: (id: string, updates: Partial<LayoutElement>) => void;
  runCritiqueLoop: (screenshotBase64: string) => Promise<void>;
  approveDesign: () => Promise<void>;
  resetJob: () => void;
}

const initialJobState: ActiveJobState = {
  id: null,
  status: 'idle',
  imageUrl: null,
  vision: null,
  concept: null,
  copy: null,
  typography: null,
  layout: null,
  critiqueLogs: [],
  currentIteration: 0,
  score: null,
  logs: []
};

export const useStore = create<PosterBoyStore>((set, get) => ({
  activeJob: { ...initialJobState },
  fonts: [],
  layoutMemory: [],
  jobsHistory: [],
  rulesText: '',
  rulesVersion: null,
  isInitialLoading: false,

  fetchInitialData: async () => {
    set({ isInitialLoading: true });
    try {
      // 1. Fetch fonts
      const fontRes = await fetch('/api/fonts');
      const fontData = await fontRes.json();
      
      // 2. Fetch layout memory & history
      const layoutRes = await fetch('/api/layouts');
      const layoutData = await layoutRes.json();

      // 3. Fetch constitution
      const constRes = await fetch('/api/constitution');
      const constData = await constRes.json();

      set({
        fonts: fontData.success ? fontData.fonts : [],
        layoutMemory: layoutData.success ? layoutData.layouts : [],
        jobsHistory: layoutData.success ? layoutData.jobs : [],
        rulesText: constData.success ? constData.rulesText : '',
        rulesVersion: constData.success ? constData.version : null,
        isInitialLoading: false
      });
    } catch (err) {
      console.error('Failed to load initial data:', err);
      set({ isInitialLoading: false });
    }
  },

  updateConstitution: async (newRules: string) => {
    try {
      const res = await fetch('/api/constitution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rulesText: newRules })
      });
      const data = await res.json();
      if (data.success) {
        set({ rulesText: newRules, rulesVersion: data.version });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update constitution:', err);
      return false;
    }
  },

  uploadFont: async (file: File, familyName: string, category: string) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('familyName', familyName);
      formData.append('category', category);

      const res = await fetch('/api/fonts', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        // Refresh font list
        const fontRes = await fetch('/api/fonts');
        const fontData = await fontRes.json();
        set({ fonts: fontData.success ? fontData.fonts : [] });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to upload font:', err);
      return false;
    }
  },

  startDesignPipeline: async (imageFile: File, intent: string) => {
    set({
      activeJob: {
        ...initialJobState,
        status: 'analyzing',
        logs: [
          `[${new Date().toLocaleTimeString()}] Pipeline triggered.`,
          `[${new Date().toLocaleTimeString()}] Target intent: "${intent}"`,
          `[${new Date().toLocaleTimeString()}] Uploading background image...`
        ]
      }
    });

    try {
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('intent', intent);
      // Pass list of custom fonts for typography matching
      formData.append('fonts', JSON.stringify(get().fonts));

      // 1. Trigger initial generation
      set(state => ({
        activeJob: {
          ...state.activeJob,
          logs: [...state.activeJob.logs, `[${new Date().toLocaleTimeString()}] Image uploaded. Launching Vision Analysis (Agent 1)...`]
        }
      }));

      const res = await fetch('/api/generate', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      set(state => ({
        activeJob: {
          ...state.activeJob,
          id: data.jobId,
          status: 'rendering',
          imageUrl: data.imageUrl,
          vision: data.vision,
          concept: data.concept,
          copy: data.copy,
          typography: data.typography,
          layout: data.layout,
          logs: [
            ...state.activeJob.logs,
            `[${new Date().toLocaleTimeString()}] Vision Analysis Complete. Class: "${data.vision.designStyleClassification}", Aspect: "${data.vision.aspectRatio}"`,
            `[${new Date().toLocaleTimeString()}] Creative Concept Selected (Agent 2): "${data.concept.name} - ${data.concept.visualStrategy}"`,
            `[${new Date().toLocaleTimeString()}] Copy Generated (Agent 3): "${data.copy.headline}"`,
            `[${new Date().toLocaleTimeString()}] Typography Selection (Agent 4): Display "${data.typography.displayFont}" paired with Body "${data.typography.bodyFont}"`,
            `[${new Date().toLocaleTimeString()}] Initial Coordinate Placement Map Generated (Agent 5).`,
            `[${new Date().toLocaleTimeString()}] Rendering design on client canvas...`
          ]
        }
      }));

    } catch (err: any) {
      console.error(err);
      set(state => ({
        activeJob: {
          ...state.activeJob,
          status: 'failed',
          logs: [...state.activeJob.logs, `[ERROR ${new Date().toLocaleTimeString()}] ${err.message || err}`]
        }
      }));
    }
  },

  updateElement: (id: string, updates: Partial<LayoutElement>) => {
    set(state => {
      if (!state.activeJob.layout) return state;
      const updatedElements = state.activeJob.layout.elements.map(el => {
        if (el.id === id) {
          return { ...el, ...updates };
        }
        return el;
      });
      return {
        activeJob: {
          ...state.activeJob,
          layout: { elements: updatedElements },
          logs: [
            ...state.activeJob.logs,
            `[HUMAN OVERRIDE] Adjusted '${id}' properties: ${JSON.stringify(updates)}`
          ]
        }
      };
    });
  },

  runCritiqueLoop: async (screenshotBase64: string) => {
    const job = get().activeJob;
    if (!job.id || !job.layout || !job.vision) return;

    const nextIteration = job.currentIteration + 1;
    set(state => ({
      activeJob: {
        ...state.activeJob,
        status: 'critiquing',
        currentIteration: nextIteration,
        logs: [
          ...state.activeJob.logs,
          `[${new Date().toLocaleTimeString()}] Capture canvas screenshot. Submitting to Critique Engine (Iteration #${nextIteration}/3)...`
        ]
      }
    }));

    try {
      const res = await fetch('/api/critique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          iteration: nextIteration,
          layout: job.layout,
          screenshot: screenshotBase64,
          vision: job.vision
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Critique API failed.');
      }

      const critiqueLog: CritiqueLog = {
        iteration: nextIteration,
        score: data.score,
        issues: data.issues,
        fixes: data.fixes,
        layout: data.repairedLayout || job.layout
      };

      const newLogs = [
        ...get().activeJob.logs,
        `[${new Date().toLocaleTimeString()}] Visual critique completed. Core score: ${data.score}/100.`,
        ...data.issues.map((iss: string) => `[CRITIQUE ISSUE] - ${iss}`),
        ...(data.fixes.length > 0 ? [`[RECOMMENDED REPAIRS]:`, ...data.fixes.map((fx: string) => `  * ${fx}`)] : [])
      ];

      if (data.status === 'repaired' && data.repairedLayout) {
        newLogs.push(`[${new Date().toLocaleTimeString()}] Repair Agent (Agent 7) successfully repositioned layout coordinates. Re-rendering...`);
        set(state => ({
          activeJob: {
            ...state.activeJob,
            status: 'rendering',
            layout: data.repairedLayout,
            score: data.score,
            critiqueLogs: [...state.activeJob.critiqueLogs, critiqueLog],
            logs: newLogs
          }
        }));
      } else {
        newLogs.push(`[${new Date().toLocaleTimeString()}] Pipeline completed! Score: ${data.score}/100.`);
        set(state => ({
          activeJob: {
            ...state.activeJob,
            status: 'completed',
            score: data.score,
            critiqueLogs: [...state.activeJob.critiqueLogs, critiqueLog],
            logs: newLogs
          }
        }));

        // Refresh database history
        const layoutRes = await fetch('/api/layouts');
        const layoutData = await layoutRes.json();
        if (layoutData.success) {
          set({
            layoutMemory: layoutData.layouts,
            jobsHistory: layoutData.jobs
          });
        }
      }

    } catch (err: any) {
      console.error(err);
      set(state => ({
        activeJob: {
          ...state.activeJob,
          status: 'failed',
          logs: [...state.activeJob.logs, `[CRITIQUE LOOP ERROR] ${err.message || err}`]
        }
      }));
    }
  },

  approveDesign: async () => {
    const job = get().activeJob;
    if (!job.id || !job.layout || !job.vision) return;

    try {
      set(state => ({
        activeJob: {
          ...state.activeJob,
          logs: [...state.activeJob.logs, `[${new Date().toLocaleTimeString()}] Design manually approved. Indexing to Layout Memory database...`]
        }
      }));

      const style = job.vision.designStyleClassification || 'minimal';
      const imageType = job.vision.productRegions.length > 0 ? job.vision.productRegions[0].label || 'product' : 'general';

      await fetch('/api/layouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageType,
          goal: 'user_approval',
          style,
          score: job.score || 95,
          layoutJson: JSON.stringify(job.layout)
        })
      });

      // Refresh layout memory
      const layoutRes = await fetch('/api/layouts');
      const layoutData = await layoutRes.json();
      if (layoutData.success) {
        set({
          layoutMemory: layoutData.layouts,
          jobsHistory: layoutData.jobs
        });
      }

      set(state => ({
        activeJob: {
          ...state.activeJob,
          logs: [...state.activeJob.logs, `[${new Date().toLocaleTimeString()}] Indexed successfully. Ready for export.`].filter(Boolean)
        }
      }));

    } catch (err: any) {
      console.error('Failed to save to memory:', err);
    }
  },

  resetJob: () => {
    set({ activeJob: { ...initialJobState } });
  }
}));
