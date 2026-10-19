// Music styles for Reels (update 141). Safe to import in client components.
// A track's style comes from its file name prefix ("romantic-01-chopin….mp3").

export const STYLES = [
  "baroque",
  "romantic",
  "french",
  "ragtime",
  "artdeco",
  "midcentury",
  "luxury",
  "oriental",
  "rustic",
  "festive",
] as const;
export type Style = (typeof STYLES)[number];

export const STYLE_LABEL: Record<Style, string> = {
  baroque: "Georgian / Baroque",
  romantic: "Victorian / Romantic",
  french: "Belle Époque / Nouveau",
  ragtime: "Edwardian / Ragtime",
  artdeco: "Art Deco / Swing",
  midcentury: "Mid-century / Lounge",
  luxury: "Luxury / Strings",
  oriental: "Oriental",
  rustic: "Country / Acoustic",
  festive: "Festive",
};

/** Old moods (before 141) → the closest new style. */
export const LEGACY_STYLE: Record<string, Style> = {
  calm: "midcentury",
  elegant: "luxury",
  lively: "artdeco",
};

export function normStyle(v: unknown): Style | null {
  const s = String(v || "").toLowerCase();
  if ((STYLES as readonly string[]).includes(s)) return s as Style;
  return LEGACY_STYLE[s] || null;
}
