import { IconName } from "@/components/ItemIllustration";

export type Product = {
  slug: string;
  name: string;
  price: number; // in pence
  category: "furniture" | "jewelry" | "decor";
  subcategory?: string;
  description: string;
  image?: string; // real uploaded photo URL, set via the admin panel
  icon: IconName; // fallback illustration shown until `image` is set
};

export type Category = {
  slug: "furniture" | "jewelry" | "decor";
  name: string;
  subcategories: string[];
};

export const categories: Category[] = [
  {
    slug: "furniture",
    name: "Furniture",
    subcategories: ["Living room", "Dining", "Bedroom", "Storage", "Lighting"],
  },
  {
    slug: "jewelry",
    name: "Jewelry",
    subcategories: ["Rings", "Necklaces", "Bracelets", "Earrings", "Watches"],
  },
  {
    slug: "decor",
    name: "Decor",
    subcategories: ["Vases", "Mirrors", "Textiles", "Tableware", "Art"],
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
