export const Logo = ({ className = "", variant = "horizontal" }: { className?: string, variant?: "horizontal" | "compact" }) => {
  const isCompact = variant === "compact";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center">
        {/* Logo Icon: Gold ingot + wings + heartbeat */}
        <svg width={isCompact ? "48" : "40"} height={isCompact ? "48" : "40"} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C8A028" />
              <stop offset="50%" stopColor="#E8C84A" />
              <stop offset="100%" stopColor="#A07820" />
            </linearGradient>
          </defs>
          
          {/* Wings */}
          <path d="M20 50C10 40 5 50 10 60L25 55" stroke="url(#goldGradient)" strokeWidth="3" strokeLinecap="round" />
          <path d="M80 50C90 40 95 50 90 60L75 55" stroke="url(#goldGradient)" strokeWidth="3" strokeLinecap="round" />
          
          {/* Ingot Body (Trapezoid) */}
          <path d="M35 45H65L70 65H30L35 45Z" fill="url(#goldGradient)" />
          {/* Ingot Top (Oval) */}
          <ellipse cx="50" cy="45" rx="15" ry="5" fill="url(#goldGradient)" />
          {/* Ingot Bottom (Oval) */}
          <ellipse cx="50" cy="65" rx="20" ry="7" fill="url(#goldGradient)" />
          
          {/* Heartbeat line */}
          <path d="M20 75H40L45 65L50 85L55 75H80" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <animate attributeName="stroke-dasharray" from="0, 100" to="100, 0" dur="2s" repeatCount="indefinite" />
          </path>
          {/* Decorative dots */}
          <circle cx="15" cy="75" r="1" fill="#C0392B" opacity="0.5" />
          <circle cx="10" cy="75" r="0.5" fill="#C0392B" opacity="0.3" />
          <circle cx="85" cy="75" r="1" fill="#C0392B" opacity="0.5" />
          <circle cx="90" cy="75" r="0.5" fill="#C0392B" opacity="0.3" />
        </svg>
      </div>

      {!isCompact && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight text-[#C8A028]" style={{ fontFamily: "'Playfair Display', serif" }}>
              CAISHEN
            </span>
            <div className="h-6 w-[1px] bg-[#C8A028]/40" />
            <span className="text-sm font-light tracking-[14px] text-[#C8A028] mt-1">
              ENGINE
            </span>
          </div>
          <span className="text-[8px] font-medium tracking-[0.2em] text-[#B0BEC5] uppercase mt-0.5">
            INTELLIGENT FLOW. INFINITE PROSPERITY.
          </span>
        </div>
      )}
    </div>
  );
};
