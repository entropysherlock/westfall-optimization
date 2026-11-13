/** Westfall Optimization mark: an ordering (descending staircase of nodes) with one recovered block. */
export function Logo({ light = false, size = 28 }: { light?: boolean; size?: number }) {
  const stroke = light ? "#e2e8f0" : "#0b1a2e";
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <rect x="1" y="1" width="26" height="26" rx="6" fill={light ? "#0f2238" : "#0b1a2e"} />
      <rect x="9.5" y="9.5" width="9" height="9" rx="2" fill="none" stroke="#2bb3a1" strokeWidth="1.4" />
      <path d="M6 7 L22 21" stroke={light ? "#94a3b8" : "#64748b"} strokeWidth="1" strokeDasharray="1.5 2.2" />
      {[[6, 7], [11.3, 11.7], [16.7, 16.3], [22, 21]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 1 || i === 2 ? 2.1 : 1.8} fill={i === 1 || i === 2 ? "#2bb3a1" : "#f8fafc"} stroke={stroke} strokeWidth=".6" />
      ))}
    </svg>
  );
}

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <Logo light={light} />
      <span className={`text-[13px] font-semibold tracking-[.16em] ${light ? "text-white" : "text-fog-100"}`}>
        WESTFALL <span className={light ? "text-slate-400" : "text-fog-500"}>OPTIMIZATION</span>
      </span>
    </span>
  );
}
