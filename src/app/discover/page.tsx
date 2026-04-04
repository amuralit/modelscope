'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchTrendingModels } from '@/lib/api/huggingface';
import {
  CEREBRAS_MODELS,
  CEREBRAS_MODEL_IDS,
} from '@/lib/constants/cerebrasModels';
import type { ModelInfo } from '@/lib/types/model';
import Badge from '@/components/shared/Badge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GapModel extends ModelInfo {
  lab: string;
  estimatedParams: number | null;
  onCerebras: boolean;
  quickScore: number;
}

type ArchFilter = 'All' | 'Dense' | 'MoE';

// ---------------------------------------------------------------------------
// Lab tier definitions (mirrors demandSignal module)
// ---------------------------------------------------------------------------

const TIER_1_LABS = new Set([
  'meta-llama',
  'google',
  'Qwen',
  'mistralai',
  'deepseek-ai',
]);

const TIER_2_LABS = new Set([
  'THUDM',
  'MiniMaxAI',
  'microsoft',
  'nvidia',
]);

function getLabTier(author: string | undefined): number {
  if (!author) return 4;
  if (TIER_1_LABS.has(author)) return 1;
  if (TIER_2_LABS.has(author)) return 2;
  return 3;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fuzzy match: normalise and check substring both ways. */
function normalise(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

function isOnCerebras(modelId: string): boolean {
  const norm = normalise(modelId);
  return CEREBRAS_MODELS.some(
    (cm) => normalise(cm.id).includes(norm) || norm.includes(normalise(cm.id)) || normalise(cm.name).includes(norm) || norm.includes(normalise(cm.name)),
  );
}

/** Try to extract param count from model tags or name. */
function estimateParamsFromInfo(info: ModelInfo): number | null {
  // Check tags for safetensors metadata
  const paramTag = info.tags?.find(
    (t) => t.startsWith('params:') || t.match(/^\d+[bBmM]$/),
  );
  if (paramTag) {
    const numStr = paramTag.replace('params:', '').trim();
    const m = numStr.match(/([\d.]+)\s*([bBmMtT])?/);
    if (m) {
      const val = parseFloat(m[1]);
      const unit = (m[2] ?? '').toUpperCase();
      if (unit === 'T') return val * 1e12;
      if (unit === 'B') return val * 1e9;
      if (unit === 'M') return val * 1e6;
      if (val > 1000) return val * 1e6; // likely millions
      return val * 1e9; // likely billions
    }
  }

  // Try to parse from model name
  const nameMatch = info.modelId?.match(/(\d+\.?\d*)\s*[bB]/);
  if (nameMatch) return parseFloat(nameMatch[1]) * 1e9;

  return null;
}

function isMoEFromTags(info: ModelInfo): boolean {
  const tags = info.tags ?? [];
  const idLower = (info.modelId ?? info.id).toLowerCase();
  return (
    tags.some((t) => t.toLowerCase().includes('moe') || t.toLowerCase().includes('mixture')) ||
    idLower.includes('moe') ||
    idLower.includes('scout') ||
    idLower.includes('maverick')
  );
}

/** Quick score: weighted combination of downloads + lab tier. */
function computeQuickScore(downloads: number, labTier: number): number {
  const dlScore = downloads > 0 ? Math.min(100, (Math.log10(downloads) / 6) * 100) : 0;
  const tierScore =
    labTier === 1 ? 95 : labTier === 2 ? 75 : labTier === 3 ? 55 : 35;
  return Math.round(dlScore * 0.6 + tierScore * 0.4);
}

function formatParams(params: number | null): string {
  if (!params) return '--';
  if (params >= 1e12) return `${(params / 1e12).toFixed(1)}T`;
  if (params >= 1e9) return `${(params / 1e9).toFixed(1)}B`;
  if (params >= 1e6) return `${(params / 1e6).toFixed(0)}M`;
  return params.toLocaleString();
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-red-400';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DiscoverPage() {
  const router = useRouter();

  // State
  const [models, setModels] = useState<GapModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [minParams, setMinParams] = useState(0); // in billions
  const [archFilter, setArchFilter] = useState<ArchFilter>('All');
  const [sortBy, setSortBy] = useState<'quickScore' | 'downloads' | 'likes'>('quickScore');

  // ----- Fetch trending models on mount -----
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const hfToken = localStorage.getItem('modelscope_hf_token');
      if (!hfToken) {
        setError(
          'HuggingFace API token not found. Please configure it in Settings to discover trending models.',
        );
        setLoading(false);
        return;
      }

      try {
        const trending = await fetchTrendingModels(hfToken);
        const gapModels: GapModel[] = trending.map((info) => {
          const lab = info.author ?? info.id.split('/')[0] ?? 'Unknown';
          const estimatedParams = estimateParamsFromInfo(info);
          const onCerebras_ = isOnCerebras(info.modelId ?? info.id);
          const labTier = getLabTier(info.author);
          const quickScore = computeQuickScore(
            info.downloadsLastMonth ?? info.downloads ?? 0,
            labTier,
          );

          return {
            ...info,
            lab,
            estimatedParams,
            onCerebras: onCerebras_,
            quickScore,
          };
        });

        setModels(gapModels);
      } catch (err) {
        setError(
          `Failed to fetch trending models: ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // ----- Filter and sort -----
  const filteredModels = useMemo(() => {
    let result = models;

    // Min params filter
    if (minParams > 0) {
      result = result.filter((m) => {
        if (!m.estimatedParams) return true; // include unknown params
        return m.estimatedParams >= minParams * 1e9;
      });
    }

    // Architecture filter
    if (archFilter !== 'All') {
      result = result.filter((m) => {
        const isMoE = isMoEFromTags(m);
        return archFilter === 'MoE' ? isMoE : !isMoE;
      });
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'quickScore') return b.quickScore - a.quickScore;
      if (sortBy === 'downloads')
        return (b.downloadsLastMonth ?? 0) - (a.downloadsLastMonth ?? 0);
      return (b.likes ?? 0) - (a.likes ?? 0);
    });

    return result;
  }, [models, minParams, archFilter, sortBy]);

  // Count gap models (trending but NOT on Cerebras)
  const gapModels = useMemo(
    () => filteredModels.filter((m) => !m.onCerebras),
    [filteredModels],
  );

  const handleRowClick = useCallback(
    (modelId: string) => {
      router.push(`/evaluate?model=${encodeURIComponent(modelId)}`);
    },
    [router],
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#0B0F19] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#F9FAFB]">Discover</h1>
          <p className="mt-1 text-sm text-[#9CA3AF]">
            Trending HuggingFace models not yet on Cerebras -- your next onboarding
            opportunities.
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-8 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4">
            <div className="flex items-start gap-3">
              <svg
                className="mt-0.5 h-5 w-5 shrink-0 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-sm text-red-400">{error}</p>
                {error.includes('Settings') && (
                  <button
                    onClick={() => router.push('/settings')}
                    className="mt-2 text-sm font-medium text-[#6366F1] underline decoration-[#6366F1]/30 hover:decoration-[#6366F1]"
                  >
                    Go to Settings
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <svg
                className="mx-auto mb-3 h-8 w-8 animate-spin text-[#6366F1]"
                viewBox="0 0 24 24"
                fill="none"
              >
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
              <p className="text-sm text-[#9CA3AF]">
                Fetching trending models from HuggingFace...
              </p>
            </div>
          </div>
        )}

        {/* Main content */}
        {!loading && !error && (
          <>
            {/* Summary stats */}
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-[#1F2937] bg-[#111827] px-5 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">
                  Trending models
                </p>
                <p className="font-mono text-2xl font-semibold text-[#F9FAFB]">
                  {models.length}
                </p>
              </div>
              <div className="rounded-xl border border-[#1F2937] bg-[#111827] px-5 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">
                  Gap models
                </p>
                <p className="font-mono text-2xl font-semibold text-emerald-400">
                  {gapModels.length}
                </p>
                <p className="text-xs text-[#6B7280]">Not on Cerebras</p>
              </div>
              <div className="rounded-xl border border-[#1F2937] bg-[#111827] px-5 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">
                  On Cerebras
                </p>
                <p className="font-mono text-2xl font-semibold text-[#6366F1]">
                  {filteredModels.length - gapModels.length}
                </p>
              </div>
              <div className="rounded-xl border border-[#1F2937] bg-[#111827] px-5 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">
                  Cerebras catalog
                </p>
                <p className="font-mono text-2xl font-semibold text-[#F9FAFB]">
                  {CEREBRAS_MODELS.length}
                </p>
              </div>
            </div>

            {/* Filter controls */}
            <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-[#1F2937] bg-[#111827] p-4">
              {/* Min params slider */}
              <div className="flex-1 min-w-[200px]">
                <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">
                  Min parameters: {minParams > 0 ? `${minParams}B+` : 'Any'}
                </label>
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={1}
                  value={minParams}
                  onChange={(e) => setMinParams(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#1F2937] accent-[#6366F1]"
                />
                <div className="mt-1 flex justify-between text-xs text-[#6B7280]">
                  <span>Any</span>
                  <span>50B</span>
                  <span>100B</span>
                  <span>200B</span>
                </div>
              </div>

              {/* Architecture filter */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">
                  Architecture
                </label>
                <div className="flex gap-1 rounded-lg bg-[#0B0F19] p-1">
                  {(['All', 'Dense', 'MoE'] as ArchFilter[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setArchFilter(f)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        archFilter === f
                          ? 'bg-[#6366F1]/15 text-[#6366F1]'
                          : 'text-[#9CA3AF] hover:text-[#F9FAFB]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">
                  Sort by
                </label>
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as typeof sortBy)
                  }
                  className="rounded-lg border border-[#1F2937] bg-[#0B0F19] px-3 py-1.5 text-sm text-[#F9FAFB] outline-none focus:border-[#6366F1]"
                >
                  <option value="quickScore">Quick Score</option>
                  <option value="downloads">Downloads (30d)</option>
                  <option value="likes">Likes</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-[#1F2937]">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#1F2937] bg-[#111827]">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
                        Model
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
                        Lab
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
                        Params
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
                        Downloads (30d)
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
                        Likes
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
                        On Cerebras?
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
                        Quick Score
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2937]">
                    {filteredModels.map((model) => {
                      const modelId = model.modelId ?? model.id;
                      const name = modelId.split('/').pop() ?? modelId;
                      const isMoE = isMoEFromTags(model);

                      return (
                        <tr
                          key={modelId}
                          onClick={() => handleRowClick(modelId)}
                          className="cursor-pointer bg-[#0B0F19] transition-colors hover:bg-[#111827]"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[#F9FAFB]">
                                {name}
                              </span>
                              {isMoE && (
                                <Badge text="MoE" variant="warning" />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-[#9CA3AF]">
                              {model.lab}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-mono text-sm text-[#F9FAFB]">
                              {formatParams(model.estimatedParams)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-mono text-sm text-[#F9FAFB]">
                              {(model.downloadsLastMonth ?? 0).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-mono text-sm text-[#F9FAFB]">
                              {(model.likes ?? 0).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {model.onCerebras ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                                <svg
                                  className="h-3 w-3"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                Yes
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-[#1F2937] px-2.5 py-0.5 text-xs font-medium text-[#6B7280] ring-1 ring-inset ring-[#374151]">
                                No
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={`font-mono text-sm font-semibold ${getScoreColor(model.quickScore)}`}
                            >
                              {model.quickScore}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Empty state */}
              {filteredModels.length === 0 && (
                <div className="flex items-center justify-center py-16 bg-[#0B0F19]">
                  <p className="text-sm text-[#6B7280]">
                    No models match the current filters.
                  </p>
                </div>
              )}
            </div>

            {/* Table footer */}
            <p className="mt-3 text-xs text-[#6B7280]">
              Showing {filteredModels.length} of {models.length} trending models.
              Click any row to run a full X-ray analysis.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
