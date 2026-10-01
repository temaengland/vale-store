const INK = "#332E27";
const BRASS = "#AD8A4E";

// Update 134: `compact` = the slim desktop header while scrolling — the
// wordmark only (no "Curated antiques & vintage" line), cropped tight.
export default function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <svg viewBox={compact ? "0 6 186 42" : "0 0 260 60"} className={className}>
      <text
        x="0"
        y="34"
        fontFamily="Georgia, 'Playfair Display', serif"
        fontSize="28"
        letterSpacing="1"
        fill={INK}
      >
        CharmChase
      </text>
      <path
        d="M2 44 Q90 36 178 44"
        fill="none"
        stroke={BRASS}
        strokeWidth="1.2"
      />
      <circle cx="90" cy="41.5" r="1.6" fill={BRASS} />
      {!compact && (
      <text
        x="0"
        y="56"
        fontFamily="Georgia, 'Playfair Display', serif"
        fontSize="7"
        letterSpacing="2.5"
        fill={BRASS}
      >
        CURATED ANTIQUES &amp; VINTAGE
      </text>
      )}
    </svg>
  );
}
