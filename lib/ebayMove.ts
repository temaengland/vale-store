import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { allActiveListings, endListing, getConnection, getItemRaw, trading, userAccessToken } from "@/lib/ebay";
import { words, similarity } from "@/lib/ebaySync";

// Update 161: move listings from the OLD eBay account ("charm chase") to the main one.
// Only items that are NOT already on the site or on the main eBay are offered.
// A move = create the same listing on the main account (same title, description,
// photos, category, item specifics, price) using the main account's own delivery /
// returns / payment policies, then end the old listing.

const MOVED_KEY = "ebay_moved_from_old"; // { oldItemId: newItemId }

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const { data } = await supabaseAdmin().from("app_settings").select("value").eq("key", key).maybeSingle();
  if (!data?.value) return fallback;
  try {
    return JSON.parse(data.value) as T;
  } catch {
    return fallback;
  }
}
async function writeJson(key: string, value: unknown) {
  await supabaseAdmin()
    .from("app_settings")
    .upsert({ key, value: JSON.stringify(value), updated_at: new Date().toISOString() });
}

export async function oldAccountStatus() {
  const c = await getConnection("old").catch(() => null);
  return { connected: Boolean(c), connectedAt: c?.connectedAt || null };
}

export type OldListing = {
  itemId: string;
  title: string;
  duplicateOf: string | null; // name of the matching site item / main-eBay listing
  movedTo: string | null;
};

function bestMatch(title: string, pool: { name: string; w: Set<string> }[]) {
  const w = words(title);
  if (w.size < 3) return null;
  let best: { name: string; score: number } | null = null;
  for (const p of pool) {
    if (p.w.size < 3) continue;
    const score = similarity(w, p.w);
    if (!best || score > best.score) best = { name: p.name, score };
  }
  return best && best.score >= 0.75 ? best.name : null;
}

/** Active listings on the old account, each marked if we already have it. */
export async function oldListings(): Promise<OldListing[]> {
  const oldToken = await userAccessToken("old");
  const mainToken = await userAccessToken("main");
  const [olds, mains, moved] = await Promise.all([
    allActiveListings(oldToken),
    allActiveListings(mainToken),
    readJson<Record<string, string>>(MOVED_KEY, {}),
  ]);
  const { data } = await supabaseAdmin().from("products").select("name, status").neq("status", "sold");
  const pool = [
    ...(data || []).map((p: { name: string }) => ({ name: `site: ${p.name}`, w: words(p.name) })),
    ...mains.map((m) => ({ name: `new eBay: ${m.title}`, w: words(m.title) })),
  ];
  const exact = new Set([...(data || []).map((p: { name: string }) => p.name.toLowerCase().trim()), ...mains.map((m) => m.title.toLowerCase().trim())]);
  return olds.map((o) => ({
    itemId: o.itemId,
    title: o.title,
    movedTo: moved[o.itemId] || null,
    duplicateOf: exact.has(o.title.toLowerCase().trim()) ? "same title" : bestMatch(o.title, pool),
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const cdata = (v: unknown) => `<![CDATA[${String(v ?? "").replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
const text = (v: Raw): string => (v && typeof v === "object" && "#text" in v ? String(v["#text"]) : String(v ?? ""));
const isFurniture = (it: Raw) => /furniture/i.test(text(it?.PrimaryCategory?.CategoryName));

/**
 * A live listing on the main account to borrow business policies (delivery/returns/payment) from.
 * Returns null when the main account's listings don't use business policies — then the old
 * listing's own delivery and returns settings are copied instead (update 161b).
 */
async function templateFor(mainToken: string, furniture: boolean): Promise<Raw | null> {
  const cacheKey = furniture ? "ebay_move_template_large" : "ebay_move_template_small";
  const cached = await readJson<string | null>(cacheKey, null);
  if (cached === "none") return null;
  if (cached) {
    try {
      const it = await getItemRaw(mainToken, cached);
      if (it?.SellerProfiles && text(it?.SellingStatus?.ListingStatus) === "Active") return it;
    } catch {
      /* look for another */
    }
  }
  const mains = await allActiveListings(mainToken);
  let fallback: Raw = null;
  for (const m of mains.slice(0, 6)) {
    const it = await getItemRaw(mainToken, m.itemId).catch(() => null);
    if (!it?.SellerProfiles?.SellerShippingProfile) continue;
    if (isFurniture(it) === furniture) {
      await writeJson(cacheKey, m.itemId);
      return it;
    }
    fallback = fallback || it;
  }
  if (!fallback) await writeJson(cacheKey, "none");
  return fallback;
}

const arr = (v: Raw) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);
const money = (v: Raw) => {
  const n = Number(text(v));
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
};

/** Our UK postage for eBay when the old listing has none we can copy: [service code, £]. */
function ourUkPostage(it: Raw): [string, string] {
  const price = Number(text(it.StartPrice)) || Number(text(it.SellingStatus?.CurrentPrice)) || 0;
  if (isFurniture(it)) return ["UK_OtherCourier", "70.00"];
  if (price < 150) return ["UK_RoyalMailTracked48", "4.95"];
  if (price < 250) return ["UK_RoyalMailTracked24", "5.95"];
  if (price < 750) return ["UK_RoyalMailSpecialDeliveryNextDay", "11.95"];
  if (price < 1000) return ["UK_RoyalMailSpecialDeliveryNextDay", "14.95"];
  return ["UK_RoyalMailSpecialDeliveryNextDay", "21.95"];
}

/** Delivery + returns copied from the old listing itself (when no business policies to borrow). */
function ownShippingXml(it: Raw) {
  const sd = it.ShippingDetails || {};
  const dom = arr(sd.ShippingServiceOptions)
    .filter((o: Raw) => o?.ShippingService)
    .slice(0, 4)
    .map(
      (o: Raw, i: number) => `<ShippingServiceOptions>
<ShippingService>${esc(text(o.ShippingService))}</ShippingService>
<ShippingServicePriority>${i + 1}</ShippingServicePriority>
${text(o.FreeShipping) === "true" ? "<FreeShipping>true</FreeShipping>" : `<ShippingServiceCost currencyID="GBP">${money(o.ShippingServiceCost)}</ShippingServiceCost>`}
${o.ShippingServiceAdditionalCost !== undefined ? `<ShippingServiceAdditionalCost currencyID="GBP">${money(o.ShippingServiceAdditionalCost)}</ShippingServiceAdditionalCost>` : ""}
</ShippingServiceOptions>`
    );
  const intl = arr(sd.InternationalShippingServiceOption)
    .filter((o: Raw) => o?.ShippingService)
    .slice(0, 3)
    .map(
      (o: Raw, i: number) => `<InternationalShippingServiceOption>
<ShippingService>${esc(text(o.ShippingService))}</ShippingService>
<ShippingServicePriority>${i + 1}</ShippingServicePriority>
<ShippingServiceCost currencyID="GBP">${money(o.ShippingServiceCost)}</ShippingServiceCost>
${arr(o.ShipToLocation).map((l: Raw) => `<ShipToLocation>${esc(text(l))}</ShipToLocation>`).join("")}
</InternationalShippingServiceOption>`
    );
  // Update 162b: listings on eBay's own "Standard Tracked Delivery" / calculated postage
  // don't return a service we can copy — use our own UK rates instead.
  const usable = dom.filter((x) => !x.includes("UK_CollectInPerson"));
  if (!usable.length) {
    dom.length = 0;
    intl.length = 0; // calculated/eBay-label international rates can't be copied either
    const [svc, cost] = ourUkPostage(it);
    dom.push(
      `<ShippingServiceOptions><ShippingService>${svc}</ShippingService><ShippingServicePriority>1</ShippingServicePriority><ShippingServiceCost currencyID="GBP">${cost}</ShippingServiceCost></ShippingServiceOptions>`
    );
  }
  const shipping = `<ShippingDetails><ShippingType>Flat</ShippingType>${dom.join("")}${intl.join("")}</ShippingDetails>`;

  const rp = it.ReturnPolicy || {};
  const accepted = text(rp.ReturnsAcceptedOption) || "ReturnsAccepted";
  const returns =
    accepted === "ReturnsNotAccepted"
      ? `<ReturnPolicy><ReturnsAcceptedOption>ReturnsNotAccepted</ReturnsAcceptedOption></ReturnPolicy>`
      : `<ReturnPolicy><ReturnsAcceptedOption>ReturnsAccepted</ReturnsAcceptedOption><ReturnsWithinOption>${esc(
          text(rp.ReturnsWithinOption) || "Days_30"
        )}</ReturnsWithinOption><ShippingCostPaidByOption>${esc(text(rp.ShippingCostPaidByOption) || "Buyer")}</ShippingCostPaidByOption></ReturnPolicy>`;
  return shipping + returns;
}

function specificsXml(it: Raw) {
  const list = it?.ItemSpecifics?.NameValueList || [];
  const rows = (Array.isArray(list) ? list : [list])
    .filter((n: Raw) => n && n.Name)
    .map((n: Raw) => {
      const vals = Array.isArray(n.Value) ? n.Value : [n.Value];
      return `<NameValueList><Name>${esc(text(n.Name))}</Name>${vals
        .filter((v: Raw) => v !== undefined && v !== null && text(v) !== "")
        .map((v: Raw) => `<Value>${esc(text(v))}</Value>`)
        .join("")}</NameValueList>`;
    });
  return rows.length ? `<ItemSpecifics>${rows.join("")}</ItemSpecifics>` : "";
}

/** Copies one old-account listing to the main account, then ends the old one. */
export async function moveListing(oldItemId: string) {
  const moved = await readJson<Record<string, string>>(MOVED_KEY, {});
  if (moved[oldItemId]) return { newItemId: moved[oldItemId], already: true };

  const oldToken = await userAccessToken("old");
  const mainToken = await userAccessToken("main");
  const it = await getItemRaw(oldToken, oldItemId);
  if (!it?.Title) throw new Error("Old listing not found.");
  if (text(it?.SellingStatus?.ListingStatus) && text(it.SellingStatus.ListingStatus) !== "Active")
    throw new Error("Old listing is no longer active.");

  const tpl = await templateFor(mainToken, isFurniture(it));
  const sp = tpl?.SellerProfiles;
  const price =
    Number(text(it.StartPrice)) || Number(text(it.BuyItNowPrice)) || Number(text(it.SellingStatus?.CurrentPrice)) || 0;
  if (!price) throw new Error("Old listing has no price.");
  const pics: string[] = (it.PictureDetails?.PictureURL || []).map((u: Raw) => text(u)).filter(Boolean).slice(0, 24);
  if (!pics.length) throw new Error("Old listing has no photos.");

  const xml = `<Item>
<Title>${esc(text(it.Title)).slice(0, 80)}</Title>
<Description>${cdata(text(it.Description))}</Description>
<PrimaryCategory><CategoryID>${esc(text(it.PrimaryCategory?.CategoryID))}</CategoryID></PrimaryCategory>
<CategoryMappingAllowed>true</CategoryMappingAllowed>
<StartPrice currencyID="GBP">${price.toFixed(2)}</StartPrice>
<Currency>GBP</Currency>
<Country>GB</Country>
<Location>${esc(text(tpl?.Location) || "Evesham")}</Location>
<PostalCode>${esc(text(tpl?.PostalCode) || "WR11 4DA")}</PostalCode>
<DispatchTimeMax>${esc(text(tpl?.DispatchTimeMax) || text(it.DispatchTimeMax) || "2")}</DispatchTimeMax>
<ListingDuration>GTC</ListingDuration>
<ListingType>FixedPriceItem</ListingType>
<Quantity>1</Quantity>
${it.ConditionID ? `<ConditionID>${esc(text(it.ConditionID))}</ConditionID>` : ""}
${it.ConditionDescription ? `<ConditionDescription>${esc(text(it.ConditionDescription)).slice(0, 1000)}</ConditionDescription>` : ""}
<PictureDetails>${pics.map((u) => `<PictureURL>${esc(u)}</PictureURL>`).join("")}</PictureDetails>
${specificsXml(it)}
${
  sp?.SellerShippingProfile
    ? `<SellerProfiles>
<SellerShippingProfile><ShippingProfileID>${esc(text(sp.SellerShippingProfile?.ShippingProfileID))}</ShippingProfileID></SellerShippingProfile>
<SellerReturnProfile><ReturnProfileID>${esc(text(sp.SellerReturnProfile?.ReturnProfileID))}</ReturnProfileID></SellerReturnProfile>
<SellerPaymentProfile><PaymentProfileID>${esc(text(sp.SellerPaymentProfile?.PaymentProfileID))}</PaymentProfileID></SellerPaymentProfile>
</SellerProfiles>`
    : ownShippingXml(it)
}
</Item>`;

  const r = await trading("AddFixedPriceItem", xml, mainToken);
  const newItemId = text(r.ItemID);
  if (!newItemId) throw new Error("eBay did not return the new item number.");
  moved[oldItemId] = newItemId;
  await writeJson(MOVED_KEY, moved);

  const ended = await endListing(oldToken, oldItemId);
  return { newItemId, oldEnded: ended.ok, endError: ended.ok ? null : ended.error };
}
