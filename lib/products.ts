import { IconName } from "@/components/ItemIllustration";

export type Product = {
  slug: string;
  name: string;
  price: number; // in pence — the sale/listing price shown to customers
  category: "furniture" | "jewelry" | "decor" | "art";
  subcategory?: string;
  era?: string; // period/style, e.g. "Victorian" — currently used for Art
  description: string;
  image?: string; // legacy single-photo field, kept for older records
  images?: string[]; // real uploaded photo URLs, set via the admin panel — first one is the cover photo
  icon: IconName; // fallback illustration shown until any photo is set
  status?: "available" | "unavailable" | "sold"; // safe to show publicly (e.g. a "Sold" badge)
  shipping_cost?: number; // in pence — estimated shipping, shown to buyers and added at checkout
};

// Admin-only fields — never fetched on public pages, only via the
// password-protected /admin API routes (which use the service role key).
export type AdminProduct = Product & {
  id: string;
  costPrice?: number; // in pence — what you paid for it; profit = price - costPrice
};

export type Category = {
  slug: "furniture" | "jewelry" | "decor" | "art";
  name: string;
  subcategories: string[];
  eras?: string[]; // optional second filter axis, only set for categories that need it
};

export const categories: Category[] = [
  {
    slug: "furniture",
    name: "Furniture",
    subcategories: [
      "Living room",
      "Dining",
      "Bedroom",
      "Chairs",
      "Storage",
      "Lighting",
      "Desks & Office",
      "Rugs & Carpets",
      "Garden & Outdoor",
    ],
    eras: [
      "Queen Anne",
      "Georgian",
      "Victorian",
      "Edwardian",
      "Mid-century",
      "Contemporary",
    ],
  },
  {
    slug: "jewelry",
    name: "Jewelry & Watches",
    subcategories: [
      "Rings",
      "Necklaces",
      "Pendants",
      "Bracelets",
      "Earrings",
      "Brooches",
      "Cufflinks",
      "Watches",
      "Silver",
      "Silver Plate",
    ],
  },
  {
    slug: "decor",
    name: "Decor",
    subcategories: [
      "Vases",
      "Mirrors",
      "Textiles",
      "Tableware",
      "Clocks",
      "Candlesticks",
      "Ornaments & Figurines",
      "Boxes",
    ],
  },
  {
    slug: "art",
    name: "Art",
    subcategories: [
      "Paintings",
      "Prints and drawings",
      "Sculpture",
      "Photography",
      "Ceramics",
    ],
    eras: ["Georgian", "Victorian", "Edwardian", "Mid-century", "Contemporary"],
  },
];

// Prices are in pence (e.g. 64000 = £640.00) — kept for consistent formatting
// even though there's no checkout; useful if payment is ever switched back on.
export const products: Product[] = [
  {
    slug: "georgian-walnut-armchair",
    name: "Georgian walnut armchair",
    price: 64000,
    category: "furniture",
    subcategory: "Living room",
    description:
      "A well-proportioned Georgian-style armchair in walnut, upholstered in a neutral linen. Good structural condition, minor age-appropriate wear.",
    icon: "armchair",
  },
  {
    slug: "mid-century-floor-lamp",
    name: "Mid-century floor lamp",
    price: 31000,
    category: "furniture",
    subcategory: "Lighting",
    description:
      "A tripod-base floor lamp in teak with a linen drum shade, in the mid-century style. Rewired and PAT tested.",
    icon: "lamp",
  },
  {
    slug: "victorian-gold-ring",
    name: "Victorian gold band ring",
    price: 42000,
    category: "jewelry",
    subcategory: "Rings",
    description:
      "A 9ct gold Victorian band ring with engraved detailing. Hallmarked. Ring size N (resizing available on request).",
    icon: "ring",
  },
  {
    slug: "hand-thrown-ceramic-vase",
    name: "Hand-thrown ceramic vase",
    price: 9500,
    category: "decor",
    subcategory: "Vases",
    description:
      "A studio-thrown stoneware vase with a reactive glaze. Each piece is unique.",
    icon: "vase",
  },
  {
    slug: "framed-oil-landscape",
    name: "Framed oil landscape, 19th c.",
    price: 42000,
    category: "art",
    subcategory: "Paintings",
    era: "Victorian",
    description:
      "An English landscape in oil on canvas, gilt frame, 19th century. Unsigned. Sold with a condition report on request.",
    icon: "painting",
  },
  {
    slug: "victorian-silver-teapot",
    name: "Victorian silver-plated teapot",
    price: 18500,
    category: "jewelry",
    subcategory: "Silver Plate",
    description:
      "An ornate silver-plated teapot with engraved floral detailing, Victorian era. Good polished condition, no dents.",
    icon: "teapot",
  },
];

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug);
}

export function getProductsByCategory(slug: string) {
  return products.filter((p) => p.category === slug);
}

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function formatPrice(pence: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pence / 100);
}
