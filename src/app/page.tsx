'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import URLInput from '@/components/evaluate/URLInput';

// ---------------------------------------------------------------------------
// Feature card data
// ---------------------------------------------------------------------------

const features = [
  {
    title: 'Architecture X-ray',
    description: 'See inside any model\u2019s layers, heads, and experts',
    icon: (
      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        {/* Layers icon */}
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    title: 'Launch Readiness',
    description: '7-module analysis with GO/NO-GO verdict',
    icon: (
      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        {/* Gauge icon */}
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
        <path d="M12 6v6l4 2" />
        <path d="M16.24 7.76l-1.42 1.42" />
      </svg>
    ),
  },
  {
    title: 'Day-0 Partnership',
    description: 'Evaluate pre-release models from manual specs',
    icon: (
      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        {/* Shield icon */}
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
];

// ---------------------------------------------------------------------------
// Animated particles background
// ---------------------------------------------------------------------------

function GridBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Radial gradient glow */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/4 h-[600px] w-[900px] rounded-full bg-accent/[0.07] blur-[120px]" />
      {/* Dot grid */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.04]">
        <defs>
          <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Floating stat pill (decorative)
// ---------------------------------------------------------------------------

function StatPill({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface/80 px-3.5 py-1.5 text-xs backdrop-blur-sm ${className ?? ''}`}
    >
      <span className="font-mono text-accent">{value}</span>
      <span className="text-text-muted">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleModelSubmit = (modelId: string) => {
    router.push(`/evaluate?model=${encodeURIComponent(modelId)}`);
  };

  return (
    <div className="relative flex min-h-screen flex-col">
      <GridBackground />

      {/* ----------------------------------------------------------------- */}
      {/* Hero */}
      {/* ----------------------------------------------------------------- */}
      <section className="relative flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-20 sm:px-8 lg:pt-28">
        <div
          className={`mx-auto flex max-w-3xl flex-col items-center text-center transition-all duration-700 ${
            mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          {/* Badge */}
          <span className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1 text-xs font-medium text-accent">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            Built for the AI Models PM at Cerebras
          </span>

          {/* Title */}
          <h1 className="text-5xl font-extrabold tracking-tight text-text-primary sm:text-6xl lg:text-7xl">
            Model
            <span className="bg-gradient-to-r from-accent to-[#818CF8] bg-clip-text text-transparent">
              Scope
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-text-secondary sm:text-xl">
            X-ray any open-weight model.{' '}
            <span className="text-text-primary">Score its fit for Cerebras Inference.</span>
          </p>

          {/* Floating stats (decorative) */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <StatPill value="7" label="analysis modules" />
            <StatPill value="44 GB" label="WSE-3 SRAM" />
            <StatPill value="GO/NO-GO" label="verdict" />
          </div>

          {/* URL Input */}
          <div className="mt-10 w-full max-w-2xl">
            <URLInput onSubmit={handleModelSubmit} />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Feature Cards */}
      {/* ----------------------------------------------------------------- */}
      <section className="relative z-10 px-4 pb-24 sm:px-8">
        <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-3">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`group card flex flex-col gap-4 p-6 transition-all duration-500 ${
                mounted ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
              }`}
              style={{ transitionDelay: `${300 + i * 120}ms` }}
            >
              {/* Icon */}
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent transition-colors group-hover:bg-accent/20">
                {feature.icon}
              </div>

              <h3 className="text-lg font-semibold text-text-primary">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-text-secondary">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Footer */}
      {/* ----------------------------------------------------------------- */}
      <footer className="relative z-10 border-t border-border px-4 py-6 text-center">
        <p className="text-xs text-text-muted">
          Built by Arun Muralitharan &nbsp;|&nbsp; Designed for the AI Models PM at Cerebras
        </p>
      </footer>
    </div>
  );
}
