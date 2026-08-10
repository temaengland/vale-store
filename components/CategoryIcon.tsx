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
const PEWTER = "#9CA3AA";
const PEWTER_DARK = "#6E747A";

export const categoryTileBg: Record<string, string> = {
  furniture: "#EAE2D4",
  jewelry: "#F1E9D8",
  decor: "#E8E6DC",
  art: "#EDE6D8",
  silver: "#E6E7E5",
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
    case "silver":
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <path
            d="M22 46 Q22 34 36 32 H64 Q78 34 78 46 V58 Q78 78 50 78 Q22 78 22 58 Z"
            fill={PEWTER}
          />
          <path
            d="M78 44 Q92 42 92 54 Q92 64 80 62 Z"
            fill={PEWTER_DARK}
          />
          <path d="M20 46 H80" stroke={PEWTER_DARK} strokeWidth="3" />
          <rect x="44" y="16" width="12" height="10" rx="3" fill={PEWTER_DARK} />
          <circle cx="50" cy="14" r="4" fill={PEWTER_DARK} />
        </svg>
      );
    default:
      return null;
  }
}
