'use client';

import { Suspense, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// --- Components ---
import URLInput from '@/components/evaluate/URLInput';
import ManualEntry from '@/components/evaluate/ManualEntry';
import ScoreCard from '@/components/scorecard/ScoreCard';
import ScoreBreakdown from '@/components/scorecard/ScoreBreakdown';
import ArchitectureDiagram from '@/components/xray/ArchitectureDiagram';
import WSEFitChart from '@/components/xray/WSEFitChart';
import SpeedGauge from '@/components/xray/SpeedGauge';
import AgenticRadar from '@/components/xray/AgenticRadar';
import ReportGenerator from '@/components/report/ReportGenerator';
import PerformanceCost from '@/components/xray/PerformanceCost';
import BenchmarkScores from '@/components/xray/BenchmarkScores';
import PDFExportButton from '@/components/report/PDFExport';
import InferenceFlow from '@/components/xray/InferenceFlow';
import CompetitorTable from '@/components/xray/CompetitorTable';
import InfoTip from '@/components/shared/InfoTip';
import Badge from '@/components/shared/Badge';

// --- API ---
import {
  fetchModelConfig,
  fetchModelInfo,
  fetchTokenizerConfig,
  fetchModelCard,
  parseModelIdFromUrl,
  checkModelAccess,
} from '@/lib/api/huggingface';
import GatedModelWizard from '@/components/evaluate/GatedModelWizard';

// --- Modules ---
import { runArchitectureScan } from '@/lib/modules/architectureScan';
import { runWSEFitAnalysis } from '@/lib/modules/wseFitAnalysis';
import { runSpeedSensitivity } from '@/lib/modules/speedSensitivity';
import { runREAPCompatibility } from '@/lib/modules/reapCompatibility';
import { runAgenticFit } from '@/lib/modules/agenticFit';
import { runCompetitiveGap } from '@/lib/modules/competitiveGap';
import { runDemandSignal } from '@/lib/modules/demandSignal';

// --- Scoring ---
import { calculateCompositeScore } from '@/lib/scoring/composite';
import { getVerdict, type VerdictResult } from '@/lib/scoring/verdict';

// --- Types ---
import type {
  ModelConfig,
  ModelInfo,
  ManualModelSpec,
  ModuleStatus,
  ModuleStatusState,
  ArchitectureScanResult,
  WSEFitResult,
  SpeedSensitivityResult,
  REAPResult,
  AgenticFitResult,
  CompetitiveGapResult,
  DemandSignalResult,
  CompositeScore,
} from '@/lib/types/model';

// ---------------------------------------------------------------------------
// Module names
// ---------------------------------------------------------------------------

const MODULE_NAMES = [
  'Architecture Scan',
  'WSE Fit',
  'Speed Sensitivity',
  'REAP Compatibility',
  'Agentic Fit',
  'Competitive Gap',
  'Demand Signal',
] as const;

// ---------------------------------------------------------------------------
// State management via useReducer
// ---------------------------------------------------------------------------

interface AnalysisResults {
  architecture: ArchitectureScanResult | null;
  wseFit: WSEFitResult | null;
  speedSensitivity: SpeedSensitivityResult | null;
  reap: REAPResult | null;
  agenticFit: AgenticFitResult | null;
  competitiveGap: CompetitiveGapResult | null;
  demandSignal: DemandSignalResult | null;
}

interface PageState {
  modules: ModuleStatus[];
  results: AnalysisResults;
  compositeScore: CompositeScore | null;
  modelId: string | null;
  modelInfo: ModelInfo | null;
  modelConfig: ModelConfig | null;
  modelCard: string;
  isRunning: boolean;
  error: string | null;
}

type PageAction =
  | { type: 'START_ANALYSIS'; modelId: string }
  | { type: 'SET_MODEL_INFO'; modelInfo: ModelInfo }
  | { type: 'SET_MODEL_CONFIG'; config: ModelConfig }
  | { type: 'SET_MODEL_CARD'; modelCard: string }
  | { type: 'UPDATE_MODULE'; index: number; status: ModuleStatusState; elapsed?: number; error?: string }
  | { type: 'SET_RESULT'; key: keyof AnalysisResults; result: any }
  | { type: 'SET_COMPOSITE'; score: CompositeScore }
  | { type: 'ANALYSIS_COMPLETE' }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'RESET' };

function initialModules(): ModuleStatus[] {
  return MODULE_NAMES.map((name) => ({
    name,
    status: 'pending' as ModuleStatusState,
  }));
}

const INITIAL_STATE: PageState = {
  modules: initialModules(),
  results: {
    architecture: null,
    wseFit: null,
    speedSensitivity: null,
    reap: null,
    agenticFit: null,
    competitiveGap: null,
    demandSignal: null,
  },
  compositeScore: null,
  modelId: null,
  modelInfo: null,
  modelConfig: null,
  modelCard: '',
  isRunning: false,
  error: null,
};

function reducer(state: PageState, action: PageAction): PageState {
  switch (action.type) {
    case 'START_ANALYSIS':
      return {
        ...INITIAL_STATE,
        modules: initialModules(),
        modelId: action.modelId,
        isRunning: true,
      };
    case 'SET_MODEL_INFO':
      return { ...state, modelInfo: action.modelInfo };
    case 'SET_MODEL_CONFIG':
      return { ...state, modelConfig: action.config };
    case 'SET_MODEL_CARD':
      return { ...state, modelCard: action.modelCard };
    case 'UPDATE_MODULE': {
      const modules = [...state.modules];
      modules[action.index] = {
        ...modules[action.index],
        status: action.status,
        elapsed: action.elapsed,
        error: action.error,
      };
      return { ...state, modules };
    }
    case 'SET_RESULT':
      return {
        ...state,
        results: { ...state.results, [action.key]: action.result },
      };
    case 'SET_COMPOSITE':
      return { ...state, compositeScore: action.score };
    case 'ANALYSIS_COMPLETE':
      return { ...state, isRunning: false };
    case 'SET_ERROR':
      return { ...state, error: action.error, isRunning: false };
    case 'RESET':
      return INITIAL_STATE;
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatParams(params: number): string {
  if (params >= 1e12) return `${(params / 1e12).toFixed(1)}T`;
  if (params >= 1e9) return `${(params / 1e9).toFixed(1)}B`;
  if (params >= 1e6) return `${(params / 1e6).toFixed(0)}M`;
  return params.toLocaleString();
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 4) return `${(bytes / 1024 ** 4).toFixed(1)} TB`;
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  return `${bytes} B`;
}

// ---------------------------------------------------------------------------
// Inner component that uses useSearchParams
// ---------------------------------------------------------------------------

function EvaluatePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [activeTab, setActiveTab] = useState<'url' | 'manual'>('url');
  const autoStartedRef = useRef(false);
  const [gatedInfo, setGatedInfo] = useState<{ modelId: string; modelUrl: string } | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  // ----- Run module with timing -----
  const runModule = useCallback(
    async <T,>(
      moduleIndex: number,
      fn: () => Promise<T>,
      resultKey: keyof AnalysisResults,
    ): Promise<T | null> => {
      const start = performance.now();
      dispatch({ type: 'UPDATE_MODULE', index: moduleIndex, status: 'running' });
      try {
        const result = await fn();
        const elapsed = Math.round(performance.now() - start);
        dispatch({ type: 'UPDATE_MODULE', index: moduleIndex, status: 'completed', elapsed });
        dispatch({ type: 'SET_RESULT', key: resultKey, result });
        return result;
      } catch (err) {
        const elapsed = Math.round(performance.now() - start);
        dispatch({
          type: 'UPDATE_MODULE',
          index: moduleIndex,
          status: 'error',
          elapsed,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        return null;
      }
    },
    [],
  );

  // ----- Core analysis pipeline -----
  const runAnalysis = useCallback(
    async (modelId: string) => {
      dispatch({ type: 'START_ANALYSIS', modelId });

      // ---- Phase 1: Fetch all HF data in parallel ----
      let config: ModelConfig | null = null;
      let modelInfo: ModelInfo | null = null;
      let tokenizerConfig: any = null;
      let modelCard: string = '';

      try {
        const [configRes, infoRes, tokRes, cardRes] = await Promise.allSettled([
          fetchModelConfig(modelId),
          fetchModelInfo(modelId),
          fetchTokenizerConfig(modelId),
          fetchModelCard(modelId),
        ]);

        if (configRes.status === 'fulfilled') {
          config = configRes.value;
          dispatch({ type: 'SET_MODEL_CONFIG', config });
        } else {
          dispatch({
            type: 'SET_ERROR',
            error: `Failed to fetch model config: ${configRes.reason?.message ?? 'Unknown error'}. Make sure the model ID is correct and you have access.`,
          });
          return;
        }

        if (infoRes.status === 'fulfilled') {
          modelInfo = infoRes.value;
          dispatch({ type: 'SET_MODEL_INFO', modelInfo });
        }

        if (tokRes.status === 'fulfilled') tokenizerConfig = tokRes.value;
        if (cardRes.status === 'fulfilled') {
          modelCard = cardRes.value;
          dispatch({ type: 'SET_MODEL_CARD', modelCard });
        }
      } catch (err) {
        dispatch({
          type: 'SET_ERROR',
          error: `Failed to fetch model data: ${err instanceof Error ? err.message : 'Unknown error'}`,
        });
        return;
      }

      // ---- Phase 2: Run all 7 modules ----
      // Module 1: Architecture Scan (no deps)
      const archPromise = runModule(0, () => runArchitectureScan(config!), 'architecture');

      // Module 7: Demand Signal (depends only on modelInfo)
      const demandPromise = modelInfo
        ? runModule(6, () => runDemandSignal(modelInfo!), 'demandSignal')
        : (dispatch({
            type: 'UPDATE_MODULE',
            index: 6,
            status: 'error',
            error: 'Model info unavailable',
          }),
          Promise.resolve(null));

      // Modules 2-6 depend on architecture scan
      const archResult = await archPromise;
      if (!archResult) {
        dispatch({ type: 'ANALYSIS_COMPLETE' });
        return;
      }

      // Module 2: WSE Fit (depends on arch)
      const wseFitPromise = runModule(1, () => runWSEFitAnalysis(archResult), 'wseFit');

      // Module 4: REAP Compatibility (depends on arch)
      const reapPromise = runModule(3, () => runREAPCompatibility(archResult), 'reap');

      // Module 5: Agentic Fit (depends on tokenizer + model card)
      const agenticPromise = runModule(
        4,
        () =>
          runAgenticFit(
            tokenizerConfig ?? {},
            modelCard,
            config!.max_position_embeddings ?? 4096,
          ),
        'agenticFit',
      );

      // Wait for WSE fit to get estimated TPS
      const wseFitResult = await wseFitPromise;

      // Module 3: Speed Sensitivity (depends on arch + wseFit for estimated TPS)
      const estimatedTps = wseFitResult
        ? // derive TPS from the WSE fit score range heuristic
          estimateTpsFromParams(archResult.parameterCount)
        : 1000;

      const speedPromise = runModule(
        2,
        () => runSpeedSensitivity(modelCard, archResult, estimatedTps),
        'speedSensitivity',
      );

      // Module 6: Competitive Gap (depends on arch + wseFit for TPS)
      const author = modelId.split('/')[0] ?? '';
      const compGapPromise = runModule(
        5,
        () => runCompetitiveGap(modelId, author, estimatedTps),
        'competitiveGap',
      );

      // Wait for all remaining modules
      await Promise.allSettled([
        speedPromise,
        reapPromise,
        agenticPromise,
        compGapPromise,
        demandPromise,
      ]);

      // ---- Phase 3: Calculate composite score ----
      // Gather all scores
      // We need to read from the latest state, so we'll collect results locally
      const scores: Record<string, number> = {};
      if (archResult) scores.architecture = archResult.score;

      // These could have resolved by now — we await their promises
      const [wseRes, speedRes, reapRes, agenticRes, compGapRes, demandRes] = await Promise.all([
        wseFitPromise,
        speedPromise,
        reapPromise,
        agenticPromise,
        compGapPromise,
        demandPromise,
      ]);

      if (wseRes) scores.wseFit = wseRes.score;
      if (speedRes) scores.speedSensitivity = speedRes.score;
      if (reapRes) scores.reap = reapRes.score;
      if (agenticRes) scores.agenticFit = agenticRes.score;
      if (compGapRes) scores.competitiveGap = compGapRes.score;
      if (demandRes) scores.demandSignal = demandRes.score;

      if (Object.keys(scores).length > 0) {
        const composite = calculateCompositeScore(scores);
        dispatch({ type: 'SET_COMPOSITE', score: composite });
      }

      dispatch({ type: 'ANALYSIS_COMPLETE' });
    },
    [runModule],
  );

  // ----- Manual entry pipeline -----
  const runManualAnalysis = useCallback(
    async (spec: ManualModelSpec) => {
      const syntheticId = `manual/${spec.modelName.replace(/\s+/g, '-')}`;
      dispatch({ type: 'START_ANALYSIS', modelId: syntheticId });

      // Convert ManualModelSpec to ModelConfig
      const config: ModelConfig = {
        model_type: spec.modelType,
        num_hidden_layers: spec.numHiddenLayers,
        num_attention_heads: spec.numAttentionHeads,
        num_key_value_heads: spec.numKeyValueHeads,
        hidden_size: spec.hiddenSize,
        intermediate_size: spec.intermediateSize,
        vocab_size: spec.vocabSize,
        max_position_embeddings: spec.maxPositionEmbeddings,
        num_local_experts: spec.numLocalExperts,
        num_experts_per_tok: spec.numExpertsPerTok,
        torch_dtype: spec.torchDtype,
      };
      dispatch({ type: 'SET_MODEL_CONFIG', config });

      // Module 1: Architecture Scan
      const archResult = await runModule(0, () => runArchitectureScan(config), 'architecture');
      if (!archResult) {
        dispatch({ type: 'ANALYSIS_COMPLETE' });
        return;
      }

      // Module 2: WSE Fit
      const wseFitPromise = runModule(1, () => runWSEFitAnalysis(archResult), 'wseFit');

      // Module 4: REAP Compatibility
      const reapPromise = runModule(3, () => runREAPCompatibility(archResult), 'reap');

      // Module 5: Agentic Fit (no tokenizer data for manual, use empty defaults)
      const agenticPromise = runModule(
        4,
        () => runAgenticFit({}, '', config.max_position_embeddings ?? 4096),
        'agenticFit',
      );

      const wseFitResult = await wseFitPromise;
      const estimatedTps = estimateTpsFromParams(archResult.parameterCount);

      // Module 3: Speed Sensitivity (use empty model card)
      const speedPromise = runModule(
        2,
        () => runSpeedSensitivity('', archResult, estimatedTps),
        'speedSensitivity',
      );

      // Module 6: Competitive Gap
      const compGapPromise = runModule(
        5,
        () => runCompetitiveGap(spec.modelName, '', estimatedTps),
        'competitiveGap',
      );

      // Module 7: Demand Signal -- skip for manual entry (no HF data)
      dispatch({
        type: 'UPDATE_MODULE',
        index: 6,
        status: 'error',
        error: 'Skipped for manual entry (no HuggingFace data)',
      });

      await Promise.allSettled([speedPromise, reapPromise, agenticPromise, compGapPromise]);

      // Composite score
      const scores: Record<string, number> = {};
      if (archResult) scores.architecture = archResult.score;
      const [wseRes, speedRes, reapRes, agenticRes, compGapRes] = await Promise.all([
        wseFitPromise,
        speedPromise,
        reapPromise,
        agenticPromise,
        compGapPromise,
      ]);
      if (wseRes) scores.wseFit = wseRes.score;
      if (speedRes) scores.speedSensitivity = speedRes.score;
      if (reapRes) scores.reap = reapRes.score;
      if (agenticRes) scores.agenticFit = agenticRes.score;
      if (compGapRes) scores.competitiveGap = compGapRes.score;

      if (Object.keys(scores).length > 0) {
        const composite = calculateCompositeScore(scores);
        dispatch({ type: 'SET_COMPOSITE', score: composite });
      }

      dispatch({ type: 'ANALYSIS_COMPLETE' });
    },
    [runModule],
  );

  // ----- Auto-start from ?model= search param -----
  useEffect(() => {
    if (autoStartedRef.current) return;
    const modelParam = searchParams.get('model');
    if (modelParam && modelParam.trim()) {
      autoStartedRef.current = true;
      // Could be a full URL or a model ID
      const modelId = parseModelIdFromUrl(modelParam) ?? modelParam.trim();
      runAnalysis(modelId);
    }
  }, [searchParams, runAnalysis]);

  // ----- Derived data for dashboard -----
  const { results, compositeScore, modelId, modelInfo, modelConfig, modelCard: storedModelCard, modules, isRunning, error } = state;

  const verdictInfo = useMemo(() => {
    if (!compositeScore) return null;
    return getVerdict(compositeScore.score);
  }, [compositeScore]);

  const showDashboard = compositeScore !== null && !isRunning;

  // Build analysis data for report generator
  const analysisData = useMemo(() => {
    if (!compositeScore) return {};
    return {
      modelName: modelId ?? '',
      compositeScore: compositeScore.score,
      verdict: compositeScore.verdict,
      breakdown: compositeScore.breakdown,
      architecture: results.architecture as any,
      wseFit: results.wseFit as any,
      speedSensitivity: results.speedSensitivity as any,
      agenticFit: results.agenticFit as any,
      competitiveGap: results.competitiveGap as any,
      demandSignal: results.demandSignal as any,
      reapPotential: results.reap as any,
    };
  }, [compositeScore, modelId, results]);

  // ---- URL submit handler ----
  const handleUrlSubmit = useCallback(
    (modelIdFromUrl: string) => {
      runAnalysis(modelIdFromUrl);
    },
    [runAnalysis],
  );

  // ---- Manual submit handler ----
  const handleManualSubmit = useCallback(
    (spec: ManualModelSpec) => {
      runManualAnalysis(spec);
    },
    [runManualAnalysis],
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#0F172A]">X-ray Model</h1>
          <p className="mt-1 text-sm text-[#475569]">
            Evaluate any open-weight model for Cerebras inference compatibility.
          </p>
        </div>

        {/* ----- Tab Selector ----- */}
        <div className="mb-6 flex flex-wrap gap-1 rounded-lg bg-[#FFFFFF] p-1 w-fit border border-[#E2E8F0]">
          <button
            onClick={() => setActiveTab('url')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'url'
                ? 'bg-[#6366F1]/15 text-[#6366F1]'
                : 'text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            Paste HuggingFace URL
          </button>
          <button
            disabled
            className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-[#94A3B8] cursor-not-allowed opacity-60"
          >
            Manual Entry (pre-release / NDA)
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-600">Coming Soon</span>
          </button>
        </div>

        {/* ----- Tab Content ----- */}
        <div className="mb-8">
          {activeTab === 'url' ? (
            <URLInput onSubmit={handleUrlSubmit} />
          ) : (
            <ManualEntry onSubmit={handleManualSubmit} />
          )}
        </div>

        {/* ----- Error Message ----- */}
        {error && (
          <div className="mb-8 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4">
            <div className="flex items-start gap-3">
              <svg
                className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* ----- Progress Panel ----- */}
        {(isRunning || compositeScore !== null) && (
          <ProgressPanel modules={modules} isRunning={isRunning} />
        )}

        {/* ----- X-ray Dashboard ----- */}
        {showDashboard && compositeScore && verdictInfo && (
          <div className="mt-8 space-y-6 animate-fade-in">
            {/* Row 1: Model Identity Card */}
            <ModelIdentityCard
              modelId={modelId}
              modelInfo={modelInfo}
              modelConfig={modelConfig}
              archResult={results.architecture}
              compositeScore={compositeScore}
              verdictInfo={verdictInfo}
            />

            {/* Row 2: ScoreCard + ScoreBreakdown */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ScoreCard
                compositeScore={compositeScore.score}
                verdict={compositeScore.verdict}
                verdictLabel={verdictInfo.label}
              />
              <ScoreBreakdown breakdown={compositeScore.breakdown} />
            </div>

            {/* Row 3: Architecture Diagram + WSE Fit Chart */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {results.architecture && (
                <ArchitectureDiagram
                  arch={results.architecture}
                  wseFit={results.wseFit}
                  estimatedTps={estimateTpsFromParams(results.architecture.parameterCount)}
                />
              )}
              {results.wseFit && (
                <WSEFitChart
                  wseFitResult={{
                    precision_analysis: buildPrecisionAnalysis(
                      results.architecture?.parameterCount ?? 0,
                    ),
                  }}
                />
              )}
            </div>

            {/* Row 3b: Performance & Cost Estimates (full width) */}
            {results.architecture && (
              <PerformanceCost
                parameterCount={results.architecture.parameterCount}
                activeParameters={results.architecture.activeParameters}
                isMoE={results.architecture.isMoE}
                contextWindow={results.architecture.contextWindow}
                estimatedDecodeTps={estimateTpsFromParams(results.architecture.parameterCount)}
                numLayers={results.architecture.numLayers}
                numKVHeads={results.architecture.numKVHeads}
                headDim={results.architecture.headDim}
              />
            )}

            {/* Row 3c: Benchmark Scores (full width) */}
            {storedModelCard && (
              <BenchmarkScores
                modelCard={storedModelCard}
                modelType={results.architecture?.modelType ?? ''}
              />
            )}

            {/* Row 4: Speed Gauge + Agentic Radar */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {results.speedSensitivity && (
                <SpeedGauge
                  speedResult={{
                    use_case: results.speedSensitivity.primaryUseCases[0] ?? 'general',
                    elasticity_score: results.speedSensitivity.score,
                    chain_steps: 5,
                    gpu_time_seconds: 500 / (gpuBaselineTps(results.architecture?.parameterCount ?? 7e9)),
                    cerebras_time_seconds:
                      500 / results.speedSensitivity.estimatedTokensPerSecond,
                    speedup_factor: results.speedSensitivity.speedupOverGPU,
                    score: results.speedSensitivity.score,
                  }}
                />
              )}
              {results.agenticFit && (
                <AgenticRadar
                  agenticResult={{
                    radar_values: {
                      tool_calling: results.agenticFit.toolUseCapability,
                      structured_output: results.agenticFit.instructionFollowing,
                      context_length: (results.architecture?.contextWindow ?? 0) >= 128000 ? 100
                        : (results.architecture?.contextWindow ?? 0) >= 32000 ? 80
                        : (results.architecture?.contextWindow ?? 0) >= 8000 ? 50 : 20,
                      reasoning: results.agenticFit.reasoningDepth,
                      code_quality: results.agenticFit.codeGeneration,
                      multi_turn: results.agenticFit.multiTurnCoherence,
                    },
                    tool_calling_supported: results.agenticFit.toolUseCapability > 50,
                    structured_output_supported: results.agenticFit.instructionFollowing > 50,
                    has_reasoning_tokens: results.agenticFit.reasoningDepth > 50,
                    score: results.agenticFit.score,
                    useCases: results.agenticFit.agenticUseCases,
                    limitations: results.agenticFit.limitations,
                  }}
                />
              )}
            </div>

            {/* Row 5: REAP Grid + Competitor Table */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {results.reap && <REAPGrid reap={results.reap} isMoE={results.architecture?.isMoE ?? false} arch={results.architecture} />}
              {results.competitiveGap && <CompetitorTable gap={results.competitiveGap} />}
            </div>

            {/* Row 6: Demand Timeline (full width) */}
            {results.demandSignal && <DemandTimeline demand={results.demandSignal} />}

            {/* Inference Flow Animation */}
            {results.architecture && (
              <InferenceFlow
                modelName={modelId ?? 'Unknown'}
                numLayers={results.architecture.numLayers}
                numHeads={results.architecture.numAttentionHeads}
                numKVHeads={results.architecture.numKVHeads}
                hiddenSize={results.architecture.hiddenSize}
                isMoE={results.architecture.isMoE}
                numExperts={results.architecture.numExperts}
                numExpertsPerTok={results.architecture.numExpertsPerTok}
                contextWindow={results.architecture.contextWindow}
                estimatedTps={estimateTpsFromParams(results.architecture.parameterCount)}
                vocabSize={results.architecture.vocabSize}
              />
            )}

            {/* Row 7: Report Generator + Export */}
            <div className="space-y-6">
              <ReportGenerator analysisData={analysisData} modelName={modelId ?? 'Unknown'} onReportReady={setAiSummary} />
              <div className="flex items-center gap-3 justify-end">
                <PDFExportButton
                  modelName={modelId ?? 'Unknown'}
                  compositeScore={compositeScore}
                  verdictInfo={verdictInfo}
                  analysisData={analysisData}
                  aiSummary={aiSummary}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page export wrapped in Suspense for useSearchParams
// ---------------------------------------------------------------------------

export default function EvaluatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
          <p className="text-sm text-[#94A3B8]">Loading...</p>
        </div>
      }
    >
      <EvaluatePageInner />
    </Suspense>
  );
}

// ---------------------------------------------------------------------------
// Helper: estimate TPS from param count (mirrors wseFitAnalysis internal fn)
// ---------------------------------------------------------------------------

function estimateTpsFromParams(params: number): number {
  if (params < 10e9) return 2500;
  if (params < 30e9) return 2000;
  if (params < 70e9) return 1100;
  if (params < 200e9) return 700;
  return 400;
}

function gpuBaselineTps(params: number): number {
  if (params < 10e9) return 120;
  if (params < 30e9) return 60;
  if (params < 70e9) return 30;
  if (params < 200e9) return 15;
  return 8;
}

// ---------------------------------------------------------------------------
// Build precision analysis array for WSEFitChart
// ---------------------------------------------------------------------------

function buildPrecisionAnalysis(totalParams: number) {
  const SRAM = 44 * 1024 ** 3;
  const precisions = [
    { precision: 'FP32', bpp: 4 },
    { precision: 'FP16', bpp: 2 },
    { precision: 'FP8', bpp: 1 },
    { precision: 'FP4', bpp: 0.5 },
  ];
  return precisions.map((p) => {
    const bytes = totalParams * p.bpp;
    const waferCount = Math.ceil(bytes / SRAM);
    return {
      precision: p.precision,
      bytes,
      fits_single_wafer: waferCount <= 1,
      wafer_count: waferCount,
    };
  });
}

// ===========================================================================
// Sub-components that live in this file (not complex enough for separate files)
// ===========================================================================

// ---------------------------------------------------------------------------
// Progress Panel
// ---------------------------------------------------------------------------

function ProgressPanel({
  modules,
  isRunning,
}: {
  modules: ModuleStatus[];
  isRunning: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wider text-[#475569] uppercase">
          Analysis Progress
        </h3>
        {isRunning && (
          <span className="flex items-center gap-2 text-xs text-[#6366F1]">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                className="opacity-25"
              />
              <path
                d="M4 12a8 8 0 018-8"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                className="opacity-75"
              />
            </svg>
            Running...
          </span>
        )}
        {!isRunning && (
          <span className="text-xs text-emerald-600">Complete</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {modules.map((mod) => (
          <div
            key={mod.name}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
              mod.status === 'completed'
                ? 'border-emerald-500/20 bg-emerald-500/5'
                : mod.status === 'error'
                  ? 'border-red-500/20 bg-red-500/5'
                  : mod.status === 'running'
                    ? 'border-[#6366F1]/30 bg-[#6366F1]/5'
                    : 'border-[#E2E8F0] bg-[#F8FAFC]'
            }`}
          >
            {/* Status icon */}
            <div className="shrink-0">
              {mod.status === 'pending' && (
                <div className="h-4 w-4 rounded-full border-2 border-[#CBD5E1]" />
              )}
              {mod.status === 'running' && (
                <svg className="h-4 w-4 animate-spin text-[#6366F1]" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                </svg>
              )}
              {mod.status === 'completed' && (
                <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
              )}
              {mod.status === 'error' && (
                <svg className="h-4 w-4 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
              )}
            </div>

            {/* Module info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#0F172A]">{mod.name}</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-[#94A3B8]">
                  {mod.status === 'pending' && 'Waiting...'}
                  {mod.status === 'running' && 'Analyzing...'}
                  {mod.status === 'completed' && `${mod.elapsed}ms`}
                  {mod.status === 'error' && (mod.error ?? 'Failed')}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Model Identity Card
// ---------------------------------------------------------------------------

function ModelIdentityCard({
  modelId,
  modelInfo,
  modelConfig,
  archResult,
  compositeScore,
  verdictInfo,
}: {
  modelId: string | null;
  modelInfo: ModelInfo | null;
  modelConfig: ModelConfig | null;
  archResult: ArchitectureScanResult | null;
  compositeScore: CompositeScore;
  verdictInfo: VerdictResult;
}) {
  if (!modelId) return null;

  const name = modelId.split('/').pop() ?? modelId;
  const org = modelId.includes('/') ? modelId.split('/')[0] : undefined;
  const isManual = modelId.startsWith('manual/');
  const params = archResult?.parameterCount;
  const activeParams = archResult?.activeParameters;
  const archFamily = archResult?.architectureFamily ?? 'Unknown';
  const isMoE = archResult?.isMoE ?? false;
  const layers = archResult?.numLayers;
  const contextWindow = archResult?.contextWindow;
  const attentionVariant = archResult?.attentionVariant;

  // Extract license from model info tags
  const licenseTag = modelInfo?.tags?.find((t: string) => t.startsWith('license:'));
  const license = licenseTag ? licenseTag.replace('license:', '') : undefined;

  // Format context window (e.g. 131072 -> "128K")
  const formatContext = (ctx: number) => {
    if (ctx >= 1_000_000) return `${(ctx / 1_000_000).toFixed(ctx % 1_000_000 === 0 ? 0 : 1)}M`;
    if (ctx >= 1024) return `${Math.round(ctx / 1024)}K`;
    return ctx.toLocaleString();
  };

  // Verdict color mapping
  const verdictColor =
    compositeScore.verdict === 'GO'
      ? { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-600', ring: 'ring-emerald-500/20', dot: 'bg-emerald-500' }
      : compositeScore.verdict === 'EVALUATE'
        ? { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-600', ring: 'ring-amber-500/20', dot: 'bg-amber-500' }
        : { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600', ring: 'ring-red-500/20', dot: 'bg-red-500' };

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_auto_auto]">
        {/* ---- Left Section: Model Identity ---- */}
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-2xl font-bold tracking-tight text-[#0F172A]">{name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                {org && (
                  <span className="text-sm text-[#475569]">{org}</span>
                )}
                {!isManual && (
                  <a
                    href={`https://huggingface.co/${modelId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#475569] transition-colors hover:text-[#0F172A]"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5zm7.5-3.25a.75.75 0 01.75-.75h4.5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0V4.06l-6.22 6.22a.75.75 0 11-1.06-1.06l6.22-6.22H12.5a.75.75 0 01-.75-.75z"
                        clipRule="evenodd"
                      />
                    </svg>
                    HuggingFace
                  </a>
                )}
                {modelInfo && (
                  <>
                    <span className="text-[#CBD5E1]" aria-hidden="true">&middot;</span>
                    <span className="text-xs text-[#94A3B8]">
                      <span className="font-mono text-[#475569]">{(modelInfo.downloadsLastMonth ?? modelInfo.downloads ?? 0).toLocaleString()}</span> downloads/mo
                    </span>
                    <span className="text-[#CBD5E1]" aria-hidden="true">&middot;</span>
                    <span className="text-xs text-[#94A3B8]">
                      <span className="font-mono text-[#475569]">{(modelInfo.likes ?? 0).toLocaleString()}</span> likes
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Architecture badges */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge text={`${archFamily}Family`} variant="neutral" />
            <Badge
              text={isMoE ? 'MoE' : 'Dense'}
              variant={isMoE ? 'warning' : 'success'}
            />
            {attentionVariant && (
              <Badge text={attentionVariant} variant="neutral" />
            )}
            {license && <Badge text={license} variant="muted" />}
          </div>
        </div>

        {/* ---- Center Section: Key Metrics ---- */}
        <div className="flex items-center">
          <div className="grid grid-cols-2 gap-px sm:flex">
            {/* Parameters */}
            <div className="flex flex-col items-center rounded-lg sm:rounded-none sm:rounded-l-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 sm:px-5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">Parameters</span>
              <span className="mt-1 font-mono text-xl font-bold text-[#0F172A]">
                {params ? formatParams(params) : '--'}
              </span>
              {isMoE && activeParams ? (
                <span className="mt-0.5 text-[10px] text-[#94A3B8]">
                  <span className="font-mono text-[#475569]">{formatParams(activeParams)}</span> active
                </span>
              ) : (
                <span className="mt-0.5 text-[10px] text-[#94A3B8]">total</span>
              )}
            </div>

            {/* Context Window */}
            <div className="flex flex-col items-center rounded-lg sm:rounded-none border-y border-x sm:border-x-0 border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 sm:px-5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">Context</span>
              <span className="mt-1 font-mono text-xl font-bold text-[#0F172A]">
                {contextWindow ? formatContext(contextWindow) : '--'}
              </span>
              <span className="mt-0.5 text-[10px] text-[#94A3B8]">tokens</span>
            </div>

            {/* Layers */}
            <div className="flex flex-col items-center rounded-lg sm:rounded-none border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 sm:px-5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">Layers</span>
              <span className="mt-1 font-mono text-xl font-bold text-[#0F172A]">
                {layers ?? '--'}
              </span>
              <span className="mt-0.5 text-[10px] text-[#94A3B8]">depth</span>
            </div>

            {/* Composite Score */}
            <div className="flex flex-col items-center rounded-lg sm:rounded-none sm:rounded-r-lg border sm:border-l-0 border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 sm:px-5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">Score</span>
              <span className={`mt-1 font-mono text-xl font-bold ${verdictColor.text}`}>
                {compositeScore.score}
              </span>
              <span className="mt-0.5 text-[10px] text-[#94A3B8]">/ 100</span>
            </div>
          </div>
        </div>

        {/* ---- Right Section: Verdict ---- */}
        <div className="flex items-center">
          <div className={`flex flex-col items-center rounded-xl border ${verdictColor.border} ${verdictColor.bg} px-7 py-4`}>
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${verdictColor.dot}`} />
              <span className={`text-2xl font-extrabold tracking-tight ${verdictColor.text}`}>
                {compositeScore.verdict}
              </span>
            </div>
            <span className={`mt-1 font-mono text-sm font-semibold ${verdictColor.text}`}>
              {compositeScore.score}/100
            </span>
            <span className="mt-1.5 max-w-[160px] text-center text-[11px] leading-tight text-[#475569]">
              {verdictInfo.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// REAP Grid
// ---------------------------------------------------------------------------

function REAPGrid({ reap, isMoE, arch }: { reap: REAPResult; isMoE: boolean; arch?: ArchitectureScanResult | null }) {
  // Dense model — show Optimization Strategies instead
  if (!isMoE) {
    const paramB = arch ? (arch.parameterCount / 1e9).toFixed(1) : '?';
    const fp16GB = arch ? (arch.parameterCount * 2 / 1024 ** 3).toFixed(1) : '?';
    const fp8GB = arch ? (arch.parameterCount / 1024 ** 3).toFixed(1) : '?';
    const fp4GB = arch ? (arch.parameterCount * 0.5 / 1024 ** 3).toFixed(1) : '?';
    const fp8Wafers = arch ? Math.ceil(arch.parameterCount / (44 * 1024 ** 3)) : '?';
    const fp4Wafers = arch ? Math.ceil(arch.parameterCount * 0.5 / (44 * 1024 ** 3)) : '?';

    const strategies = [
      { name: 'FP8 Quantization', impact: 'High', desc: `Halves memory: ${fp16GB}GB → ${fp8GB}GB (${fp8Wafers} wafer${fp8Wafers !== 1 ? 's' : ''})`, badge: 'emerald' as const },
      { name: 'FP4 Quantization', impact: 'Very High', desc: `Quarter memory: ${fp16GB}GB → ${fp4GB}GB (${fp4Wafers} wafer${fp4Wafers !== 1 ? 's' : ''})`, badge: 'indigo' as const },
      { name: 'Weight Pruning', impact: 'Medium', desc: `Remove 20-40% of weights with minimal quality loss on ${paramB}B model`, badge: 'amber' as const },
      { name: 'KV Cache Optimization', impact: arch && arch.contextWindow >= 32000 ? 'High' : 'Low', desc: arch && arch.contextWindow >= 32000 ? 'Sliding window or chunked attention for long context' : 'Standard context — minimal cache pressure', badge: arch && arch.contextWindow >= 32000 ? 'amber' as const : 'neutral' as const },
      { name: 'Speculative Decoding', impact: 'Medium', desc: `Use smaller draft model to predict tokens, verify with ${paramB}B model`, badge: 'indigo' as const },
    ];

    const badgeColors = { emerald: 'bg-emerald-100 text-emerald-700', indigo: 'bg-[#6366F1]/10 text-[#6366F1]', amber: 'bg-amber-100 text-amber-700', neutral: 'bg-[#F1F5F9] text-[#94A3B8]' };

    return (
      <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-[#0F172A]">
          Optimization Strategies
          <InfoTip text="For dense models, REAP (expert pruning) doesn't apply. These alternative optimization strategies can reduce memory and improve throughput on WSE-3." />
        </h3>
        <div className="space-y-2">
          {strategies.map((s) => (
            <div key={s.name} className="flex items-start gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2.5">
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${badgeColors[s.badge]}`}>{s.impact}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#0F172A]">{s.name}</p>
                <p className="text-[10px] text-[#475569] leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // MoE model — show REAP analysis
  return (
    <div className="rounded-[12px] border border-[#E2E8F0] bg-[#FFFFFF] p-5">
      <h3 className="mb-4 text-sm font-semibold text-[#0F172A]">REAP Compatibility <InfoTip text="REAP (Router-weighted Expert Activation Pruning) removes underutilized experts from MoE models to reduce memory and wafer count while preserving quality. Higher prunable % = more optimization headroom." /></h3>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
          <p className="text-xs text-[#94A3B8] uppercase tracking-wide">Score</p>
          <p className={`font-mono text-2xl font-bold ${
            reap.score >= 70 ? 'text-emerald-600' : reap.score >= 40 ? 'text-amber-600' : 'text-red-600'
          }`}>
            {reap.score}
          </p>
        </div>
        <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
          <p className="text-xs text-[#94A3B8] uppercase tracking-wide">Prunable experts</p>
          <p className="font-mono text-lg font-semibold text-[#0F172A]">{reap.engagementPotential}%</p>
        </div>
        <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
          <p className="text-xs text-[#94A3B8] uppercase tracking-wide">REAP precedent</p>
          <p className="text-sm font-semibold text-[#0F172A]">{reap.adoptionLikelihood > 60 ? 'Yes' : 'No'}</p>
        </div>
        <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
          <p className="text-xs text-[#94A3B8] uppercase tracking-wide">Time to deploy</p>
          <p className="text-sm font-semibold text-[#0F172A] capitalize">{reap.timeToValue}</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-[#475569] uppercase tracking-wide">Analysis</p>
        <ul className="space-y-1">
          {reap.partnershipOpportunities.map((opp, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[#475569]">
              <span className="mt-0.5 text-[#6366F1]">-</span>
              {opp}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// (CompetitorTable is now imported from @/components/xray/CompetitorTable)

// ---------------------------------------------------------------------------
// Demand Timeline
// ---------------------------------------------------------------------------

function DemandTimeline({ demand }: { demand: DemandSignalResult }) {
  const trendColor =
    demand.downloadsTrend === 'rising'
      ? 'text-emerald-600'
      : demand.downloadsTrend === 'declining'
        ? 'text-red-600'
        : 'text-amber-600';

  const trendIcon =
    demand.downloadsTrend === 'rising'
      ? '\u2191'
      : demand.downloadsTrend === 'declining'
        ? '\u2193'
        : '\u2192';

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-6">
      <h3 className="mb-4 text-sm font-semibold tracking-wider text-[#475569] uppercase">
        Demand Signal
      </h3>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <p className="text-xs text-[#94A3B8] uppercase tracking-wide">Score</p>
          <p className={`font-mono text-2xl font-bold ${
            demand.score >= 70 ? 'text-emerald-600' : demand.score >= 40 ? 'text-amber-600' : 'text-red-600'
          }`}>
            {demand.score}
          </p>
        </div>
        <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <p className="text-xs text-[#94A3B8] uppercase tracking-wide">Downloads (30d)</p>
          <p className="font-mono text-xl font-semibold text-[#0F172A]">
            {demand.downloadsLastMonth.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <p className="text-xs text-[#94A3B8] uppercase tracking-wide">Trend</p>
          <p className={`text-lg font-bold capitalize ${trendColor}`}>
            {trendIcon} {demand.downloadsTrend}
          </p>
        </div>
        <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <p className="text-xs text-[#94A3B8] uppercase tracking-wide">Community interest</p>
          <p className="font-mono text-xl font-semibold text-[#0F172A]">{demand.communityInterest}</p>
        </div>
      </div>

      {/* Segments */}
      {demand.topRequestingSegments.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-[#475569] uppercase tracking-wide">
            Top requesting segments
          </p>
          <div className="flex flex-wrap gap-2">
            {demand.topRequestingSegments.map((seg) => (
              <span
                key={seg}
                className="inline-flex items-center rounded-md bg-[#6366F1]/10 px-2.5 py-1 text-xs font-medium text-[#6366F1] ring-1 ring-inset ring-[#6366F1]/20"
              >
                {seg}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// (PDFExport is now imported from @/components/report/PDFExport as PDFExportButton)
