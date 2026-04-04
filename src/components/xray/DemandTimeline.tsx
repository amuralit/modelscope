'use client';

interface DemandResult {
  downloads_total: number;
  downloads_30d: number;
  likes: number;
  lab_name: string;
  lab_tier: string;
  lab_tier_score: number;
  license: string;
  license_score: number;
  recency_days: number;
  score: number;
}

interface DemandTimelineProps {
  demandResult: DemandResult;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function downloadTrend(total: number, last30d: number): 'up' | 'down' | 'neutral' {
  if (total === 0) return 'neutral';
  // If last 30d is more than ~10% of total, trending up
  const ratio = last30d / total;
  if (ratio > 0.15) return 'up';
  if (ratio < 0.03) return 'down';
  return 'neutral';
}

function recencyLabel(days: number): { text: string; color: string } {
  if (days <= 7) return { text: 'This week', color: 'text-emerald-400' };
  if (days <= 30) return { text: 'This month', color: 'text-emerald-400' };
  if (days <= 90) return { text: `${Math.round(days / 7)} weeks ago`, color: 'text-amber-400' };
  if (days <= 365) return { text: `${Math.round(days / 30)} months ago`, color: 'text-amber-400' };
  return { text: `${(days / 365).toFixed(1)} years ago`, color: 'text-red-400' };
}

function labTierVariant(tier: string): { bg: string; text: string; ring: string } {
  const t = tier.toLowerCase();
  if (t === 'tier 1' || t === 't1' || t.includes('major'))
    return {
      bg: 'bg-indigo-500/15',
      text: 'text-indigo-400',
      ring: 'ring-indigo-500/20',
    };
  if (t === 'tier 2' || t === 't2' || t.includes('notable'))
    return {
      bg: 'bg-amber-500/15',
      text: 'text-amber-400',
      ring: 'ring-amber-500/20',
    };
  return {
    bg: 'bg-[#1F2937]',
    text: 'text-[#9CA3AF]',
    ring: 'ring-[#374151]',
  };
}

function licenseVariant(score: number): { bg: string; text: string; ring: string } {
  if (score >= 80)
    return {
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-400',
      ring: 'ring-emerald-500/20',
    };
  if (score >= 50)
    return {
      bg: 'bg-amber-500/15',
      text: 'text-amber-400',
      ring: 'ring-amber-500/20',
    };
  return {
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    ring: 'ring-red-500/20',
  };
}

const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'neutral' }) => {
  if (trend === 'up')
    return (
      <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z"
          clipRule="evenodd"
        />
      </svg>
    );
  if (trend === 'down')
    return (
      <svg className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z"
          clipRule="evenodd"
        />
      </svg>
    );
  return (
    <svg className="h-4 w-4 text-[#6B7280]" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z"
        clipRule="evenodd"
      />
    </svg>
  );
};

export default function DemandTimeline({ demandResult }: DemandTimelineProps) {
  const {
    downloads_total,
    downloads_30d,
    likes,
    lab_name,
    lab_tier,
    lab_tier_score,
    license,
    license_score,
    recency_days,
    score,
  } = demandResult;

  const trend = downloadTrend(downloads_total, downloads_30d);
  const recency = recencyLabel(recency_days);
  const labStyle = labTierVariant(lab_tier);
  const licStyle = licenseVariant(license_score);

  // Recency progress (365 days = 0%, 0 days = 100%)
  const recencyPct = Math.max(0, Math.min(100, ((365 - recency_days) / 365) * 100));

  return (
    <div className="rounded-[12px] border border-[#1F2937] bg-[#111827] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#F9FAFB]">
          Demand Signals
        </h3>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-lg font-semibold text-[#F9FAFB]">
            {score}
          </span>
          <span className="text-xs text-[#6B7280]">/ 100</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Left: metric cards */}
        <div className="space-y-3">
          {/* Downloads */}
          <div className="rounded-[12px] border border-[#1F2937] bg-[#0B0F19] px-5 py-4 transition-colors hover:border-[#374151]">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">
              Total Downloads
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-semibold text-[#F9FAFB]">
                {formatNumber(downloads_total)}
              </span>
              <span className="ml-auto self-center">
                <TrendIcon trend={trend} />
              </span>
            </div>
            <p className="mt-1 text-xs text-[#6B7280]">
              {formatNumber(downloads_30d)} in last 30 days
            </p>
          </div>

          {/* Likes */}
          <div className="rounded-[12px] border border-[#1F2937] bg-[#0B0F19] px-5 py-4 transition-colors hover:border-[#374151]">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">
              Likes
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-semibold text-[#F9FAFB]">
                {formatNumber(likes)}
              </span>
              <svg
                className="ml-auto h-4 w-4 self-center text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.723.723 0 01-.692 0l-.002-.001z" />
              </svg>
            </div>
            <p className="mt-1 text-xs text-[#6B7280]">Community engagement</p>
          </div>

          {/* 30-day Trending */}
          <div className="rounded-[12px] border border-[#1F2937] bg-[#0B0F19] px-5 py-4 transition-colors hover:border-[#374151]">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">
              30-Day Velocity
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-semibold text-[#F9FAFB]">
                {downloads_total > 0
                  ? ((downloads_30d / downloads_total) * 100).toFixed(1)
                  : '0'}
                %
              </span>
              <span className="text-sm font-medium text-[#6B7280]">of total</span>
            </div>
            <p className="mt-1 text-xs text-[#6B7280]">
              Recent download share
            </p>
          </div>
        </div>

        {/* Right: badges + recency */}
        <div className="space-y-3">
          {/* Lab tier badge */}
          <div className="rounded-[12px] border border-[#1F2937] bg-[#0B0F19] px-5 py-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">
              Lab / Publisher
            </p>
            <p className="mb-2 text-sm font-medium text-[#F9FAFB]">{lab_name}</p>
            <span
              className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${labStyle.bg} ${labStyle.text} ${labStyle.ring}`}
            >
              {lab_tier}
              <span className="ml-1.5 font-mono text-[10px] opacity-70">
                ({lab_tier_score})
              </span>
            </span>
          </div>

          {/* License badge */}
          <div className="rounded-[12px] border border-[#1F2937] bg-[#0B0F19] px-5 py-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">
              License
            </p>
            <span
              className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${licStyle.bg} ${licStyle.text} ${licStyle.ring}`}
            >
              {license}
              <span className="ml-1.5 font-mono text-[10px] opacity-70">
                ({license_score})
              </span>
            </span>
          </div>

          {/* Recency indicator */}
          <div className="rounded-[12px] border border-[#1F2937] bg-[#0B0F19] px-5 py-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">
              Model Recency
            </p>
            <div className="mb-2 flex items-baseline gap-2">
              <span className={`text-sm font-medium ${recency.color}`}>
                {recency.text}
              </span>
              <span className="text-xs text-[#6B7280]">
                ({recency_days}d ago)
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#1F2937]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${recencyPct}%`,
                  backgroundColor:
                    recencyPct > 66
                      ? '#10B981'
                      : recencyPct > 33
                        ? '#F59E0B'
                        : '#EF4444',
                }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-[#6B7280]">
              <span>1 year+</span>
              <span>Today</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
