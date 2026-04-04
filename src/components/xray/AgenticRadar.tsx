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
}

interface AgenticRadarProps {
  agenticResult: AgenticResult;
}

const AXIS_LABELS: Record<keyof RadarValues, string> = {
  tool_calling: 'Tool Calling',
  structured_output: 'Structured Output',
  context_length: 'Context Length',
  reasoning: 'Reasoning',
  code_quality: 'Code Quality',
  multi_turn: 'Multi-Turn',
};

interface FeatureBadge {
  label: string;
  supported: boolean;
}

export default function AgenticRadar({ agenticResult }: AgenticRadarProps) {
  const { radar_values, tool_calling_supported, structured_output_supported, has_reasoning_tokens } =
    agenticResult;

  const chartData = (Object.keys(AXIS_LABELS) as (keyof RadarValues)[]).map(
    (key) => ({
      axis: AXIS_LABELS[key],
      value: radar_values[key],
      fullMark: 100,
    })
  );

  const features: FeatureBadge[] = [
    { label: 'Tool Calling', supported: tool_calling_supported },
    { label: 'JSON Mode', supported: structured_output_supported },
    { label: 'Reasoning Tokens', supported: has_reasoning_tokens },
    { label: 'Multi-Turn', supported: radar_values.multi_turn >= 50 },
    { label: 'Long Context', supported: radar_values.context_length >= 60 },
  ];

  return (
    <div className="rounded-[12px] border border-[#E2E8F0] bg-[#FFFFFF] p-5">
      <h3 className="mb-4 text-sm font-semibold text-[#0F172A]">
        Agentic Fit Radar <InfoTip text="Evaluates the model's readiness for AI agent workflows — tool calling, structured output, reasoning, code, and multi-turn dialogue." />
      </h3>

      {/* Radar chart */}
      <div className="mx-auto h-72 w-full max-w-md">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
            <PolarGrid stroke="#E2E8F0" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: '#475569', fontSize: 11 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: '#94A3B8', fontSize: 9 }}
              axisLine={false}
              tickCount={5}
            />
            <RTooltip
              contentStyle={{
                backgroundColor: '#E2E8F0',
                border: '1px solid #CBD5E1',
                borderRadius: 8,
                fontSize: 12,
                color: '#0F172A',
              }}
              formatter={(value) => [`${value}`, 'Score']}
              labelStyle={{ color: '#475569' }}
            />
            <Radar
              name="Agentic Score"
              dataKey="value"
              stroke="#6366F1"
              strokeWidth={2}
              fill="#6366F1"
              fillOpacity={0.2}
              dot={{
                r: 4,
                fill: '#6366F1',
                stroke: '#FFFFFF',
                strokeWidth: 2,
              }}
              activeDot={{
                r: 6,
                fill: '#818CF8',
                stroke: '#FFFFFF',
                strokeWidth: 2,
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Feature support badges */}
      <div className="mt-4 border-t border-[#E2E8F0] pt-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#475569]">
          Feature Support
        </p>
        <div className="flex flex-wrap gap-2">
          {features.map((feat) => (
            <span
              key={feat.label}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                feat.supported
                  ? 'bg-emerald-500/15 text-emerald-600 ring-emerald-500/20'
                  : 'bg-red-500/10 text-red-600/70 ring-red-500/15'
              }`}
            >
              <span className="text-sm">{feat.supported ? '\u2713' : '\u2717'}</span>
              {feat.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
