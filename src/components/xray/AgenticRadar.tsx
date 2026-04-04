'use client';

import InfoTip from '@/components/shared/InfoTip';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RTooltip,
} from 'recharts';

interface RadarValues {
  tool_calling: number;
  structured_output: number;
  context_length: number;
  reasoning: number;
  code_quality: number;
  multi_turn: number;
}

interface AgenticResult {
  radar_values: RadarValues;
  tool_calling_supported: boolean;
  structured_output_supported: boolean;
  has_reasoning_tokens: boolean;
  score?: number;
  useCases?: string[];
  limitations?: string[];
}

interface AgenticRadarProps {
  agenticResult: AgenticResult;
}

const AXIS_CONFIG: { key: keyof RadarValues; label: string; tip: string }[] = [
  { key: 'tool_calling', label: 'Tool Calling', tip: 'Can invoke external APIs via structured function calls' },
  { key: 'structured_output', label: 'Structured Output', tip: 'Generates valid JSON/schema-constrained responses' },
  { key: 'context_length', label: 'Context Length', tip: '128K+ = 100, 32K+ = 80, 8K+ = 50' },
  { key: 'reasoning', label: 'Reasoning', tip: 'Explicit chain-of-thought or reasoning tokens' },
  { key: 'code_quality', label: 'Code Quality', tip: 'Based on HumanEval/LiveCodeBench scores or model family baseline' },
  { key: 'multi_turn', label: 'Multi-Turn', tip: 'Maintains coherence across multiple conversation turns' },
];

function scoreColor(s: number): string {
  if (s >= 70) return 'text-emerald-600';
  if (s >= 40) return 'text-amber-600';
  return 'text-red-500';
}

function scoreBg(s: number): string {
  if (s >= 70) return 'bg-emerald-500';
  if (s >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

export default function AgenticRadar({ agenticResult }: AgenticRadarProps) {
  const { radar_values, tool_calling_supported, structured_output_supported, has_reasoning_tokens, score, useCases, limitations } =
    agenticResult;

  const chartData = AXIS_CONFIG.map(({ key, label }) => ({
    axis: label,
    value: radar_values[key],
    fullMark: 100,
  }));

  const features = [
    { label: 'Tool Calling', supported: tool_calling_supported },
    { label: 'JSON Mode', supported: structured_output_supported },
    { label: 'Reasoning Tokens', supported: has_reasoning_tokens },
    { label: 'Multi-Turn', supported: radar_values.multi_turn >= 50 },
    { label: 'Long Context', supported: radar_values.context_length >= 60 },
  ];

  const avgScore = score ?? Math.round(
    Object.values(radar_values).reduce((s, v) => s + v, 0) / 6,
  );

  return (
    <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-5">
      {/* Header with score */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#0F172A]">
          Agentic Fit Radar
          <InfoTip text="Evaluates the model's readiness for AI agent workflows — tool calling, structured output, reasoning, code, and multi-turn dialogue." />
        </h3>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-2xl font-bold ${scoreColor(avgScore)}`}>{avgScore}</span>
          <span className="text-[10px] text-[#94A3B8]">/ 100</span>
        </div>
      </div>

      {/* Radar chart */}
      <div className="mx-auto h-60 w-full max-w-sm">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="72%" data={chartData}>
            <PolarGrid stroke="#E2E8F0" />
            <PolarAngleAxis dataKey="axis" tick={{ fill: '#475569', fontSize: 10 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 8 }} axisLine={false} tickCount={5} />
            <RTooltip
              contentStyle={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 11, color: '#0F172A' }}
              formatter={(value) => [`${value}/100`, 'Score']}
            />
            <Radar name="Score" dataKey="value" stroke="#6366F1" strokeWidth={2} fill="#6366F1" fillOpacity={0.15}
              dot={{ r: 3.5, fill: '#6366F1', stroke: '#fff', strokeWidth: 1.5 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Score breakdown grid */}
      <div className="mb-4 grid grid-cols-3 gap-1.5">
        {AXIS_CONFIG.map(({ key, label }) => {
          const val = radar_values[key];
          return (
            <div key={key} className="flex items-center gap-2 rounded-md bg-[#F8FAFC] px-2 py-1.5">
              <div className="flex-1">
                <p className="text-[9px] font-medium text-[#94A3B8] uppercase">{label}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-1 w-10 rounded-full bg-[#E2E8F0] overflow-hidden">
                  <div className={`h-full rounded-full ${scoreBg(val)}`} style={{ width: `${val}%`, opacity: 0.7 }} />
                </div>
                <span className={`font-mono text-xs font-bold ${scoreColor(val)}`}>{val}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature support badges */}
      <div className="border-t border-[#E2E8F0] pt-3">
        <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-[#94A3B8]">Feature Support</p>
        <div className="flex flex-wrap gap-1.5">
          {features.map((feat) => (
            <span
              key={feat.label}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium ring-1 ring-inset ${
                feat.supported
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-red-50 text-red-400 ring-red-200'
              }`}
            >
              {feat.supported ? '✓' : '✗'} {feat.label}
            </span>
          ))}
        </div>
      </div>

      {/* Use cases + Limitations */}
      {(useCases?.length || limitations?.length) ? (
        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[#E2E8F0] pt-3">
          {useCases && useCases.length > 0 && (
            <div>
              <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-600">Best Use Cases</p>
              <ul className="space-y-1">
                {useCases.map((uc, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-[#475569]">
                    <span className="mt-0.5 text-emerald-500">&#x2022;</span>
                    {uc.replace(/[\u2011\u2010\u2012\u2013\u2014]/g, '-')}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {limitations && limitations.length > 0 && (
            <div>
              <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-amber-600">Limitations</p>
              <ul className="space-y-1">
                {limitations.map((lim, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-[#475569]">
                    <span className="mt-0.5 text-amber-500">&#x2022;</span>
                    {lim.replace(/[\u2011\u2010\u2012\u2013\u2014]/g, '-')}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
