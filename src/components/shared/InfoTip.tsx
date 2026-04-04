'use client';

/**
 * Small (i) icon with a hover tooltip. Use next to any label/heading
 * to explain what the metric or section means.
 *
 * Usage: <InfoTip text="Explanation here" />
 */
export default function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex cursor-help align-middle ml-1">
      {/* (i) icon */}
      <svg
        className="h-3.5 w-3.5 text-[#94A3B8] transition-colors group-hover:text-[#6366F1]"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
          clipRule="evenodd"
        />
      </svg>
      {/* Tooltip popup */}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 scale-95 opacity-0 transition-all duration-150 group-hover:scale-100 group-hover:opacity-100"
      >
        <span className="block max-w-xs whitespace-normal rounded-lg bg-[#0F172A] px-3 py-2 text-[11px] leading-relaxed font-normal text-white shadow-xl">
          {text}
        </span>
        <span className="mx-auto block h-0 w-0 border-x-[5px] border-t-[5px] border-x-transparent border-t-[#0F172A]" />
      </span>
    </span>
  );
}
