'use client';

import InfoTip from '@/components/shared/InfoTip';
import type { CompetitiveGapResult } from '@/lib/types/model';

interface CompetitorTableProps {
  gap: CompetitiveGapResult;
}

export default function CompetitorTable({ gap }: CompetitorTableProps) {
  const servingProviders = gap.providers.filter(p => p.serves_model);
  const notServing = gap.providers.filter(p => !p.serves_model);
  const cerebrasSpeed = gap.estimatedCerebrasSpeed;

  // Cerebras pricing estimate based on speed tier
  const cerebrasInput = cerebrasSpeed > 1500 ? 0.10 : cerebrasSpeed > 800 ? 0.25 : 0.60;
  const cerebrasOutput = cerebrasSpeed > 1500 ? 0.10 : cerebrasSpeed > 800 ? 0.25 : 1.00;

  return (
    <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#0F172A]">
          Competitive Landscape
          <InfoTip text="Which inference providers serve this model, their pricing, and where Cerebras has speed or cost advantages." />
        </h3>
        <div className="flex items-center gap-2">
          {gap.uniqueAdvantage && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700">
              {gap.marketGapSize === 'large' ? 'First Mover' : 'Speed Advantage'}
            </span>
          )}
          <span className={`font-mono text-lg font-bold ${gap.score >= 70 ? 'text-emerald-600' : gap.score >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
            {gap.score}
          </span>
          <span className="text-[10px] text-[#94A3B8]">/ 100</span>
        </div>
      </div>

      {/* Cerebras row — highlighted */}
      <div className="mb-3 rounded-lg border border-[#6366F1]/20 bg-[#6366F1]/5 p-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-[#6366F1]" />
            <span className="text-sm font-bold text-[#6366F1]">Cerebras</span>
            {gap.onCerebras ? (
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[8px] font-bold text-emerald-700">LIVE</span>
            ) : (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[8px] font-bold text-amber-700">NOT YET</span>
            )}
          </div>
          <span className="font-mono text-xs font-bold text-[#6366F1]">{cerebrasSpeed.toLocaleString()} tok/s</span>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-2">
          <div>
            <p className="text-[9px] text-[#94A3B8] uppercase">Input</p>
            <p className="font-mono text-sm font-semibold text-[#0F172A]">${cerebrasInput.toFixed(2)}<span className="text-[9px] text-[#94A3B8]">/M</span></p>
          </div>
          <div>
            <p className="text-[9px] text-[#94A3B8] uppercase">Output</p>
            <p className="font-mono text-sm font-semibold text-[#0F172A]">${cerebrasOutput.toFixed(2)}<span className="text-[9px] text-[#94A3B8]">/M</span></p>
          </div>
          <div>
            <p className="text-[9px] text-[#94A3B8] uppercase">Speed Advantage</p>
            <p className="font-mono text-sm font-bold text-emerald-600">{gap.speedAdvantageMultiplier.toFixed(1)}x faster</p>
          </div>
        </div>
      </div>

      {/* Provider comparison table */}
      {servingProviders.length > 0 && (
        <div className="mb-3">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-[#94A3B8]">
            Providers serving this model ({servingProviders.length})
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#E2E8F0]">
                  <th className="pb-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#94A3B8]">Provider</th>
                  <th className="pb-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#94A3B8] text-right">Speed</th>
                  <th className="pb-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#94A3B8] text-right">Input $/M</th>
                  <th className="pb-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#94A3B8] text-right">Output $/M</th>
                  <th className="pb-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#94A3B8] text-right">Cerebras Adv.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {servingProviders.map((p) => {
                  const speedAdv = cerebrasSpeed / Math.max(p.estimated_speed, 1);
                  const costAdv = p.output_price > 0 ? p.output_price / Math.max(cerebrasOutput, 0.01) : 0;
                  return (
                    <tr key={p.name} className="hover:bg-[#F8FAFC]">
                      <td className="py-2 text-xs font-medium text-[#0F172A] capitalize">{p.name}</td>
                      <td className="py-2 text-right font-mono text-xs text-[#475569]">{p.estimated_speed} tok/s</td>
                      <td className="py-2 text-right font-mono text-xs text-[#475569]">${p.input_price.toFixed(2)}</td>
                      <td className="py-2 text-right font-mono text-xs text-[#475569]">${p.output_price.toFixed(2)}</td>
                      <td className="py-2 text-right">
                        <span className={`font-mono text-xs font-bold ${speedAdv > 2 ? 'text-emerald-600' : speedAdv > 1 ? 'text-amber-600' : 'text-red-500'}`}>
                          {speedAdv.toFixed(1)}x speed
                        </span>
                        {costAdv > 1 && (
                          <span className="ml-1 text-[9px] text-emerald-600">{costAdv.toFixed(1)}x cheaper</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Not serving */}
      {notServing.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#94A3B8]">
            Not serving ({notServing.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {notServing.map((p) => (
              <span key={p.name} className="rounded bg-[#F1F5F9] px-2 py-0.5 text-[10px] text-[#94A3B8] capitalize">{p.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* Strategic insights */}
      <div className="border-t border-[#E2E8F0] pt-3 space-y-1.5">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-[#94A3B8]">Strategic Assessment</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md bg-[#F8FAFC] px-2 py-1.5 text-center">
            <p className={`text-xs font-bold ${gap.marketGapSize === 'large' ? 'text-emerald-600' : gap.marketGapSize === 'medium' ? 'text-amber-600' : 'text-[#475569]'}`}>
              {gap.marketGapSize.charAt(0).toUpperCase() + gap.marketGapSize.slice(1)}
            </p>
            <p className="text-[8px] text-[#94A3B8] uppercase">Market Gap</p>
          </div>
          <div className="rounded-md bg-[#F8FAFC] px-2 py-1.5 text-center">
            <p className={`text-xs font-bold ${gap.riskOfNotOffering === 'high' ? 'text-red-500' : gap.riskOfNotOffering === 'medium' ? 'text-amber-600' : 'text-emerald-600'}`}>
              {gap.riskOfNotOffering.charAt(0).toUpperCase() + gap.riskOfNotOffering.slice(1)}
            </p>
            <p className="text-[8px] text-[#94A3B8] uppercase">Risk</p>
          </div>
          <div className="rounded-md bg-[#F8FAFC] px-2 py-1.5 text-center">
            <p className={`text-xs font-bold ${gap.timelinePressure === 'urgent' ? 'text-red-500' : gap.timelinePressure === 'moderate' ? 'text-amber-600' : 'text-emerald-600'}`}>
              {gap.timelinePressure.charAt(0).toUpperCase() + gap.timelinePressure.slice(1)}
            </p>
            <p className="text-[8px] text-[#94A3B8] uppercase">Urgency</p>
          </div>
        </div>
      </div>
    </div>
  );
}
