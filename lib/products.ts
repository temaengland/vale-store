import { IconName } from "@/components/ItemIllustration";

// Update 121: six categories. "decor" is kept only so older records still
// type-check; the category-reorganise tool moves them to "ceramics" / "art".
export type CategorySlug = "furniture" | "jewelry" | "watches" | "silver" | "ceramics" | "art" | "decor";

export type Product = {
  slug: string;
  name: string;
  price: number; // in pence — the sale/listing price shown to customers
  category: CategorySlug;
  subcategory?: string;
  era?: string; // period/style, e.g. "Victorian" — currently used for Art
  description: string;
  image?: string; // legacy single-photo field, kept for older records
  images?: string[]; // real uploaded photo URLs, set via the admin panel — first one is the cover photo
  icon: IconName; // fallback illustration shown until any photo is set
  status?: "available" | "unavailable" | "sold"; // safe to show publicly (e.g. a "Sold" badge)
  shipping_cost?: number; // in pence — estimated UK shipping, shown to buyers and offered at checkout
  international_shipping_cost?: number; // in pence — estimated international shipping, offered as an alternative at checkout
  weight_grams?: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  id?: string; // database id (not set for seed data)
  created_at?: string;
};

// Admin-only fields — never fetched on public pages, only via the
// password-protected /admin API routes (which use the service role key).
export type AdminProduct = Product & {
  id: string;
  costPrice?: number; // in pence — what you paid for it; profit = price - costPrice
};

export type Category = {
  slug: CategorySlug;
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
      "Sofas & Armchairs",
      "Tables",
      "Console Tables",
      "Dressing Tables",
      "Game Tables",
      "Beds",
      "Wardrobes",
      "Chest of Drawers",
      "Sideboards",
      "Trunks",
      "Cabinets",
      "Bookcases",
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
    name: "Jewellery",
    subcategories: [
      "Rings",
      "Necklaces",
      "Pendants",
      "Bracelets",
      "Earrings",
      "Brooches",
      "Cufflinks",
    ],
  },
  {
    // Update 121: watches get their own category (most searched: "vintage watches").
    slug: "watches",
    name: "Watches & Clocks",
    subcategories: ["Wristwatches", "Pocket Watches", "Clocks"],
  },
  {
    // Update 117: silverware (not silver jewellery).
    slug: "silver",
    name: "Silver",
    subcategories: [
      "Salvers & Trays",
      "Tea & Coffee",
      "Cutlery & Flatware",
      "Candlesticks",
      "Boxes & Cases",
      "Christening & Baby",
      "Cups & Trophies",
      "Dressing Table",
      "Condiments & Cruets",
      "Wine & Bar",
      "Smoking & Vestas",
      "Bowls & Dishes",
      "Purses & Card Cases",
      "Photo Frames",
      "Novelties & Collectables",
      "Asian Silver",
      "Coins & Medals",
      "Silver Plate",
    ],
  },
  {
    // Update 121: porcelain, pottery and glass (UK's No.2 antiques category).
    slug: "ceramics",
    name: "Ceramics & Glass",
    subcategories: ["Porcelain", "Pottery", "Asian Ceramics", "Figurines", "Tableware", "Vases", "Art Glass", "Glassware"],
  },
  {
    // Update 121: "Art" + the former "Decor" category.
    slug: "art",
    name: "Art & Decor",
    subcategories: [
      "Paintings",
      "Prints and drawings",
      "Sculpture",
      "Photography",
      "Mirrors",
      "Boxes",
      "Candlesticks",
      "Ornaments",
      "Textiles",
      "Tribal & World",
      "Collectables",
    ],
    eras: ["Georgian", "Victorian", "Edwardian", "Mid-century", "Contemporary"],
  },
];

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
    category: "ceramics",
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
    category: "silver",
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

// Whole-pound prices show without ".00" (£1,250); pennies are kept when there are any (update 116).
export function formatPrice(pence: number) {
  const whole = pence % 100 === 0;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(pence / 100);
}
