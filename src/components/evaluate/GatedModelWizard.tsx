'use client';

import { useState } from 'react';

interface GatedModelWizardProps {
  modelId: string;
  modelUrl: string;
  onRetry: () => void;
  onCancel: () => void;
}

export default function GatedModelWizard({
  modelId,
  modelUrl,
  onRetry,
  onCancel,
}: GatedModelWizardProps) {
  const [step, setStep] = useState<1 | 2>(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <svg className="h-6 w-6 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#0F172A]">Gated Model Access Required</h3>
            <p className="mt-1 text-sm text-[#475569]">
              <span className="font-mono font-medium text-[#6366F1]">{modelId}</span> requires you to accept a license agreement on HuggingFace before it can be analyzed.
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="mb-6 space-y-4">
          {/* Step 1 */}
          <div className={`rounded-xl border p-4 transition-colors ${step === 1 ? 'border-[#6366F1] bg-[#6366F1]/5' : 'border-[#E2E8F0] bg-[#F8FAFC]'}`}>
            <div className="flex items-center gap-3">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${step === 1 ? 'bg-[#6366F1] text-white' : 'bg-emerald-100 text-emerald-600'}`}>
                {step > 1 ? '✓' : '1'}
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#0F172A]">Accept the license on HuggingFace</p>
                <p className="text-xs text-[#475569]">Click the button below to open the model page, then accept the terms.</p>
              </div>
            </div>
            {step === 1 && (
              <div className="mt-4 flex gap-3">
                <a
                  href={modelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#6366F1] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#4F46E5]"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Open {modelId.split('/').pop()} on HuggingFace
                </a>
              </div>
            )}
          </div>

          {/* Step 2 */}
          <div className={`rounded-xl border p-4 transition-colors ${step === 2 ? 'border-[#6366F1] bg-[#6366F1]/5' : 'border-[#E2E8F0] bg-[#F8FAFC] opacity-60'}`}>
            <div className="flex items-center gap-3">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${step === 2 ? 'bg-[#6366F1] text-white' : 'bg-[#E2E8F0] text-[#94A3B8]'}`}>
                2
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#0F172A]">Come back and retry</p>
                <p className="text-xs text-[#475569]">After accepting the license, click retry to start the X-ray analysis.</p>
              </div>
            </div>
            {step === 2 && (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={onRetry}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                  </svg>
                  I&apos;ve accepted — retry analysis
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#E2E8F0] pt-4">
          <p className="text-xs text-[#94A3B8]">
            Some models require manual license acceptance for legal reasons.
          </p>
          <button
            onClick={onCancel}
            className="text-sm font-medium text-[#475569] transition-colors hover:text-[#0F172A]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
