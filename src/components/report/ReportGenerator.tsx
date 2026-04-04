'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { generateReport } from '@/lib/api/cerebras';

interface AnalysisData {
  modelName?: string;
  compositeScore?: number;
  verdict?: string;
  breakdown?: Record<string, { score: number; weight: number; weighted: number }>;
  architecture?: Record<string, unknown>;
  wseFit?: Record<string, unknown>;
  speedSensitivity?: Record<string, unknown>;
  agenticFit?: Record<string, unknown>;
  competitiveGap?: Record<string, unknown>;
  demandSignal?: Record<string, unknown>;
  reapPotential?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ReportGeneratorProps {
  analysisData: AnalysisData;
  modelName: string;
}

interface ParsedReport {
  executiveSummary: string;
  strengths: string[];
  risks: string[];
  readiness: string;
  recommendation: string;
}

function buildPrompt(data: AnalysisData, modelName: string): string {
  const sections = [
    `# ModelScope Analysis Report Request`,
    ``,
    `You are a Cerebras product analyst. Generate a concise executive summary for the model **${modelName}** based on the following analysis data.`,
    ``,
    `## Composite Score: ${data.compositeScore ?? 'N/A'}/100`,
    `## Verdict: ${data.verdict ?? 'N/A'}`,
    ``,
    `## Module Scores Breakdown:`,
    data.breakdown
      ? Object.entries(data.breakdown)
          .map(
            ([k, v]) =>
              `- **${k}**: score=${v.score}, weight=${Math.round(v.weight * 100)}%, weighted=${v.weighted.toFixed(1)}`,
          )
          .join('\n')
      : 'No breakdown available.',
    ``,
    `## Architecture Analysis:`,
    JSON.stringify(data.architecture ?? {}, null, 2),
    ``,
    `## WSE Fit Analysis:`,
    JSON.stringify(data.wseFit ?? {}, null, 2),
    ``,
    `## Speed Sensitivity Analysis:`,
    JSON.stringify(data.speedSensitivity ?? {}, null, 2),
    ``,
    `## Agentic Fit Analysis:`,
    JSON.stringify(data.agenticFit ?? {}, null, 2),
    ``,
    `## Competitive Gap Analysis:`,
    JSON.stringify(data.competitiveGap ?? {}, null, 2),
    ``,
    `## Demand Signal Analysis:`,
    JSON.stringify(data.demandSignal ?? {}, null, 2),
    ``,
    `## REAP Potential Analysis:`,
    JSON.stringify(data.reapPotential ?? {}, null, 2),
    ``,
    `---`,
    ``,
    `Generate a structured report with these sections:`,
    `1. **Executive Summary** (2-3 sentences)`,
    `2. **Key Strengths** (bullet points)`,
    `3. **Key Risks / Concerns** (bullet points)`,
    `4. **WSE Deployment Readiness** (1-2 sentences)`,
    `5. **Recommendation** (clear GO / EVALUATE / SKIP rationale)`,
    ``,
    `Be direct and actionable. Focus on what matters for a Cerebras product decision.`,
  ];

  return sections.join('\n');
}

function parseReport(text: string): ParsedReport {
  const result: ParsedReport = {
    executiveSummary: '',
    strengths: [],
    risks: [],
    readiness: '',
    recommendation: '',
  };

  // Split into sections by heading patterns
  const lines = text.split('\n');
  let currentSection = '';

  for (const line of lines) {
    const lower = line.toLowerCase().replace(/[#*]/g, '').trim();

    // Detect section headings
    if (lower.includes('executive summary')) {
      currentSection = 'executive';
      continue;
    } else if (lower.includes('key strength') || lower.includes('strengths')) {
      currentSection = 'strengths';
      continue;
    } else if (
      lower.includes('key risk') ||
      lower.includes('risks') ||
      lower.includes('concerns')
    ) {
      currentSection = 'risks';
      continue;
    } else if (lower.includes('deployment readiness') || lower.includes('wse')) {
      currentSection = 'readiness';
      continue;
    } else if (lower.includes('recommendation')) {
      currentSection = 'recommendation';
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed || trimmed === '---') continue;

    const bulletContent = trimmed.replace(/^[-*]\s*/, '');

    switch (currentSection) {
      case 'executive':
        result.executiveSummary += (result.executiveSummary ? ' ' : '') + trimmed;
        break;
      case 'strengths':
        if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          result.strengths.push(bulletContent);
        } else if (result.strengths.length > 0) {
          // continuation of previous bullet
          result.strengths[result.strengths.length - 1] += ' ' + trimmed;
        } else {
          result.strengths.push(trimmed);
        }
        break;
      case 'risks':
        if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          result.risks.push(bulletContent);
        } else if (result.risks.length > 0) {
          result.risks[result.risks.length - 1] += ' ' + trimmed;
        } else {
          result.risks.push(trimmed);
        }
        break;
      case 'readiness':
        result.readiness += (result.readiness ? ' ' : '') + trimmed;
        break;
      case 'recommendation':
        result.recommendation += (result.recommendation ? ' ' : '') + trimmed;
        break;
    }
  }

  return result;
}

function InlineBold({ text }: { text: string }) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-[#0F172A]">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function SkeletonLine({ width }: { width: string }) {
  return (
    <div
      className="h-3.5 rounded-md"
      style={{
        width,
        background:
          'linear-gradient(90deg, #E2E8F0 25%, #F1F5F9 50%, #E2E8F0 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
      }}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-fade-in space-y-6">
      {/* Executive summary skeleton */}
      <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4 space-y-2.5">
        <SkeletonLine width="40%" />
        <SkeletonLine width="100%" />
        <SkeletonLine width="90%" />
        <SkeletonLine width="70%" />
      </div>

      {/* Strengths skeleton */}
      <div className="rounded-lg border-l-4 border-l-emerald-400 bg-[#F8FAFC] p-4 space-y-2.5">
        <SkeletonLine width="30%" />
        <SkeletonLine width="85%" />
        <SkeletonLine width="75%" />
        <SkeletonLine width="80%" />
      </div>

      {/* Risks skeleton */}
      <div className="rounded-lg border-l-4 border-l-amber-400 bg-[#F8FAFC] p-4 space-y-2.5">
        <SkeletonLine width="30%" />
        <SkeletonLine width="80%" />
        <SkeletonLine width="70%" />
      </div>

      {/* Recommendation skeleton */}
      <div className="rounded-lg bg-indigo-50 p-4 space-y-2.5">
        <SkeletonLine width="35%" />
        <SkeletonLine width="95%" />
        <SkeletonLine width="60%" />
      </div>

      <div className="flex items-center justify-center gap-2 pt-2">
        <svg
          className="h-4 w-4 animate-spin text-[#6366F1]"
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
        <p className="text-xs text-[#94A3B8]">
          Generating report via Cerebras inference...
        </p>
      </div>
    </div>
  );
}

export default function ReportGenerator({
  analysisData,
  modelName,
}: ReportGeneratorProps) {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const hasAutoGenerated = useRef(false);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const prompt = buildPrompt(analysisData, modelName);
      const result = await generateReport(prompt);
      setReport(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to generate report. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [analysisData, modelName]);

  // Auto-generate on mount if analysis data is available
  useEffect(() => {
    if (hasAutoGenerated.current) return;
    if (!analysisData || Object.keys(analysisData).length === 0) return;
    hasAutoGenerated.current = true;
    handleGenerate();
  }, [analysisData, handleGenerate]);

  async function handleCopy() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = report;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const parsed = report ? parseReport(report) : null;

  return (
    <div className="rounded-[16px] border border-[#E2E8F0] bg-[#FFFFFF] p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wider text-[#475569] uppercase">
          AI Summary
        </h3>

        <div className="flex items-center gap-2">
          {report && (
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-medium text-[#475569] transition-colors hover:border-[#CBD5E1] hover:text-[#0F172A]"
            >
              {copied ? (
                <>
                  <svg
                    className="h-3.5 w-3.5 text-emerald-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
                    <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.44A1.5 1.5 0 008.378 6H4.5z" />
                  </svg>
                  Copy summary
                </>
              )}
            </button>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#6366F1] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#5558E6] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg
                  className="h-3.5 w-3.5 animate-spin"
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
                Generating...
              </>
            ) : (
              <>
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a1 1 0 01-.784.785l-1.192.238a1 1 0 000 1.962l1.192.238a1 1 0 01.785.785l.238 1.192a1 1 0 001.962 0l.238-1.192a1 1 0 01.785-.785l1.192-.238a1 1 0 000-1.962l-1.192-.238a1 1 0 01-.785-.785l-.238-1.192zM6.949 5.684a1 1 0 00-1.898 0l-.683 2.051a1 1 0 01-.633.633l-2.051.683a1 1 0 000 1.898l2.051.683a1 1 0 01.633.633l.683 2.051a1 1 0 001.898 0l.683-2.051a1 1 0 01.633-.633l2.051-.683a1 1 0 000-1.898l-2.051-.683a1 1 0 01-.633-.633L6.95 5.684zM13.949 13.684a1 1 0 00-1.898 0l-.184.551a1 1 0 01-.632.633l-.551.183a1 1 0 000 1.898l.551.183a1 1 0 01.633.633l.183.551a1 1 0 001.898 0l.184-.551a1 1 0 01.632-.633l.551-.183a1 1 0 000-1.898l-.551-.184a1 1 0 01-.633-.632l-.183-.551z" />
                </svg>
                {report ? 'Regenerate' : 'Generate AI Summary'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Loading state - skeleton shimmer */}
      {loading && !report && <LoadingSkeleton />}

      {/* Structured report output */}
      {parsed && !loading && (
        <div className="animate-fade-in space-y-4">
          {/* Executive Summary */}
          {parsed.executiveSummary && (
            <div className="rounded-lg border border-indigo-200/60 bg-indigo-50/60 p-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
                Executive Summary
              </h4>
              <p className="text-sm leading-relaxed text-[#334155]">
                <InlineBold text={parsed.executiveSummary} />
              </p>
            </div>
          )}

          {/* Key Strengths */}
          {parsed.strengths.length > 0 && (
            <div className="rounded-lg border border-[#E2E8F0] border-l-4 border-l-emerald-400 bg-[#F8FAFC] p-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Key Strengths
              </h4>
              <ul className="space-y-1.5">
                {parsed.strengths.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm leading-relaxed text-[#475569]"
                  >
                    <svg
                      className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>
                      <InlineBold text={item} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Key Risks */}
          {parsed.risks.length > 0 && (
            <div className="rounded-lg border border-[#E2E8F0] border-l-4 border-l-amber-400 bg-[#F8FAFC] p-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
                Key Risks / Concerns
              </h4>
              <ul className="space-y-1.5">
                {parsed.risks.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm leading-relaxed text-[#475569]"
                  >
                    <svg
                      className="mt-1 h-3.5 w-3.5 shrink-0 text-amber-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>
                      <InlineBold text={item} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* WSE Deployment Readiness */}
          {parsed.readiness && (
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#475569]">
                WSE Deployment Readiness
              </h4>
              <p className="text-sm leading-relaxed text-[#475569]">
                <InlineBold text={parsed.readiness} />
              </p>
            </div>
          )}

          {/* Recommendation */}
          {parsed.recommendation && (
            <div className="rounded-lg bg-indigo-50 p-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
                Recommendation
              </h4>
              <p className="text-sm font-medium leading-relaxed text-indigo-900">
                <InlineBold text={parsed.recommendation} />
              </p>
            </div>
          )}

          {/* Powered by footer */}
          <div className="flex items-center justify-center gap-1.5 border-t border-[#E2E8F0] pt-4">
            <svg
              className="h-3.5 w-3.5 text-[#94A3B8]"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-[11px] text-[#94A3B8]">
              Powered by Cerebras Inference
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
