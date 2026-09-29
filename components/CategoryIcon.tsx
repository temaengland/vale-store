// Bold, filled icons for the four main category tiles on the homepage.
// Palette pulled from the homepage hero photo (terracotta, brass, sage).
const TERRACOTTA = "#B5714A";
const TERRACOTTA_DARK = "#8F5636";
const BRASS = "#AD8A4E";
const BRASS_DARK = "#7F6534";
const SAGE = "#7C8463";
const SAGE_DARK = "#5C6247";
const CREAM = "#EDE6D8";
const CHARCOAL = "#332E27";
const FRAME_LIGHT = "#6B5940";

export const categoryTileBg: Record<string, string> = {
  furniture: "#EAE2D4",
  jewelry: "#F1E9D8",
  silver: "#E6E7E3",
  decor: "#E8E6DC",
  art: "#EDE6D8",
};

export function CategoryIcon({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  switch (slug) {
    case "furniture":
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <rect x="14" y="36" width="7" height="42" rx="3.5" fill={TERRACOTTA_DARK} />
          <rect x="79" y="36" width="7" height="42" rx="3.5" fill={TERRACOTTA_DARK} />
          <rect x="22" y="16" width="56" height="38" rx="14" fill={TERRACOTTA} />
          <rect x="17" y="52" width="66" height="22" rx="9" fill={TERRACOTTA} />
          <rect x="24" y="85" width="4" height="7" rx="1.5" fill={CHARCOAL} />
          <rect x="72" y="85" width="4" height="7" rx="1.5" fill={CHARCOAL} />
        </svg>
      );
    case "jewelry":
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <ellipse cx="50" cy="56" rx="25" ry="27" fill="none" stroke={BRASS} strokeWidth="9" />
          <path d="M50 12 L57 22 L50 27 L43 22 Z" fill={BRASS_DARK} />
          <circle cx="50" cy="18" r="4" fill={CREAM} />
        </svg>
      );
    case "silver":
      // A silver teapot (update 117).
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <path d="M26 44 Q26 30 50 30 Q74 30 74 44 L72 70 Q70 80 50 80 Q30 80 28 70 Z" fill="#9EA3A6" />
          <path d="M28 50 H72" stroke="#7D8286" strokeWidth="3" />
          <path d="M74 46 Q88 44 88 58 Q88 68 74 66" fill="none" stroke="#7D8286" strokeWidth="6" strokeLinecap="round" />
          <path d="M27 50 Q14 46 10 34" fill="none" stroke="#7D8286" strokeWidth="6" strokeLinecap="round" />
          <ellipse cx="50" cy="29" rx="14" ry="4" fill="#7D8286" />
          <circle cx="50" cy="22" r="5" fill={BRASS} />
          <rect x="36" y="80" width="28" height="5" rx="2" fill="#7D8286" />
        </svg>
      );
    case "decor":
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <path
            d="M42 9 H58 V18 Q69 33 69 53 Q69 87 50 87 Q31 87 31 53 Q31 33 42 18 Z"
            fill={SAGE}
          />
          <rect x="31" y="49" width="38" height="6" fill={SAGE_DARK} />
          <rect x="42" y="9" width="16" height="6" rx="2" fill={SAGE_DARK} />
        </svg>
      );
    case "art":
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <rect x="12" y="12" width="76" height="76" rx="8" fill="none" stroke={FRAME_LIGHT} strokeWidth="5" />
          <rect x="19" y="19" width="62" height="62" rx="3" fill={CREAM} />
          <path d="M19 65 L37 41 L50 54 L65 31 L81 52 V81 H19 Z" fill={TERRACOTTA} />
          <circle cx="63" cy="32" r="6" fill={BRASS} />
        </svg>
      );
    default:
      return null;
  }
}
