'use client';

import { useState, useMemo } from 'react';

interface REAPResult {
  compatible: boolean;
  is_moe: boolean;
  num_experts: number;
  estimated_prunable_percent: number;
  memory_savings_bytes: number;
  original_wafer_count: number;
  pruned_wafer_count: number;
  has_reap_precedent: boolean;
  score: number;
  reason: string;
}

interface REAPGridProps {
  reapResult: REAPResult;
}

function bytesToGB(bytes: number): number {
  return bytes / (1024 * 1024 * 1024);
}

function formatBytes(bytes: number): string {
  const gb = bytesToGB(bytes);
  if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

type ExpertStatus = 'keep' | 'maybe' | 'prune';

function getExpertStatus(
  index: number,
  total: number,
  prunablePercent: number
): ExpertStatus {
  const pruneCount = Math.round((prunablePercent / 100) * total);
  const maybeCount = Math.round((prunablePercent / 200) * total);

  // Last N experts are prunable, some before that are "maybe"
  const keepBoundary = total - pruneCount - maybeCount;
  const maybeBoundary = total - pruneCount;

  if (index < keepBoundary) return 'keep';
  if (index < maybeBoundary) return 'maybe';
  return 'prune';
}

const STATUS_STYLES: Record<ExpertStatus, { bg: string; border: string; text: string }> = {
  keep: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-600' },
  maybe: { bg: 'bg-amber-500/20', border: 'border-amber-500/40', text: 'text-amber-600' },
  prune: { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-600' },
};

export default function REAPGrid({ reapResult }: REAPGridProps) {
  const {
    compatible,
    is_moe,
    num_experts,
    estimated_prunable_percent,
    memory_savings_bytes,
    original_wafer_count,
    pruned_wafer_count,
    has_reap_precedent,
    score,
    reason,
  } = reapResult;

  const [pruneSlider, setPruneSlider] = useState(estimated_prunable_percent);

  const expertStatuses = useMemo(
    () =>
      Array.from({ length: num_experts }, (_, i) =>
        getExpertStatus(i, num_experts, pruneSlider)
      ),
    [num_experts, pruneSlider]
  );

  const keepCount = expertStatuses.filter((s) => s === 'keep').length;
  const maybeCount = expertStatuses.filter((s) => s === 'maybe').length;
  const pruneCount = expertStatuses.filter((s) => s === 'prune').length;

  const adjustedSavings =
    memory_savings_bytes * (pruneSlider / Math.max(estimated_prunable_percent, 1));

  // Dense / not compatible => N/A card
  if (!is_moe || !compatible) {
    return (
      <div className="rounded-[12px] border border-[#E2E8F0] bg-[#FFFFFF] p-5">
        <h3 className="mb-4 text-sm font-semibold text-[#0F172A]">
          REAP Expert Pruning
        </h3>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#E2E8F0]">
            <svg
              className="h-6 w-6 text-[#94A3B8]"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-[#475569]">Not Applicable</p>
          <p className="mt-1 max-w-xs text-xs text-[#94A3B8]">
            {!is_moe
              ? 'REAP expert pruning is only applicable to Mixture-of-Experts models.'
              : reason}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[12px] border border-[#E2E8F0] bg-[#FFFFFF] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#0F172A]">
          REAP Expert Pruning
        </h3>
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-semibold text-[#0F172A]">
            {score}
          </span>
          <span className="text-xs text-[#94A3B8]">/ 100</span>
        </div>
      </div>

      {/* Expert grid */}
      <div className="mb-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#475569]">
          Expert Grid ({num_experts} experts)
        </p>
        <div
          className="grid gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${Math.min(num_experts, 16)}, minmax(0, 1fr))`,
          }}
        >
          {expertStatuses.map((status, i) => {
            const styles = STATUS_STYLES[status];
            return (
              <div
                key={i}
                className={`flex aspect-square items-center justify-center rounded-md border text-[10px] font-mono font-medium ${styles.bg} ${styles.border} ${styles.text}`}
                title={`Expert ${i}: ${status}`}
              >
                {num_experts <= 32 ? i : ''}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4 flex gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-emerald-500/40" />
          <span className="text-[#475569]">Keep ({keepCount})</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-amber-500/40" />
          <span className="text-[#475569]">Maybe ({maybeCount})</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-red-500/40" />
          <span className="text-[#475569]">Prune ({pruneCount})</span>
        </span>
      </div>

      {/* Pruning slider */}
      <div className="mb-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-[#475569]">
            Pruning Calculator
          </p>
          <span className="font-mono text-sm font-semibold text-[#0F172A]">
            {pruneSlider.toFixed(0)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={Math.min(estimated_prunable_percent * 2, 80)}
          step={1}
          value={pruneSlider}
          onChange={(e) => setPruneSlider(Number(e.target.value))}
          className="mb-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#E2E8F0] accent-indigo-500"
        />
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-[#94A3B8]">Memory savings</p>
            <p className="font-mono font-semibold text-emerald-600">
              {formatBytes(adjustedSavings)}
            </p>
          </div>
          <div>
            <p className="text-[#94A3B8]">Wafer reduction</p>
            <p className="font-mono font-semibold text-[#0F172A]">
              {original_wafer_count} &rarr; {pruned_wafer_count}
            </p>
          </div>
        </div>
      </div>

      {/* Precedent badge */}
      <div className="flex items-center gap-2 text-xs">
        {has_reap_precedent ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2.5 py-1 text-emerald-600 ring-1 ring-inset ring-emerald-500/20">
            <span>{'\u2713'}</span> Has REAP precedent
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md bg-[#E2E8F0] px-2.5 py-1 text-[#94A3B8] ring-1 ring-inset ring-[#CBD5E1]">
            No known REAP precedent
          </span>
        )}
        {reason && (
          <span className="text-[#94A3B8]">{reason}</span>
        )}
      </div>
    </div>
  );
}
