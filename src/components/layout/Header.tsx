'use client';

export default function Header() {
  const handleToggleSidebar = () => {
    const toggle = document.getElementById('sidebar-mobile-toggle');
    if (toggle) toggle.click();
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[#E2E8F0] bg-[#F8FAFC]/80 px-4 backdrop-blur-md lg:hidden">
      {/* Hamburger menu */}
      <button
        onClick={handleToggleSidebar}
        className="rounded-[8px] p-2 text-[#475569] transition-colors hover:bg-[#E2E8F0] hover:text-[#0F172A]"
        aria-label="Open menu"
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Branding */}
      <div className="flex items-center gap-2">
        <svg
          className="h-6 w-6 text-[#6366F1]"
          viewBox="0 0 32 32"
          fill="none"
        >
          <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
          <circle cx="16" cy="16" r="8" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
          <circle cx="16" cy="16" r="2.5" fill="currentColor" />
          <line x1="16" y1="2" x2="16" y2="8" stroke="currentColor" strokeWidth="1.5" />
          <line x1="16" y1="24" x2="16" y2="30" stroke="currentColor" strokeWidth="1.5" />
          <line x1="2" y1="16" x2="8" y2="16" stroke="currentColor" strokeWidth="1.5" />
          <line x1="24" y1="16" x2="30" y2="16" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <span className="text-base font-bold text-[#0F172A]">ModelScope</span>
      </div>
    </header>
  );
}
