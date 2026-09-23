import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getAllProducts } from "@/lib/data";

// Handles both "Buy now" (a single slug) and cart checkout (multiple
// slugs) — the request body is always { slugs: string[] }.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const slugs: string[] = Array.isArray(body.slugs)
      ? body.slugs
      : body.slug
      ? [body.slug] // backwards-compatible with any older single-slug caller
      : [];

    if (slugs.length === 0) {
      return NextResponse.json({ error: "No items given." }, { status: 400 });
    }

    const all = await getAllProducts();
    const products = slugs
      .map((slug) => all.find((p) => p.slug === slug))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));

    if (products.length === 0) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    const unavailable = products.find(
      (p) => p.status && p.status !== "available"
    );
    if (unavailable) {
      return NextResponse.json(
        {
          error: `"${unavailable.name}" is no longer available for purchase.`,
        },
        { status: 409 }
      );
    }

    const origin = req.headers.get("origin") ?? "";

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      products.map((product) => {
        // Stripe rejects product descriptions over ~500 characters — trim
        // so a long pasted description never silently breaks checkout.
        const safeDescription =
          product.description.length > 480
            ? product.description.slice(0, 477) + "..."
            : product.description;
        return {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: product.price,
            product_data: {
              name: product.name,
              description: safeDescription,
              images:
                product.images && product.images.length > 0
                  ? [product.images[0]]
                  : product.image
                  ? [product.image]
                  : undefined,
              // Reliable product identity for the webhook to match against
              // afterwards — matching by name alone breaks silently if a
              // name ever contains an odd character or gets edited.
              metadata: { slug: product.slug },
            },
          },
        };
      });

    // Royal Mail hard limits (Medium Parcel, 2026):
    // max 61cm × 46cm × 46cm, max 20kg.
    // If ANY item in the order exceeds these, skip RM tiers entirely and
    // fall back to the seller's own flat rate (set per item in admin).
    const ROYAL_MAIL_MAX_LENGTH_CM = 61;
    const ROYAL_MAIL_MAX_WIDTH_CM = 46;
    const ROYAL_MAIL_MAX_HEIGHT_CM = 46;
    const ROYAL_MAIL_MAX_WEIGHT_G = 20000;

    const tooBigForRoyalMail = products.some((p) => {
      const dims = [p.length_cm, p.width_cm, p.height_cm].filter(Boolean) as number[];
      if (dims.length > 0) {
        const sorted = [...dims].sort((a, b) => b - a);
        if (sorted[0] > ROYAL_MAIL_MAX_LENGTH_CM) return true;
        if ((sorted[1] ?? 0) > ROYAL_MAIL_MAX_WIDTH_CM) return true;
        if ((sorted[2] ?? 0) > ROYAL_MAIL_MAX_HEIGHT_CM) return true;
      }
      if (p.weight_grams && p.weight_grams > ROYAL_MAIL_MAX_WEIGHT_G) return true;
      return false;
    });

    // Two Royal Mail tiers for UK buyers:
    //  - Tracked 48: standard 2-day delivery, up to £75 compensation
    //  - Special Delivery: guaranteed next-day by 1pm, £750 compensation
    //    — mandatory for items worth £150+ (Tracked 48's £75 cap would
    //    leave most of the item's value unprotected if lost)
    const SPECIAL_DELIVERY_FLOOR_PENCE = 815; // £8.15 minimum (Royal Mail small parcel rate)
    const SPECIAL_DELIVERY_PREMIUM_PENCE = 450; // £4.50 over Tracked 48
    const HIGH_VALUE_THRESHOLD_PENCE = 15000;    // £150 — above this, only Special Delivery
    const VERY_HIGH_VALUE_THRESHOLD_PENCE = 100000; // £1000 — above this, manual delivery only

    const subtotal = products.reduce((sum, p) => sum + p.price, 0);
    const requiresManualDelivery = subtotal >= VERY_HIGH_VALUE_THRESHOLD_PENCE;
    const requiresSpecialDelivery = !requiresManualDelivery &&
      subtotal >= HIGH_VALUE_THRESHOLD_PENCE;

    const ukShippingTotal = products.reduce(
      (sum, p) => sum + (p.shipping_cost ?? 0),
      0
    );
    const specialDeliveryTotal = Math.max(
      SPECIAL_DELIVERY_FLOOR_PENCE,
      ukShippingTotal + SPECIAL_DELIVERY_PREMIUM_PENCE
    );
    const intlShippingTotal = products.reduce(
      (sum, p) => sum + (p.international_shipping_cost ?? 0),
      0
    );

    const shippingOptions: Stripe.Checkout.SessionCreateParams.ShippingOption[] =
      tooBigForRoyalMail || requiresManualDelivery
        ? [
            // Too large for Royal Mail, OR high-value item (£1000+) —
            // delivery arranged personally with the buyer after purchase.
            {
              shipping_rate_data: {
                type: "fixed_amount",
                fixed_amount: { amount: ukShippingTotal, currency: "gbp" },
                display_name: requiresManualDelivery
                  ? "Insured delivery — we will contact you to arrange"
                  : "Delivery (contact us to arrange)",
              },
            },
          ]
        : requiresSpecialDelivery
        ? [
            // High-value item (£150+) — only offer Special Delivery so
            // the shipment is always covered for up to £750.
            {
              shipping_rate_data: {
                type: "fixed_amount",
                fixed_amount: { amount: specialDeliveryTotal, currency: "gbp" },
                display_name:
                  "Royal Mail Special Delivery — next day by 1pm, £750 insured",
                delivery_estimate: {
                  minimum: { unit: "business_day", value: 1 },
                  maximum: { unit: "business_day", value: 1 },
                },
              },
            },
          ]
        : [
            {
              shipping_rate_data: {
                type: "fixed_amount",
                fixed_amount: { amount: ukShippingTotal, currency: "gbp" },
                display_name:
                  ukShippingTotal === 0
                    ? "Royal Mail Tracked 48 (Free)"
                    : "Royal Mail Tracked 48",
                delivery_estimate: {
                  minimum: { unit: "business_day", value: 2 },
                  maximum: { unit: "business_day", value: 3 },
                },
              },
            },
            {
              shipping_rate_data: {
                type: "fixed_amount",
                fixed_amount: {
                  amount: specialDeliveryTotal,
                  currency: "gbp",
                },
                display_name:
                  "Royal Mail Special Delivery — next day by 1pm, £750 insured",
                delivery_estimate: {
                  minimum: { unit: "business_day", value: 1 },
                  maximum: { unit: "business_day", value: 1 },
                },
              },
            },
          ];
    if (intlShippingTotal > 0) {
      shippingOptions.push({
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: intlShippingTotal, currency: "gbp" },
          display_name: "International shipping",
        },
      });
    }

    // Single-item purchases return to that product's page; cart checkouts
    // return to the homepage (there's no one product page to land on).
    const successUrl =
      products.length === 1
        ? `${origin}/product/${products[0].slug}?paid=1`
        : `${origin}/?paid=1`;
    const cancelUrl =
      products.length === 1
        ? `${origin}/product/${products[0].slug}?canceled=1`
        : `${origin}/cart?canceled=1`;

    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      // Collect everything needed to actually deliver the item(s) —
      // without this, checkout would only take payment and leave you with
      // no way to send it to the buyer.
      phone_number_collection: { enabled: true },
      shipping_address_collection: {
        // Practically worldwide — Stripe's full list of shippable
        // destination countries, matching how the big antique platforms
        // (e.g. 1stDibs) advertise "we ship worldwide" rather than a short
        // curated list that keeps missing a country a buyer actually needs.
        // Stripe already excludes countries under international sanctions
        // (Iran, North Korea, Cuba, Syria, etc.) from this list itself.
        allowed_countries: [
          "AC", "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR",
          "AT", "AU", "AW", "AX", "AZ", "BA", "BB", "BD", "BE", "BF", "BG",
          "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT",
          "BV", "BW", "BY", "BZ", "CA", "CD", "CF", "CG", "CH", "CI", "CK",
          "CL", "CM", "CN", "CO", "CR", "CV", "CW", "CY", "CZ", "DE", "DJ",
          "DK", "DM", "DO", "DZ", "EC", "EE", "EG", "EH", "ER", "ES", "ET",
          "FI", "FJ", "FK", "FO", "FR", "GA", "GB", "GD", "GE", "GF", "GG",
          "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU",
          "GW", "GY", "HK", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM",
          "IN", "IO", "IQ", "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG",
          "KH", "KI", "KM", "KN", "KR", "KW", "KY", "KZ", "LA", "LB", "LC",
          "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD",
          "ME", "MF", "MG", "MK", "ML", "MM", "MN", "MO", "MQ", "MR", "MS",
          "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NC", "NE", "NG",
          "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF",
          "PG", "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PY", "QA",
          "RE", "RO", "RS", "RU", "RW", "SA", "SB", "SC", "SE", "SG", "SH",
          "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV",
          "SX", "SZ", "TA", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL",
          "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "US",
          "UY", "UZ", "VA", "VC", "VE", "VG", "VN", "VU", "WF", "WS", "XK",
          "YE", "YT", "ZA", "ZM", "ZW",
        ],
      },
      ...(shippingOptions.length > 0 ? { shipping_options: shippingOptions } : {}),
      custom_fields: [
        {
          key: "delivery_notes",
          label: { type: "custom", custom: "Delivery notes (optional)" },
          type: "text",
          optional: true,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error.";
    return NextResponse.json(
      { error: `Checkout couldn't be started: ${message}` },
      { status: 500 }
    );
  }
}
