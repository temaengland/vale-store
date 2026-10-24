import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isAdminAuthed } from "@/lib/adminAuth";
import {
  eligibleForEtsy,
  etsyMap,
  etsyStatus,
  prepareEtsy,
  publishOnEtsy,
  runEtsySync,
  saveEtsySettings,
  sendToEtsy,
  startConnect,
  type EtsyDraft,
} from "@/lib/etsy";

// Admin → Etsy (update 142).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function err(e: unknown) {
  return e instanceof Error ? e.message : "Something went wrong";
}

export async function GET() {
  if (!isAdminAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = await etsyStatus();
  return NextResponse.json({ ...status, map: status.configured ? await etsyMap() : {} });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    productId?: string;
    draft?: EtsyDraft;
    markup?: number;
  };
  try {
    switch (body.action) {
      case "connect": {
        const { url, cookie } = startConnect();
        cookies().set("etsy_pkce", cookie, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 900 });
        return NextResponse.json({ url });
      }
      case "prepare":
        return NextResponse.json(await prepareEtsy(String(body.productId || "")));
      case "send":
        if (!body.draft) throw new Error("Nothing to send.");
        return NextResponse.json({ ok: true, ...(await sendToEtsy(String(body.productId || ""), body.draft)) });
      case "publish":
        await publishOnEtsy(String(body.productId || ""));
        return NextResponse.json({ ok: true });
      case "eligible":
        return NextResponse.json(await eligibleForEtsy());
      case "settings":
        return NextResponse.json(await saveEtsySettings({ markup: Number(body.markup) || 0 }));
      case "sync":
        return NextResponse.json(await runEtsySync());
      default:
        throw new Error("Unknown action.");
    }
  } catch (e) {
    return NextResponse.json({ error: err(e) }, { status: 400 });
  }
}
