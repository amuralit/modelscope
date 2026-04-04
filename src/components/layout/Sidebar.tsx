'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const navItems = [
  {
    label: 'Home',
    href: '/',
    badge: null,
    icon: 'M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
  },
  {
    label: 'X-ray Model',
    href: '/evaluate',
    badge: 'New',
    icon: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6',
  },
  {
    label: 'Discover',
    href: '/discover',
    badge: null,
    icon: 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941',
  },
  {
    label: 'Settings',
    href: '/settings',
    badge: null,
    icon: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-gradient-to-b from-white to-[#F8FAFC]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6366F1] shadow-md shadow-[#6366F1]/20">
          <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="4" />
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
          </svg>
        </div>
        <div>
          <span className="text-base font-bold text-[#0F172A]">ModelScope</span>
          <span className="block text-[9px] font-medium text-[#94A3B8] leading-none">by Arun Muralitharan</span>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-[#E2E8F0]" />

      {/* Navigation */}
      <nav className="mt-4 flex-1 space-y-0.5 px-3">
        <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-widest text-[#94A3B8]">Navigation</p>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
                active
                  ? 'bg-[#6366F1] text-white shadow-md shadow-[#6366F1]/25'
                  : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
              }`}
            >
              <svg
                className={`h-[18px] w-[18px] transition-colors ${active ? 'text-white' : 'text-[#94A3B8] group-hover:text-[#6366F1]'}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={item.icon} />
              </svg>
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                  active ? 'bg-white/20 text-white' : 'bg-[#6366F1]/10 text-[#6366F1]'
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Quick stats */}
      <div className="mx-3 mb-3 rounded-xl bg-[#F1F5F9] p-3">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-2">Cerebras WSE-3</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="font-mono text-sm font-bold text-[#6366F1]">44 GB</p>
            <p className="text-[9px] text-[#94A3B8]">SRAM</p>
          </div>
          <div>
            <p className="font-mono text-sm font-bold text-[#0F172A]">21 PB/s</p>
            <p className="text-[9px] text-[#94A3B8]">Bandwidth</p>
          </div>
          <div>
            <p className="font-mono text-sm font-bold text-[#0F172A]">900K</p>
            <p className="text-[9px] text-[#94A3B8]">Cores</p>
          </div>
          <div>
            <p className="font-mono text-sm font-bold text-[#0F172A]">4T</p>
            <p className="text-[9px] text-[#94A3B8]">Transistors</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#E2E8F0] px-4 py-3 flex items-center justify-between">
        <p className="text-[10px] text-[#94A3B8]">v1.0</p>
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <p className="text-[10px] text-[#94A3B8]">All systems online</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-[#E2E8F0] bg-white lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-60 border-r border-[#E2E8F0] bg-white transition-transform duration-200 lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-5 rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#F1F5F9]" aria-label="Close">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
        {sidebarContent}
      </aside>

      <button id="sidebar-mobile-toggle" className="hidden" onClick={() => setMobileOpen(p => !p)} aria-label="Toggle sidebar" />
    </>
  );
}
