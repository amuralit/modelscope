'use client';

import type { ModuleStatus } from '@/lib/types/model';

interface ProgressPanelProps {
  modules: ModuleStatus[];
}

/* ------------------------------------------------------------------ */
/*  Status icons                                                       */
/* ------------------------------------------------------------------ */

function Spinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin text-[#6366F1]"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-5 w-5 text-[#10B981]"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      className="h-5 w-5 text-[#EF4444]"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PendingIcon() {
  return (
    <div className="h-5 w-5 flex items-center justify-center">
      <div className="h-2 w-2 rounded-full bg-[#94A3B8]" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Status-dependent styles                                            */
/* ------------------------------------------------------------------ */

function statusBorder(status: ModuleStatus['status']): string {
  switch (status) {
    case 'running':
      return 'border-[#6366F1]/50';
    case 'completed':
      return 'border-[#10B981]/30';
    case 'error':
      return 'border-[#EF4444]/30';
    default:
      return 'border-[#E2E8F0]';
  }
}

function statusGlow(status: ModuleStatus['status']): string {
  switch (status) {
    case 'running':
      return 'shadow-[0_0_12px_rgba(99,102,241,0.15)]';
    case 'completed':
      return 'shadow-[0_0_8px_rgba(16,185,129,0.10)]';
    case 'error':
      return 'shadow-[0_0_8px_rgba(239,68,68,0.10)]';
    default:
      return '';
  }
}

function statusIcon(status: ModuleStatus['status']) {
  switch (status) {
    case 'running':
      return <Spinner />;
    case 'completed':
      return <CheckIcon />;
    case 'error':
      return <ErrorIcon />;
    default:
      return <PendingIcon />;
  }
}

/* ------------------------------------------------------------------ */
/*  Module card                                                        */
/* ------------------------------------------------------------------ */

function ModuleCard({ module }: { module: ModuleStatus }) {
  const { name, status, elapsed, error } = module;

  return (
    <div
      className={`
        flex flex-col items-center gap-2.5 rounded-xl border
        bg-[#FFFFFF] px-4 py-4 min-w-[140px] flex-1
        transition-all duration-500 ease-out
        ${statusBorder(status)}
        ${statusGlow(status)}
      `}
    >
      {/* Icon */}
      <div className="transition-transform duration-300">
        {statusIcon(status)}
      </div>

      {/* Module name */}
      <span
        className={`
          text-center text-xs font-medium leading-tight
          transition-colors duration-300
          ${status === 'pending' ? 'text-[#94A3B8]' : 'text-[#0F172A]'}
        `}
      >
        {name}
      </span>

      {/* Elapsed time */}
      {status === 'completed' && elapsed != null && (
        <span className="text-[10px] text-[#10B981] tabular-nums">
          {elapsed.toFixed(1)}s
        </span>
      )}

      {/* Running indicator bar */}
      {status === 'running' && (
        <div className="h-0.5 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
          <div className="h-full w-1/3 animate-[shimmer_1.4s_ease-in-out_infinite] rounded-full bg-[#6366F1]" />
        </div>
      )}

      {/* Error message */}
      {status === 'error' && error && (
        <p className="mt-0.5 text-center text-[10px] leading-tight text-[#EF4444]">
          {error}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Progress panel                                                     */
/* ------------------------------------------------------------------ */

export default function ProgressPanel({ modules }: ProgressPanelProps) {
  const completedCount = modules.filter((m) => m.status === 'completed').length;
  const total = modules.length;

  return (
    <div className="w-full rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-6">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#0F172A]">
          Analysis Progress
        </h3>
        <span className="text-xs tabular-nums text-[#475569]">
          {completedCount} / {total} modules
        </span>
      </div>

      {/* Overall progress bar */}
      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
        <div
          className="h-full rounded-full bg-[#6366F1] transition-all duration-700 ease-out"
          style={{ width: `${total > 0 ? (completedCount / total) * 100 : 0}%` }}
        />
      </div>

      {/* Module cards */}
      <div className="flex flex-wrap gap-3">
        {modules.map((mod) => (
          <ModuleCard key={mod.name} module={mod} />
        ))}
      </div>

      {/* Shimmer keyframes injected via style tag (Tailwind v4 compatible) */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}
