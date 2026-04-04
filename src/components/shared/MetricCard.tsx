'use client';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
}

const trendIcons: Record<string, React.ReactNode> = {
  up: (
    <svg
      className="h-4 w-4 text-emerald-400"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z"
        clipRule="evenodd"
      />
    </svg>
  ),
  down: (
    <svg
      className="h-4 w-4 text-red-400"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z"
        clipRule="evenodd"
      />
    </svg>
  ),
  neutral: (
    <svg
      className="h-4 w-4 text-[#6B7280]"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

export default function MetricCard({
  label,
  value,
  unit,
  subtitle,
  trend,
}: MetricCardProps) {
  return (
    <div className="rounded-[12px] border border-[#1F2937] bg-[#111827] px-5 py-4 transition-colors hover:border-[#374151]">
      <p className="mb-1 text-xs font-medium tracking-wide text-[#9CA3AF] uppercase">
        {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-2xl font-semibold text-[#F9FAFB]">
          {value}
        </span>
        {unit && (
          <span className="text-sm font-medium text-[#6B7280]">{unit}</span>
        )}
        {trend && <span className="ml-auto self-center">{trendIcons[trend]}</span>}
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-[#6B7280]">{subtitle}</p>
      )}
    </div>
  );
}
