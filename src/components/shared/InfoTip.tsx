'use client';

export default function InfoTip({ text }: { text: string }) {
  return (
    <span className="group/tip relative inline-flex cursor-help align-middle ml-1">
      <svg
        className="h-3.5 w-3.5 text-[#CBD5E1] transition-colors group-hover/tip:text-[#6366F1]"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
          clipRule="evenodd"
        />
      </svg>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 scale-95 opacity-0 transition-all duration-150 group-hover/tip:scale-100 group-hover/tip:opacity-100"
        style={{ textTransform: 'none', letterSpacing: 'normal', fontWeight: 400 }}
      >
        <span className="block w-72 rounded-lg bg-[#1E293B] px-3.5 py-2.5 text-[11px] leading-[1.6] text-[#E2E8F0] shadow-xl ring-1 ring-white/10 normal-case tracking-normal font-normal">
          {text}
        </span>
        <span className="mx-auto block h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-[#1E293B]" />
      </span>
    </span>
  );
}
