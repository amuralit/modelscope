'use client';

interface Provider {
  name: string;
  serves_model: boolean;
  estimated_speed: number;
  estimated_price: number;
}

interface GapResult {
  on_cerebras: boolean;
  providers: Provider[];
  first_mover: boolean;
  speed_advantage_multiplier: number;
  score: number;
}

interface CompetitorTableProps {
  gapResult: GapResult;
}

function formatSpeed(tps: number): string {
  if (tps >= 1000) return `${(tps / 1000).toFixed(1)}k`;
  return tps.toFixed(0);
}

function formatPrice(price: number): string {
  if (price === 0) return 'Free';
  if (price < 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(2)}`;
}

export default function CompetitorTable({ gapResult }: CompetitorTableProps) {
  const {
    on_cerebras,
    providers,
    first_mover,
    speed_advantage_multiplier,
    score,
  } = gapResult;

  // Find max speed for the advantage column
  const maxOtherSpeed = Math.max(
    ...providers.filter((p) => p.name !== 'Cerebras').map((p) => p.estimated_speed),
    1
  );

  return (
    <div className="rounded-[12px] border border-[#E2E8F0] bg-[#FFFFFF] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#0F172A]">
          Competitive Landscape
        </h3>
        <div className="flex items-center gap-3">
          {first_mover && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-600 ring-1 ring-inset ring-amber-500/20">
              <svg
                className="h-3 w-3"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"
                  clipRule="evenodd"
                />
              </svg>
              First Mover
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-lg font-semibold text-[#0F172A]">
              {score}
            </span>
            <span className="text-xs text-[#94A3B8]">/ 100</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0]">
              <th className="pb-2 pr-4 text-xs font-medium uppercase tracking-wide text-[#94A3B8]">
                Provider
              </th>
              <th className="pb-2 pr-4 text-xs font-medium uppercase tracking-wide text-[#94A3B8]">
                Serves Model
              </th>
              <th className="pb-2 pr-4 text-xs font-medium uppercase tracking-wide text-[#94A3B8]">
                Speed (tok/s)
              </th>
              <th className="pb-2 pr-4 text-xs font-medium uppercase tracking-wide text-[#94A3B8]">
                Price ($/M tok)
              </th>
              <th className="pb-2 text-xs font-medium uppercase tracking-wide text-[#94A3B8]">
                Cerebras Adv.
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]/60">
            {providers.map((provider) => {
              const isCerebras = provider.name === 'Cerebras';
              const advantage =
                !isCerebras && provider.estimated_speed > 0
                  ? speed_advantage_multiplier
                  : null;

              return (
                <tr
                  key={provider.name}
                  className={
                    isCerebras
                      ? 'bg-indigo-500/8'
                      : 'transition-colors hover:bg-[#E2E8F0]/30'
                  }
                >
                  <td className="py-2.5 pr-4">
                    <span
                      className={`flex items-center gap-2 font-medium ${
                        isCerebras ? 'text-indigo-400' : 'text-[#0F172A]'
                      }`}
                    >
                      {isCerebras && (
                        <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
                      )}
                      {provider.name}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    {provider.serves_model ? (
                      <span className="text-emerald-600">{'\u2713'} Yes</span>
                    ) : (
                      <span className="text-[#94A3B8]">{'\u2717'} No</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-[#0F172A]">
                    {provider.estimated_speed > 0
                      ? formatSpeed(provider.estimated_speed)
                      : '\u2014'}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-[#0F172A]">
                    {provider.estimated_price >= 0
                      ? formatPrice(provider.estimated_price)
                      : '\u2014'}
                  </td>
                  <td className="py-2.5">
                    {isCerebras ? (
                      <span className="text-xs text-indigo-400">\u2014</span>
                    ) : advantage !== null ? (
                      <span
                        className={`font-mono font-semibold ${
                          advantage >= 5
                            ? 'text-emerald-600'
                            : advantage >= 2
                              ? 'text-amber-600'
                              : 'text-[#475569]'
                        }`}
                      >
                        {advantage.toFixed(1)}x faster
                      </span>
                    ) : (
                      <span className="text-xs text-[#94A3B8]">N/A</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary strip */}
      <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#475569]">On Cerebras:</span>
          {on_cerebras ? (
            <span className="font-medium text-emerald-600">{'\u2713'} Available</span>
          ) : (
            <span className="font-medium text-amber-600">Not yet</span>
          )}
        </div>
        <div className="h-4 w-px bg-[#E2E8F0]" />
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#475569]">Speed multiplier:</span>
          <span className="font-mono font-semibold text-[#0F172A]">
            {speed_advantage_multiplier.toFixed(1)}x
          </span>
        </div>
        <div className="h-4 w-px bg-[#E2E8F0]" />
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#475569]">Competitors serving:</span>
          <span className="font-mono font-semibold text-[#0F172A]">
            {providers.filter((p) => p.serves_model && p.name !== 'Cerebras').length}
          </span>
        </div>
      </div>
    </div>
  );
}
