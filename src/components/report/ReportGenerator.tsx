'use client';

import { useState } from 'react';
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

function formatReport(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    // Headings
    if (line.startsWith('### ')) {
      nodes.push(
        <h4
          key={i}
          className="mt-4 mb-2 text-sm font-semibold text-[#0F172A]"
        >
          {line.replace(/^###\s*/, '').replace(/\*\*/g, '')}
        </h4>,
      );
    } else if (line.startsWith('## ')) {
      nodes.push(
        <h3
          key={i}
          className="mt-5 mb-2 text-base font-bold text-[#0F172A]"
        >
          {line.replace(/^##\s*/, '').replace(/\*\*/g, '')}
        </h3>,
      );
    } else if (line.startsWith('# ')) {
      nodes.push(
        <h2
          key={i}
          className="mt-5 mb-3 text-lg font-bold text-[#0F172A]"
        >
          {line.replace(/^#\s*/, '').replace(/\*\*/g, '')}
        </h2>,
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      // Bullet points with bold handling
      const content = line.replace(/^[-*]\s*/, '');
      const parts = content.split(/\*\*(.*?)\*\*/g);
      nodes.push(
        <li key={i} className="ml-4 list-disc text-sm text-[#475569]">
          {parts.map((part, j) =>
            j % 2 === 1 ? (
              <strong key={j} className="font-semibold text-[#0F172A]">
                {part}
              </strong>
            ) : (
              <span key={j}>{part}</span>
            ),
          )}
        </li>,
      );
    } else if (line.startsWith('---')) {
      nodes.push(
        <hr key={i} className="my-4 border-[#E2E8F0]" />,
      );
    } else if (line.trim() === '') {
      nodes.push(<div key={i} className="h-2" />);
    } else {
      // Regular paragraph with bold handling
      const parts = line.split(/\*\*(.*?)\*\*/g);
      nodes.push(
        <p key={i} className="text-sm leading-relaxed text-[#475569]">
          {parts.map((part, j) =>
            j % 2 === 1 ? (
              <strong key={j} className="font-semibold text-[#0F172A]">
                {part}
              </strong>
            ) : (
              <span key={j}>{part}</span>
            ),
          )}
        </p>,
      );
    }
  });

  return nodes;
}

export default function ReportGenerator({
  analysisData,
  modelName,
}: ReportGeneratorProps) {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
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
  }

  async function handleCopy() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
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
                Generate AI Summary
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

      {/* Loading state */}
      {loading && !report && (
        <div className="flex items-center justify-center py-12">
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
            <p className="text-sm text-[#475569]">
              Generating report via Cerebras inference...
            </p>
          </div>
        </div>
      )}

      {/* Report output */}
      {report && (
        <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-5">
          <ul className="list-none space-y-0">
            {formatReport(report)}
          </ul>
        </div>
      )}

      {/* Empty state */}
      {!report && !loading && !error && (
        <div className="flex items-center justify-center py-10">
          <p className="text-sm text-[#94A3B8]">
            Click &ldquo;Generate AI Summary&rdquo; to create an executive
            report powered by Cerebras.
          </p>
        </div>
      )}
    </div>
  );
}
