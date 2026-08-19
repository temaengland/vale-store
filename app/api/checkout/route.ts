import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getProduct } from "@/lib/data";

export async function POST(req: NextRequest) {
  const { slug } = await req.json();
  const product = await getProduct(slug);

  if (!product) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }

  const origin = req.headers.get("origin") ?? "";

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      quantity: 1,
      price_data: {
        currency: "gbp",
        unit_amount: product.price,
        product_data: {
          name: product.name,
          description: product.description,
          images:
            product.images && product.images.length > 0
              ? [product.images[0]]
              : product.image
              ? [product.image]
              : undefined,
        },
      },
    },
  ];

  if (product.shipping_cost && product.shipping_cost > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "gbp",
        unit_amount: product.shipping_cost,
        product_data: {
          name: "Estimated shipping",
        },
      },
    });
  }

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      // Collect everything needed to actually deliver the item — without
      // this, "Buy now" would only take payment and leave you with no way
      // to send it to the buyer.
      phone_number_collection: { enabled: true },
      shipping_address_collection: {
        allowed_countries: ["GB", "IE", "US", "CA", "AU", "FR", "DE"],
      },
      custom_fields: [
        {
          key: "delivery_notes",
          label: { type: "custom", custom: "Delivery notes (optional)" },
          type: "text",
          optional: true,
        },
      ],
      success_url: `${origin}/product/${product.slug}?paid=1`,
      cancel_url: `${origin}/product/${product.slug}?canceled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json(
      { error: "Payments aren't set up yet." },
      { status: 500 }
    );
  }
}
