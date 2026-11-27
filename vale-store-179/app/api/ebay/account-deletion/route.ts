import { createHash } from "crypto";
import { NextResponse } from "next/server";

// eBay "Marketplace Account Deletion" notifications — required for every
// eBay developer app, otherwise the keyset stays "Non Compliant" and the
// API can't be used (needed for importing our eBay listings).
//
// eBay setup (developer.ebay.com → Alerts & Notifications → Marketplace Account Deletion):
//   Endpoint:            https://www.charmchase.co.uk/api/ebay/account-deletion
//   Verification token:  same value as EBAY_VERIFICATION_TOKEN in Vercel (32–80 chars: letters, digits, _ or -)
//
// We don't store any eBay buyers' personal data, so a deletion notice only
// needs to be acknowledged with 200 OK.

export const dynamic = "force-dynamic";

const DEFAULT_ENDPOINT = "https://www.charmchase.co.uk/api/ebay/account-deletion";

// Step 1: eBay checks the endpoint with GET ?challenge_code=...
export async function GET(request: Request) {
  const challengeCode = new URL(request.url).searchParams.get("challenge_code");
  const token = (process.env.EBAY_VERIFICATION_TOKEN || "").trim();
  const endpoint = (process.env.EBAY_DELETION_ENDPOINT || DEFAULT_ENDPOINT).trim();

  if (!challengeCode) return NextResponse.json({ error: "Missing challenge_code" }, { status: 400 });
  if (!token) return NextResponse.json({ error: "EBAY_VERIFICATION_TOKEN is not set" }, { status: 500 });

  const challengeResponse = createHash("sha256")
    .update(challengeCode)
    .update(token)
    .update(endpoint)
    .digest("hex");

  return NextResponse.json({ challengeResponse }, { status: 200 });
}

// Step 2: real deletion notices arrive as POST — acknowledge them.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const userId = body?.notification?.data?.userId;
    console.log("eBay account deletion notice received", userId ? `for user ${userId}` : "");
  } catch {
    /* always acknowledge */
  }
  return new NextResponse(null, { status: 200 });
}
