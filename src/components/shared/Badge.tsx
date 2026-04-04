interface BadgeProps {
  text: string;
  variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'muted';
}

const variantStyles: Record<BadgeProps['variant'], string> = {
  success: 'bg-emerald-500/15 text-emerald-600 ring-emerald-500/20',
  warning: 'bg-amber-500/15 text-amber-600 ring-amber-500/20',
  danger: 'bg-red-500/15 text-red-600 ring-red-500/20',
  info: 'bg-indigo-500/15 text-indigo-400 ring-indigo-500/20',
  neutral: 'bg-[#E2E8F0] text-[#475569] ring-[#CBD5E1]',
  muted: 'bg-[#E2E8F0]/50 text-[#94A3B8] ring-[#E2E8F0]',
};

export default function Badge({ text, variant }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-[6px] px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${variantStyles[variant]}`}
    >
      {text}
    </span>
  );
}
