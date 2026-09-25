import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";

// Diagnostic + alternative setup for eBay "Marketplace Account Deletion"
// notifications through eBay's Notification API (instead of the developer
// portal form, which fails with "save unsuccessful. Try again later").
//
// Open while logged into /admin:
//   https://www.charmchase.co.uk/api/admin/ebay/notifications          → check only (changes nothing)
//   https://www.charmchase.co.uk/api/admin/ebay/notifications?run=1    → create destination + subscription
//
// Uses EBAY_APP_ID + EBAY_CERT_ID (application token) and EBAY_VERIFICATION_TOKEN.
// Every eBay reply is shown as-is so we can see the real reason for failures.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const API = process.env.EBAY_API_BASE || "https://api.ebay.com";
const ENDPOINT =
  process.env.EBAY_DELETION_ENDPOINT || "https://www.charmchase.co.uk/api/ebay/account-deletion";
const TOPIC = "MARKETPLACE_ACCOUNT_DELETION";

type Step = { step: string; status?: number; ok: boolean; data?: unknown; note?: string };

async function call(method: string, path: string, token: string, body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* keep text */
  }
  return { status: res.status, ok: res.ok, data, location: res.headers.get("location") };
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthed()) return NextResponse.json({ error: "Log in to /admin first" }, { status: 401 });

  const run = req.nextUrl.searchParams.get("run") === "1";
  const steps: Step[] = [];
  const appId = (process.env.EBAY_APP_ID || "").trim();
  const certId = (process.env.EBAY_CERT_ID || "").trim();
  const vToken = (process.env.EBAY_VERIFICATION_TOKEN || "").trim();

  steps.push({
    step: "env",
    ok: Boolean(appId && certId && vToken),
    data: {
      EBAY_APP_ID: appId ? `${appId.slice(0, 12)}…` : "MISSING",
      EBAY_CERT_ID: certId ? "set" : "MISSING",
      EBAY_VERIFICATION_TOKEN: vToken ? `set (${vToken.length} chars)` : "MISSING",
      endpoint: ENDPOINT,
    },
  });
  if (!appId || !certId) return NextResponse.json({ run, steps });

  // 1. Application token
  const tokRes = await fetch(`${API}/identity/v1/oauth2/token`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Basic ${Buffer.from(`${appId}:${certId}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=" + encodeURIComponent("https://api.ebay.com/oauth/api_scope"),
  });
  const tokJson = await tokRes.json().catch(() => ({}));
  const token: string = tokJson.access_token || "";
  steps.push({
    step: "application token",
    status: tokRes.status,
    ok: Boolean(token),
    data: token ? { expires_in: tokJson.expires_in } : tokJson,
    note: token ? undefined : "eBay refused the keyset — this is the Non Compliant block itself.",
  });
  if (!token) return NextResponse.json({ run, steps });

  // 2. Topic + current state
  const topic = await call("GET", `/commerce/notification/v1/topic/${TOPIC}`, token);
  steps.push({ step: "topic", status: topic.status, ok: topic.ok, data: topic.data });

  const config = await call("GET", "/commerce/notification/v1/config", token);
  steps.push({ step: "config (alert email)", status: config.status, ok: config.ok, data: config.data });

  const dests = await call("GET", "/commerce/notification/v1/destination", token);
  steps.push({ step: "destinations", status: dests.status, ok: dests.ok, data: dests.data });

  const subs = await call("GET", "/commerce/notification/v1/subscription", token);
  steps.push({ step: "subscriptions", status: subs.status, ok: subs.ok, data: subs.data });

  if (!run) {
    return NextResponse.json({ run, steps, next: "Add ?run=1 to the address to create the destination and subscription." });
  }
  if (!vToken) return NextResponse.json({ run, steps, error: "EBAY_VERIFICATION_TOKEN missing" });

  // 3. Destination (reuse if it already exists)
  type Dest = { destinationId: string; deliveryConfig?: { endpoint?: string } };
  const existing = ((dests.data as { destinations?: Dest[] })?.destinations || []).find(
    (d) => d.deliveryConfig?.endpoint === ENDPOINT
  );
  let destinationId = existing?.destinationId || "";
  if (!destinationId) {
    const created = await call("POST", "/commerce/notification/v1/destination", token, {
      name: "CharmChase account deletion",
      status: "ENABLED",
      deliveryConfig: { endpoint: ENDPOINT, verificationToken: vToken },
    });
    destinationId = created.location?.split("/").pop() || "";
    steps.push({ step: "create destination", status: created.status, ok: created.ok, data: created.data || destinationId });
    if (!created.ok) return NextResponse.json({ run, steps });
  } else {
    steps.push({ step: "create destination", ok: true, note: `already exists: ${destinationId}` });
  }

  // 4. Subscription to MARKETPLACE_ACCOUNT_DELETION
  type Sub = { topicId?: string };
  const hasSub = ((subs.data as { subscriptions?: Sub[] })?.subscriptions || []).some((s) => s.topicId === TOPIC);
  if (!hasSub) {
    const sub = await call("POST", "/commerce/notification/v1/subscription", token, {
      topicId: TOPIC,
      status: "ENABLED",
      destinationId,
      payload: { format: "JSON", schemaVersion: "1.0", deliveryProtocol: "HTTPS" },
    });
    steps.push({ step: "create subscription", status: sub.status, ok: sub.ok, data: sub.data || sub.location });
  } else {
    steps.push({ step: "create subscription", ok: true, note: "already subscribed" });
  }

  return NextResponse.json({ run, steps });
}
