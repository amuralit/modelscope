'use client';

import { type ReactNode } from 'react';

interface TooltipProps {
  text: string;
  children: ReactNode;
}

export default function Tooltip({ text, children }: TooltipProps) {
  return (
    <div className="group relative inline-flex">
      {children}
      <div
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 scale-95 opacity-0 transition-all duration-150 group-hover:scale-100 group-hover:opacity-100"
      >
        <div className="whitespace-nowrap rounded-[8px] bg-[#1F2937] px-3 py-1.5 text-xs font-medium text-[#F9FAFB] shadow-lg ring-1 ring-[#374151]">
          {text}
        </div>
        {/* Tooltip arrow */}
        <div className="mx-auto h-0 w-0 border-x-[6px] border-t-[6px] border-x-transparent border-t-[#1F2937]" />
      </div>
    </div>
  );
}
