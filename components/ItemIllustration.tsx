// Simple original line-art illustrations used as a placeholder until a real
// product photo is uploaded via the admin panel. Once a product has an
// `image` URL, ProductImage below renders that photo instead automatically.

export type IconName =
  | "armchair"
  | "painting"
  | "lamp"
  | "vase"
  | "sofa"
  | "mirror"
  | "ring"
  | "teapot"
  | "generic";

const paths: Record<IconName, string> = {
  armchair:
    "M25 55 V35 Q25 25 35 25 H65 Q75 25 75 35 V55 M20 55 H80 V72 Q80 78 74 78 H26 Q20 78 20 72 Z M22 78 V85 M78 78 V85 M30 55 V40 M70 55 V40",
  painting:
    "M18 18 H82 V70 H18 Z M18 58 L38 40 L52 52 L64 34 L82 58 M50 70 V78 M40 78 H60",
  lamp: "M35 30 H65 L58 52 H42 Z M50 52 V78 M50 78 L28 92 M50 78 L72 92 M50 78 V94",
  vase: "M42 22 H58 V32 Q68 45 68 60 Q68 78 50 78 Q32 78 32 60 Q32 45 42 32 Z",
  sofa: "M16 42 H84 V68 H16 Z M20 42 V32 Q20 28 24 28 H36 Q40 28 40 32 V42 M60 42 V32 Q60 28 64 28 H76 Q80 28 80 32 V42 M20 68 V76 M80 68 V76",
  mirror: "M50 15 A24 30 0 1 0 50.01 15 M50 75 V88",
  ring: "M50 45 A20 20 0 1 0 50.01 45 M40 45 L50 22 L60 45 M44 45 H56",
  teapot:
    "M28 48 Q28 38 40 36 H62 Q74 38 74 48 V58 Q74 74 50 74 Q26 74 26 58 Z M74 46 Q86 44 86 54 Q86 62 76 60 M50 30 L50 36 M44 30 H56",
  generic: "M25 25 H75 V75 H25 Z M25 25 L75 75 M75 25 L25 75",
};

export function ItemIllustration({
  icon,
  className = "",
}: {
  icon: IconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[icon]} />
    </svg>
  );
}

// Tailwind can't see dynamically-built class strings, so tones are inlined.
export const iconTones: Record<IconName, { bg: string; fg: string }> = {
  armchair: { bg: "#D8C9B8", fg: "#8C7D63" },
  painting: { bg: "#D6D0C2", fg: "#7C6E54" },
  lamp: { bg: "#DED6C4", fg: "#8C7D63" },
  vase: { bg: "#E4DED0", fg: "#9C8E72" },
  sofa: { bg: "#DAD2C4", fg: "#8C7D63" },
  mirror: { bg: "#E8E1D3", fg: "#9C8E72" },
  teapot: { bg: "#E4E5E1", fg: "#8C9096" },
  ring: { bg: "#EAD9BE", fg: "#A6803F" },
  generic: { bg: "#E4E0D6", fg: "#9C9484" },
};

// Drop-in image slot: shows the real photo if the product has one uploaded,
// otherwise falls back to the line-art placeholder. This is the only piece
// that needs to change once photos exist — nothing else in the page.
export function ProductImage({
  image,
  icon,
  alt,
  className = "",
}: {
  image?: string | null;
  icon: IconName;
  alt: string;
  className?: string;
}) {
  const tone = iconTones[icon];
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={image}
        alt={alt}
        className={`object-cover ${className}`}
      />
    );
  }
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ background: tone.bg, color: tone.fg }}
    >
      <ItemIllustration icon={icon} className="h-2/5 w-2/5" />
    </div>
  );
}
