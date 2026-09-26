import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { endEbayListingsFor } from "@/lib/ebaySync";
import {
  createShipment,
  shippingNameToServiceCode,
} from "@/lib/royalMail";

export const runtime = "nodejs";

// Stripe requires the raw request body (unparsed) to verify the webhook
// signature, so this route must NOT use the normal req.json() helper.
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Webhook is not configured (missing signature or secret)." },
      { status: 400 }
    );
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error.";
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Re-fetch with line items expanded — the webhook payload alone
      // doesn't include them.
      const fullSession = await stripe().checkout.sessions.retrieve(
        session.id,
        { expand: ["line_items", "line_items.data.price.product"] }
      );

      const admin = supabaseAdmin();

      // Skip if we've already recorded this session (Stripe can send the
      // same webhook event more than once — this keeps orders from being
      // duplicated).
      const { data: existing } = await admin
        .from("orders")
        .select("id")
        .eq("stripe_session_id", session.id)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ received: true, duplicate: true });
      }

      const lineItems = fullSession.line_items?.data ?? [];

      // Shipping charged via shipping_options appears as its own field on
      // the session (not as a line item) — every entry in line_items is a
      // real product.
      const shippingAmount = fullSession.shipping_cost?.amount_total ?? 0;

      const { data: allProducts } = await admin
        .from("products")
        .select("id, slug, name, cost_price");

      const orderItems = lineItems.map((li) => {
        const productObj = li.price?.product;
        const slugFromMetadata =
          typeof productObj === "object" && productObj && "metadata" in productObj
            ? (productObj.metadata as Record<string, string> | undefined)?.slug
            : undefined;
        const match = slugFromMetadata
          ? allProducts?.find((p) => p.slug === slugFromMetadata)
          : allProducts?.find((p) => p.name === li.description);
        return {
          slug: match?.slug ?? null,
          name: li.description,
          price: li.amount_total ?? 0,
          cost_price: match?.cost_price ?? null,
        };
      });

      const subtotal = lineItems.reduce(
        (sum, li) => sum + (li.amount_total ?? 0),
        0
      );

      await admin.from("orders").insert({
        stripe_session_id: session.id,
        customer_email: fullSession.customer_details?.email ?? null,
        customer_name: fullSession.customer_details?.name ?? null,
        customer_phone: fullSession.customer_details?.phone ?? null,
        shipping_address: fullSession.collected_information?.shipping_details?.address ?? null,
        delivery_notes:
          fullSession.custom_fields?.find((f) => f.key === "delivery_notes")
            ?.text?.value ?? null,
        items: orderItems,
        subtotal,
        shipping_amount: shippingAmount,
        total: fullSession.amount_total ?? subtotal + shippingAmount,
        currency: fullSession.currency ?? "gbp",
      });

      // Mark each purchased product as sold — antiques are one-of-a-kind,
      // so a sale always means the listing should come down.
      const matchedIds =
        allProducts
          ?.filter((p) => orderItems.some((oi) => oi.slug === p.slug))
          .map((p) => p.id) ?? [];
      if (matchedIds.length > 0) {
        await admin
          .from("products")
          .update({ status: "sold" })
          .in("id", matchedIds);
        // Same item listed on eBay → end that listing so it can't sell twice.
        await endEbayListingsFor(matchedIds);
      }

      // Generate Royal Mail shipping label automatically — best-effort,
      // never blocks the order from being recorded if it fails.
      const shippingAddress =
        fullSession.collected_information?.shipping_details;
      if (
        shippingAddress?.address &&
        process.env.ROYAL_MAIL_API_KEY
      ) {
        try {
          const shippingDisplayName =
            fullSession.shipping_cost?.shipping_rate
              ? (
                  await stripe().shippingRates.retrieve(
                    fullSession.shipping_cost.shipping_rate as string
                  )
                ).display_name ?? ""
              : "";

          // Sum up the weight from all purchased products
          const { data: productDetails } = await admin
            .from("products")
            .select("weight_grams")
            .in("slug", orderItems.map((oi) => oi.slug).filter(Boolean));
          const totalWeightGrams =
            productDetails?.reduce(
              (sum, p) => sum + (p.weight_grams ?? 500),
              0
            ) ?? 500; // default 500g if weight not set

          const shipment = await createShipment({
            recipientName:
              fullSession.customer_details?.name ?? "Customer",
            addressLine1: shippingAddress.address.line1 ?? "",
            addressLine2: shippingAddress.address.line2 ?? undefined,
            city: shippingAddress.address.city ?? "",
            postcode: shippingAddress.address.postal_code ?? "",
            countryCode:
              shippingAddress.address.country ?? "GB",
            weightGrams: totalWeightGrams,
            serviceCode: shippingNameToServiceCode(shippingDisplayName),
            orderReference: session.id.slice(-12),
            itemDescription: orderItems.map((oi) => oi.name).join(", "),
            itemValue: subtotal,
          });

          // Save tracking number and label URL back to the order
          await admin
            .from("orders")
            .update({
              tracking_number: shipment.trackingNumber,
              label_url: shipment.labelUrl,
            })
            .eq("stripe_session_id", session.id);
        } catch (labelError) {
          // Log the error but don't fail the webhook — the order is already
          // saved, so the label can be generated manually from Click & Drop.
          console.error("Royal Mail label generation failed:", labelError);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error.";
    // Return 500 so Stripe retries the webhook later rather than silently
    // losing the order record.
    return NextResponse.json(
      { error: `Webhook processing failed: ${message}` },
      { status: 500 }
    );
  }
}
