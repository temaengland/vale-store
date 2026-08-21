import "server-only";
import Stripe from "stripe";

export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Stripe is not configured. Add STRIPE_SECRET_KEY to your environment variables."
    );
  }
  return new Stripe(key, { apiVersion: "2026-07-29.dahlia" });
}
