/**
 * CharmChase UK delivery rules — update 130.
 *
 * ONE place for delivery. The product page, the admin preview, the Google/Meta
 * feed and Stripe checkout all call ukDelivery(), so the buyer always sees the
 * same options and prices they are charged.
 *
 * Agreed with Artem on 29 Sep 2026 — DO NOT CHANGE without his confirmation.
 *
 *  1. Order total under £150 → buyer pays, Royal Mail Tracked 48:
 *       small parcel £4.95, medium parcel £12.95
 *     or (buyer's choice) Special Delivery next day, £750 insured — price by
 *     weight (Royal Mail online price + margin for packaging).
 *  2. £150 – £2,500 → FREE Royal Mail Special Delivery, next day, signed for;
 *     insurance matched to value: £750 / £1,000 / £2,500.
 *  3. Over £2,500 → FREE fully insured delivery, arranged personally.
 *  4. Too big for Royal Mail (over 61×46×46 cm or 20 kg) → delivery by
 *     arrangement; charged the item's own "courier price" (shipping_cost).
 *  5. International → unchanged: the item's international_shipping_cost.
 *
 * Royal Mail online prices used (April 2026):
 *   Tracked 48: small parcel ≤2 kg £3.65; medium ≤2 kg £5.55, ≤10 kg £7.35,
 *               ≤20 kg £11.85
 *   Special Delivery by 1pm (£750 cover): ≤100 g £9.45, ≤500 g £10.45,
 *               ≤1 kg £11.45, ≤2 kg £15.45, ≤10 kg £21.95, ≤20 kg £26.95
 *   (+£3 for £1,000 cover, +£10 for £2,500 cover — paid by CharmChase)
 */

export type ShipItem = {
  price: number; // pence
  category?: string | null;
  weight_grams?: number | null;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  shipping_cost?: number | null; // pence — courier price, used for large items only
  international_shipping_cost?: number | null;
};

export type ParcelSize = "small" | "medium" | "large";

export const FREE_DELIVERY_FROM = 15000; // £150
export const PERSONAL_DELIVERY_OVER = 250000; // £2,500

// What the buyer pays (pence).
export const TRACKED48_SMALL = 495;
export const TRACKED48_MEDIUM = 1295;
// Special Delivery option for orders under £150 (£750 cover), by weight.
const SD_OPTION_BY_WEIGHT: [number, number][] = [
  [500, 1195],
  [1000, 1295],
  [2000, 1695],
  [10000, 2395],
  [20000, 2895],
];

export function parcelSize(item: ShipItem): ParcelSize {
  const dims = [item.length_cm, item.width_cm, item.height_cm].filter((d): d is number => typeof d === "number" && d > 0);
  const w = item.weight_grams ?? 0;
  if (dims.length) {
    const [a, b = 0, c = 0] = [...dims].sort((x, y) => y - x);
    if (a > 61 || b > 46 || c > 46 || w > 20000) return "large";
    if (a <= 45 && b <= 35 && c <= 16 && w <= 2000) return "small";
    return "medium";
  }
  if (w > 20000) return "large";
  if (w > 2000) return "medium";
  // Nothing entered: furniture is assumed large, everything else small.
  return item.category === "furniture" ? "large" : "small";
}

export type DeliveryOption = {
  id: "t48" | "sd" | "free-sd" | "free-personal" | "arrange";
  title: string; // short name
  note: string; // one line under it
  amount: number; // pence the buyer pays
  badge?: string; // e.g. "INSURED £750"
  stripeName: string; // shown in Stripe and used to pick the Royal Mail service
  days: [number, number] | null;
};

export type UkDelivery = {
  kind: "standard" | "free" | "personal" | "large";
  size: ParcelSize;
  cover: 750 | 1000 | 2500 | null;
  options: DeliveryOption[];
};

function sdOptionPrice(weight: number): number {
  const w = weight > 0 ? weight : 500;
  for (const [max, price] of SD_OPTION_BY_WEIGHT) if (w <= max) return price;
  return SD_OPTION_BY_WEIGHT[SD_OPTION_BY_WEIGHT.length - 1][1];
}

export function ukDelivery(items: ShipItem[]): UkDelivery {
  const total = items.reduce((s, i) => s + i.price, 0);
  const sizes = items.map(parcelSize);
  const weight = items.reduce((s, i) => s + (i.weight_grams ?? 0), 0);
  const size: ParcelSize = sizes.includes("large") ? "large" : sizes.includes("medium") || weight > 2000 ? "medium" : "small";

  if (size === "large") {
    const courier = items.reduce((s, i) => s + (i.shipping_cost ?? 0), 0);
    return {
      kind: "large",
      size,
      cover: null,
      options: [
        {
          id: "arrange",
          title: "Delivery by arrangement",
          note: "Large item — we'll contact you after purchase",
          amount: courier,
          stripeName: "Delivery by arrangement (we will contact you)",
          days: null,
        },
      ],
    };
  }

  if (total > PERSONAL_DELIVERY_OVER) {
    return {
      kind: "personal",
      size,
      cover: null,
      options: [
        {
          id: "free-personal",
          title: "Free fully insured delivery",
          note: "We arrange a secure, fully insured delivery with you personally",
          amount: 0,
          stripeName: "Free fully insured delivery — arranged personally (we will contact you)",
          days: null,
        },
      ],
    };
  }

  if (total >= FREE_DELIVERY_FROM) {
    const cover: 750 | 1000 | 2500 = total <= 75000 ? 750 : total <= 100000 ? 1000 : 2500;
    const coverText = `£${cover.toLocaleString("en-GB")}`;
    return {
      kind: "free",
      size,
      cover,
      options: [
        {
          id: "free-sd",
          title: "Free Special Delivery",
          note: "Next working day by 1pm · signed for",
          amount: 0,
          badge: `INSURED ${coverText}`,
          stripeName: `Free Royal Mail Special Delivery — next day by 1pm, insured ${coverText}`,
          days: [1, 1],
        },
      ],
    };
  }

  return {
    kind: "standard",
    size,
    cover: 750,
    options: [
      {
        id: "t48",
        title: "Tracked 48",
        note: "2–3 working days · tracked",
        amount: size === "medium" ? TRACKED48_MEDIUM : TRACKED48_SMALL,
        stripeName: "Royal Mail Tracked 48",
        days: [2, 3],
      },
      {
        id: "sd",
        title: "Special Delivery",
        note: "Next working day by 1pm · signed for",
        amount: sdOptionPrice(weight),
        badge: "INSURED £750",
        stripeName: "Royal Mail Special Delivery — next day by 1pm, insured £750",
        days: [1, 1],
      },
    ],
  };
}

/** Cheapest UK price for one item — used by the Google/Meta feed. */
export function cheapestUkPrice(item: ShipItem): { amount: number; service: string } {
  const d = ukDelivery([item]);
  const o = [...d.options].sort((a, b) => a.amount - b.amount)[0];
  return { amount: o.amount, service: d.kind === "large" ? "Furniture courier" : d.kind === "personal" ? "Insured courier" : "Royal Mail" };
}
