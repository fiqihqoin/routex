export const Logo = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-teal">
      <path d="M3 6h7l4 6h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 18h7l4-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      <circle cx="21" cy="6" r="1.5" fill="currentColor" />
      <circle cx="21" cy="12" r="1.5" fill="currentColor" opacity="0.6" />
    </svg>
    <span className="text-lg font-bold tracking-tight text-foreground">Routex</span>
  </div>
);
