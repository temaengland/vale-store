import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getProduct } from "@/lib/data";

export async function POST(req: NextRequest) {
  try {
    const { slug } = await req.json();
    const product = await getProduct(slug);

    if (!product) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    if (product.status && product.status !== "available") {
      return NextResponse.json(
        { error: "This item is no longer available for purchase." },
        { status: 409 }
      );
    }

    const origin = req.headers.get("origin") ?? "";

    // Stripe rejects product descriptions over ~500 characters — trim so a
    // long pasted description never silently breaks checkout.
    const safeDescription =
      product.description.length > 480
        ? product.description.slice(0, 477) + "..."
        : product.description;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
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
    const message = e instanceof Error ? e.message : "Unknown error.";
    return NextResponse.json(
      { error: `Checkout couldn't be started: ${message}` },
      { status: 500 }
    );
  }
}
