import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getProduct } from "@/lib/data";

export async function POST(req: NextRequest) {
  const { slug } = await req.json();
  const product = await getProduct(slug);

  if (!product) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }

  const origin = req.headers.get("origin") ?? "";

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: product.price,
            product_data: {
              name: product.name,
              description: product.description,
              images: product.image ? [product.image] : undefined,
            },
          },
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
