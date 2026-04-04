'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { generateReport } from '@/lib/api/cerebras';
import InfoTip from '@/components/shared/InfoTip';

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
  onReportReady?: (text: string) => void;
}

interface ParsedReport {
  executiveSummary: string;
  strengths: string[];
  risks: string[];
  readiness: string;
  recommendation: string;
}

function buildPrompt(data: AnalysisData, modelName: string): string {
  const arch = data.architecture as Record<string, any> ?? {};
  const wse = data.wseFit as Record<string, any> ?? {};
  const speed = data.speedSensitivity as Record<string, any> ?? {};
  const agentic = data.agenticFit as Record<string, any> ?? {};
  const gap = data.competitiveGap as Record<string, any> ?? {};
  const demand = data.demandSignal as Record<string, any> ?? {};

  const formatB = (n: number) => n >= 1e12 ? `${(n/1e12).toFixed(1)}T` : n >= 1e9 ? `${(n/1e9).toFixed(1)}B` : n >= 1e6 ? `${(n/1e6).toFixed(0)}M` : String(n);
  const formatGB = (b: number) => `${(b / (1024**3)).toFixed(1)}GB`;

  return `You are an AI Models Product Manager at Cerebras Systems writing a launch readiness report. Be specific with numbers, insightful about competitive positioning, and direct about the business case.

MODEL: ${modelName}
COMPOSITE SCORE: ${data.compositeScore ?? 'N/A'}/100 — VERDICT: ${data.verdict ?? 'N/A'}

ARCHITECTURE:
- Type: ${arch.isMoE ? 'Mixture of Experts' : 'Dense Transformer'} (${arch.architectureFamily ?? 'unknown'})
- Parameters: ${formatB(arch.parameterCount ?? 0)} total${arch.isMoE && arch.activeParameters ? `, ${formatB(arch.activeParameters)} active per token` : ''}
- Layers: ${arch.numLayers ?? '?'}, Heads: ${arch.numAttentionHeads ?? '?'} (${arch.numKVHeads ?? '?'} KV), Hidden: ${arch.hiddenSize ?? '?'}
- Attention: ${arch.attentionVariant ?? '?'} (${arch.attentionVariant === 'GQA' ? 'memory-efficient grouped queries' : arch.attentionVariant === 'MQA' ? 'single KV head' : 'standard multi-head'})
- Context Window: ${arch.contextWindow ? (arch.contextWindow >= 128000 ? '128K tokens' : `${(arch.contextWindow/1000).toFixed(0)}K tokens`) : '?'}
- Architecture Score: ${arch.score ?? '?'}/100

WSE-3 FIT:
- FP16 weight memory: ${wse.estimatedWeightBytes ? formatGB(wse.estimatedWeightBytes) : '?'}
- Fits on single WSE-3 (44GB SRAM): ${wse.fitsInSRAM ? 'YES' : 'NO — requires multi-wafer deployment'}
- SRAM utilization: ${wse.sramUtilization ? `${(wse.sramUtilization * 100).toFixed(0)}%` : '?'}
- WSE Fit Score: ${wse.score ?? '?'}/100

SPEED SENSITIVITY:
- Primary use cases: ${speed.primaryUseCases?.join(', ') ?? '?'}
- Estimated decode speed on Cerebras: ${speed.estimatedTokensPerSecond ?? '?'} tok/s
- Speedup vs GPU: ${speed.speedupOverGPU ? `${speed.speedupOverGPU.toFixed(1)}x` : '?'}
- Speed Score: ${speed.score ?? '?'}/100

AGENTIC CAPABILITIES:
- Tool calling: ${(agentic.toolUseCapability ?? 0) > 50 ? 'Supported' : 'Not detected'}
- Structured output: ${(agentic.instructionFollowing ?? 0) > 50 ? 'Supported' : 'Not detected'}
- Reasoning tokens: ${(agentic.reasoningDepth ?? 0) > 50 ? 'Yes' : 'No'}
- Agentic Score: ${agentic.score ?? '?'}/100

COMPETITIVE LANDSCAPE:
- Providers serving this model: ${gap.competitorsOffering?.length ?? 0} (${gap.competitorsOffering?.join(', ') || 'none'})
- Market gap: ${gap.marketGapSize ?? '?'}
- First-mover opportunity: ${gap.uniqueAdvantage ? 'YES' : 'No'}
- Competitive Score: ${gap.score ?? '?'}/100

DEMAND SIGNAL:
- Downloads: ${demand.downloadsLastMonth?.toLocaleString?.() ?? '?'}
- Community interest: ${demand.communityInterest ?? '?'}/100
- Demand Score: ${demand.score ?? '?'}/100

SCORE BREAKDOWN:
${data.breakdown ? Object.entries(data.breakdown).map(([k, v]) => `  ${k}: ${v.score}/100 (weight ${Math.round(v.weight * 100)}%, contribution ${v.weighted.toFixed(1)})`).join('\n') : 'N/A'}

---

Write a structured report with EXACTLY these sections. IMPORTANT FORMATTING RULES:
- Each bullet point MUST be on its own line starting with "- "
- Do NOT combine multiple bullets on one line
- Be specific with numbers and business insights
- Each bullet should reference actual scores and data
- Write in concise, data-driven AWS 6-pager style (no fluff, every sentence earns its place)

## Executive Summary
(3-4 sentences summarizing the verdict, key opportunity, and recommended action. Include the composite score and the most important finding.)

## Key Strengths
(4-6 bullet points. Each should cite a specific score or metric. Example: "Architecture score of 92/100 indicates excellent WSE-3 compatibility — GQA attention enables efficient KV cache management")

## Key Risks / Concerns
(3-5 bullet points. Be specific about what scores are concerning and why. Include business implications.)

## WSE Deployment Readiness
(2-3 sentences about hardware fit, memory requirements, estimated performance, and any optimization recommendations.)

## Recommendation
(2-3 sentences with a clear GO/EVALUATE/SKIP rationale. If EVALUATE, specify what additional data points would tip the decision. If GO, suggest positioning strategy.)`;
}

/** Split text that may have inline bullets (• or - ) into separate lines */
function splitInlineBullets(text: string): string[] {
  // First split by newlines
  let lines = text.split('\n');
  // Then split any line that has inline bullets (• separator)
  const expanded: string[] = [];
  for (const line of lines) {
    if (line.includes('• ')) {
      const parts = line.split('• ').map(s => s.trim()).filter(Boolean);
      parts.forEach(p => expanded.push('- ' + p.replace(/^[-*]\s*/, '')));
    } else {
      expanded.push(line);
    }
  }
  return expanded;
}

function parseReport(text: string): ParsedReport {
  const result: ParsedReport = {
    executiveSummary: '',
    strengths: [],
    risks: [],
    readiness: '',
    recommendation: '',
  };

  const lines = splitInlineBullets(text);
  let currentSection = '';

  for (const line of lines) {
    const lower = line.toLowerCase().replace(/[#*]/g, '').trim();

    // Detect section headings
    if (lower.includes('executive summary')) { currentSection = 'executive'; continue; }
    if (lower.includes('key strength') || (lower.includes('strength') && !lower.includes('shortcoming'))) { currentSection = 'strengths'; continue; }
    if (lower.includes('key risk') || lower.includes('risks') || lower.includes('concerns')) { currentSection = 'risks'; continue; }
    if (lower.includes('deployment readiness') || lower.includes('wse')) { currentSection = 'readiness'; continue; }
    if (lower.includes('recommendation')) { currentSection = 'recommendation'; continue; }

    const trimmed = line.trim();
    if (!trimmed || trimmed === '---') continue;

    const isBullet = trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•');
    const bulletContent = trimmed.replace(/^[-*•]\s*/, '').trim();

    switch (currentSection) {
      case 'executive':
        result.executiveSummary += (result.executiveSummary ? ' ' : '') + trimmed.replace(/^[-*•]\s*/, '');
        break;
      case 'strengths':
        if (isBullet) {
          result.strengths.push(bulletContent);
        } else if (bulletContent && result.strengths.length > 0) {
          result.strengths[result.strengths.length - 1] += ' ' + bulletContent;
        } else if (bulletContent) {
          result.strengths.push(bulletContent);
        }
        break;
      case 'risks':
        if (isBullet) {
          result.risks.push(bulletContent);
        } else if (bulletContent && result.risks.length > 0) {
          result.risks[result.risks.length - 1] += ' ' + bulletContent;
        } else if (bulletContent) {
          result.risks.push(bulletContent);
        }
        break;
      case 'readiness':
        result.readiness += (result.readiness ? ' ' : '') + trimmed.replace(/^[-*•]\s*/, '');
        break;
      case 'recommendation':
        result.recommendation += (result.recommendation ? ' ' : '') + trimmed.replace(/^[-*•]\s*/, '');
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
  onReportReady,
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
      onReportReady?.(result);
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
          <InfoTip text="AI-generated executive summary powered by Cerebras Inference (Llama 3.1-8B). Auto-generates when analysis completes." />
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
          {/* Inline score summary bar */}
          {analysisData.breakdown && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
              {Object.entries(analysisData.breakdown).map(([key, val]) => {
                const v = val as { score: number; weight: number; weighted: number };
                const color = v.score >= 70 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : v.score >= 40 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-red-600 bg-red-50 border-red-200';
                return (
                  <div key={key} className={`rounded-lg border px-2 py-1.5 text-center ${color}`}>
                    <p className="font-mono text-base font-bold">{v.score}</p>
                    <p className="text-[9px] font-medium uppercase tracking-wide opacity-70">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                  </div>
                );
              })}
            </div>
          )}

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
