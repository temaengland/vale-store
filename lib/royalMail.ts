// Royal Mail Click & Drop API integration.
// Docs: https://developer.royalmail.net/node/671
// API key is stored in ROYAL_MAIL_API_KEY environment variable.

const CLICKDROP_API = "https://api.parcel.royalmail.com/api/v1";

export type RoyalMailShipmentInput = {
  recipientName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postcode: string;
  countryCode: string; // GB, US, etc.
  weightGrams: number;
  serviceCode: string; // "TRK48" for Tracked 48, "SD1" for Special Delivery
  orderReference: string; // our internal order ID
  itemDescription: string;
  itemValue: number; // in pence
};

export type RoyalMailShipmentResult = {
  shipmentId: string;
  trackingNumber: string;
  labelUrl: string;
};

function apiKey() {
  const key = process.env.ROYAL_MAIL_API_KEY;
  if (!key) throw new Error("ROYAL_MAIL_API_KEY is not set.");
  return key;
}

export async function createShipment(
  input: RoyalMailShipmentInput
): Promise<RoyalMailShipmentResult> {
  const res = await fetch(`${CLICKDROP_API}/Orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": apiKey(),
    },
    body: JSON.stringify({
      orderReference: input.orderReference,
      recipient: {
        name: input.recipientName,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2 ?? "",
        city: input.city,
        postcode: input.postcode,
        countryCode: input.countryCode,
      },
      packages: [
        {
          weightInGrams: input.weightGrams,
          packageFormatIdentifier: "Parcel",
          contents: [
            {
              name: input.itemDescription.slice(0, 100),
              quantity: 1,
              unitValue: input.itemValue / 100,
              unitWeightInGrams: input.weightGrams,
            },
          ],
        },
      ],
      service: {
        serviceCode: input.serviceCode,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Click & Drop API error ${res.status}: ${body || res.statusText}`
    );
  }

  const data = await res.json();

  return {
    shipmentId: data.orderId ?? data.shipmentId ?? "",
    trackingNumber: data.packages?.[0]?.trackingNumber ?? "",
    labelUrl: data.labelUrl ?? data.packages?.[0]?.labelUrl ?? "",
  };
}

// Map our Stripe shipping_rate display_name to a Royal Mail service code
export function shippingNameToServiceCode(displayName: string): string {
  if (displayName.toLowerCase().includes("special delivery")) return "SD1";
  return "TRK48"; // default to Tracked 48
}
