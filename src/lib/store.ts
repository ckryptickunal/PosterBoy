import { create } from 'zustand';
import {
  VisionAnalysis,
  CopywriterOutput,
  TypographyTokens,
  WebLayoutOutput,
  DesignStrategy,
} from '@/types/agents';

export interface CritiqueLog {
  iteration: number;
  score: number;
  issues: string[];
  fixes: string[];
  layout: WebLayoutOutput;
}

export interface EvolutionState {
  totalGenerations: number;
  totalCandidatesEvaluated: number;
  scoreHistory: number[];
  bestScore: number;
}

export interface ActiveJobState {
  id: string | null;
  status: 'idle' | 'analyzing' | 'designing' | 'copywriting' | 'typography' | 'arranging' | 'evolving' | 'rendering' | 'critiquing' | 'completed' | 'failed';
  imageUrl: string | null;
  vision: VisionAnalysis | null;
  strategy: DesignStrategy | null;
  copy: CopywriterOutput | null;
  typography: TypographyTokens | null;
  layout: WebLayoutOutput | null;
  html: string | null;
  evolution: EvolutionState | null;
  critiqueLogs: CritiqueLog[];
  currentIteration: number;
  score: number | null;
  logs: string[];
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
  runCritiqueLoop: (screenshotBase64: string) => Promise<void>;
  approveDesign: () => Promise<void>;
  resetJob: () => void;
}

const initialJobState: ActiveJobState = {
  id: null,
  status: 'idle',
  imageUrl: null,
  vision: null,
  strategy: null,
  copy: null,
  typography: null,
  layout: null,
  html: null,
  evolution: null,
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
      const [fontRes, layoutRes, constRes] = await Promise.all([
        fetch('/api/fonts'),
        fetch('/api/layouts'),
        fetch('/api/constitution'),
      ]);
      const [fontData, layoutData, constData] = await Promise.all([
        fontRes.json(),
        layoutRes.json(),
        constRes.json(),
      ]);

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
      formData.append('fonts', JSON.stringify(get().fonts));

      set(state => ({
        activeJob: {
          ...state.activeJob,
          logs: [...state.activeJob.logs, `[${new Date().toLocaleTimeString()}] Image uploaded. Launching Vision Analysis...`]
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

      const evo = data.evolution;
      set(state => ({
        activeJob: {
          ...state.activeJob,
          id: data.jobId,
          status: 'rendering',
          imageUrl: data.imageUrl,
          vision: data.vision,
          strategy: data.strategy,
          copy: data.copy,
          typography: data.typography,
          layout: data.layout,
          html: data.html,
          evolution: evo || null,
          score: evo?.bestScore || null,
          logs: [
            ...state.activeJob.logs,
            `Analyzing composition — ${data.vision.compositionType}, ${data.vision.aspectRatio}`,
            `Evaluating visual hierarchy — "${data.strategy?.recommendedStrategy}" · ${data.strategy?.visualTone}`,
            `Crafting copy — "${data.copy.headline}"`,
            `Selecting typography — ${data.typography.displayFont} / ${data.typography.bodyFont}`,
            ...(evo ? [
              `Exploring ${evo.totalCandidatesEvaluated} layout directions across ${evo.totalGenerations} generations`,
              `Best composition score: ${evo.bestScore}/100 — ${data.layout.strategy}`,
            ] : [
              `Layout: ${data.layout.strategy}`,
            ]),
            `Rendering final composition...`
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
          `[${new Date().toLocaleTimeString()}] Capturing preview. Submitting to Critic (Iteration #${nextIteration})...`
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
        layout: job.layout
      };

      const newLogs = [
        ...get().activeJob.logs,
        `[${new Date().toLocaleTimeString()}] Critique completed. Score: ${data.score}/100.`,
        ...data.issues.map((iss: string) => `[ISSUE] ${iss}`),
        ...(data.fixes.length > 0 ? [`[FIXES]:`, ...data.fixes.map((fx: string) => `  * ${fx}`)] : [])
      ];

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

      // Refresh history
      const layoutRes = await fetch('/api/layouts');
      const layoutData = await layoutRes.json();
      if (layoutData.success) {
        set({
          layoutMemory: layoutData.layouts,
          jobsHistory: layoutData.jobs
        });
      }

    } catch (err: any) {
      console.error(err);
      set(state => ({
        activeJob: {
          ...state.activeJob,
          status: 'failed',
          logs: [...state.activeJob.logs, `[CRITIQUE ERROR] ${err.message || err}`]
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
          logs: [...state.activeJob.logs, `[${new Date().toLocaleTimeString()}] Design approved. Saving to memory...`]
        }
      }));

      const visualGenome = {
        subjectCount: job.vision.subjectCount || 0,
        negativeSpaceRatio: job.vision.negativeSpaceRatio || 0,
        visualComplexity: job.vision.visualComplexity || 'medium',
        subjectDominance: job.vision.subjectDominance || 'medium',
        compositionType: job.vision.compositionType || 'centered',
        imageContrast: job.vision.imageContrast || 'medium'
      };

      const communicationGenome = {
        layoutStrategy: job.layout.strategy,
        spacing: job.layout.designTokens.spacing,
      };

      await fetch('/api/layouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visualGenome,
          communicationGenome,
          layoutGenome: { strategy: job.layout.strategy },
          decisions: [{ decision: "User approved layout", reason: "Manual approval", outcome_score: 100 }],
          score: job.score || 95,
          layoutJson: JSON.stringify(job.layout)
        })
      });

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
          logs: [...state.activeJob.logs, `[${new Date().toLocaleTimeString()}] Saved to memory. Ready for export.`]
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
