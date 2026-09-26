"use client";

import { useEffect, useRef, useState } from "react";
import ImageCropUpload from "@/components/admin/ImageCropUpload";
import { categories } from "@/lib/products";
import InstagramPublishModal, { PostedInfo } from "@/components/admin/InstagramPublishModal";

type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  category: "furniture" | "jewelry" | "decor" | "art";
  subcategory?: string;
  era?: string;
  description: string;
  image?: string;
  images?: string[];
  icon: string;
  cost_price?: number;
  shipping_cost?: number;
  international_shipping_cost?: number;
  weight_grams?: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  status?: "available" | "unavailable" | "sold";
  is_draft?: boolean;
};

const emptyForm = {
  slug: "",
  name: "",
  price: "",
  category: "furniture" as AdminProduct["category"],
  subcategory: "",
  era: "",
  description: "",
  image: "",
  images: [] as string[],
  icon: "generic",
  cost_price: "",
  shipping_cost: "",
  international_shipping_cost: "",
  weight_grams: "",
  weightUnit: "g" as "g" | "kg",
  length_cm: "",
  width_cm: "",
  height_cm: "",
  status: "available" as "available" | "unavailable" | "sold",
};

export default function ProductsPanel({
  editId,
  onEditHandled,
  onBackToDrafts,
}: {
  editId?: string | null;
  onEditHandled?: () => void;
  onBackToDrafts?: (id?: string) => void;
} = {}) {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingDraft, setEditingDraft] = useState(false);
  const publishRef = useRef(false);
  const [igItem, setIgItem] = useState<AdminProduct | null>(null);
  const [igStatus, setIgStatus] = useState<{
    configured: boolean;
    username?: string;
    error?: string;
    posted: Record<string, PostedInfo>;
  }>({ configured: false, posted: {} });

  async function loadInstagramStatus() {
    try {
      const res = await fetch("/api/admin/instagram");
      if (!res.ok) return;
      const data = await res.json();
      setIgStatus({
        configured: Boolean(data.configured),
        username: data.username,
        error: data.error,
        posted: data.posted ?? {},
      });
    } catch {
      /* Instagram status is optional */
    }
  }

  async function loadProducts() {
    setLoadError("");
    try {
      const res = await fetch("/api/admin/products");
      if (!res.ok) {
        if (res.status === 401) {
          setLoadError("Your session expired — please log out and log back in.");
        } else {
          const data = await res.json().catch(() => ({}));
          setLoadError(
            data.error
              ? `Couldn't load items: ${data.error}`
              : "Couldn't load items — try refreshing the page."
          );
        }
        return;
      }
      const data = await res.json();
      setProducts(data.products ?? []);
    } catch {
      setLoadError(
        "Couldn't reach the server — check your internet connection and try again."
      );
    }
  }

  useEffect(() => {
    loadProducts();
    loadInstagramStatus();
  }, []);

  // Opened from Review drafts → "Edit": jump straight into that item's editor.
  useEffect(() => {
    if (!editId || !products.length) return;
    const p = products.find((x) => x.id === editId);
    if (p) startEdit(p);
    onEditHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, products]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    // weightUnit and raw weight_grams string are UI-only — exclude them
    // from the database payload and replace with the converted numeric value.
    const { weightUnit, weight_grams, length_cm, width_cm, height_cm,
            shipping_cost, international_shipping_cost, cost_price,
            ...restFormData } = form;
    const payload = {
      ...restFormData,
      price: Math.round(Number(form.price) * 100),
      cost_price: cost_price
        ? Math.round(Number(cost_price) * 100)
        : null,
      shipping_cost: shipping_cost
        ? Math.round(Number(shipping_cost) * 100)
        : null,
      international_shipping_cost: international_shipping_cost
        ? Math.round(Number(international_shipping_cost) * 100)
        : null,
      weight_grams: weight_grams
        ? weightUnit === "kg"
          ? Math.round(Number(weight_grams) * 1000)
          : Math.round(Number(weight_grams))
        : null,
      length_cm: length_cm ? Number(length_cm) : null,
      width_cm: width_cm ? Number(width_cm) : null,
      height_cm: height_cm ? Number(height_cm) : null,
      // "Save & publish" on a draft makes it live; plain save keeps it hidden.
      ...(editingDraft && publishRef.current ? { is_draft: false } : {}),
    };
    const res = await fetch(
      editingId ? `/api/admin/products/${editingId}` : "/api/admin/products",
      {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Save failed.");
      return;
    }
    // Marked Sold → the site also ends the eBay listing (update 107).
    const saved = await res.json().catch(() => ({}));
    const ebayResults = (saved.ebay || []) as { ok: boolean; error?: string }[];
    if (ebayResults.length) {
      alert(
        ebayResults.every((r) => r.ok)
          ? "Marked Sold — the eBay listing was ended too ✓"
          : `Marked Sold on the site, but the eBay listing could NOT be ended automatically — please end it on eBay.\n\n${ebayResults
              .map((r) => r.error)
              .filter(Boolean)
              .join("\n")}`
      );
    }
    const wasDraft = editingDraft;
    const savedId = editingId;
    setForm(emptyForm);
    setEditingId(null);
    setEditingDraft(false);
    publishRef.current = false;
    loadProducts();
    if (wasDraft && onBackToDrafts) onBackToDrafts(savedId ?? undefined);
  }

  function startEdit(p: AdminProduct) {
    setEditingId(p.id);
    setEditingDraft(Boolean(p.is_draft));
    setForm({
      slug: p.slug,
      name: p.name,
      price: String(p.price / 100),
      category: p.category,
      subcategory: p.subcategory ?? "",
      era: p.era ?? "",
      description: p.description,
      image: p.image ?? "",
      images: p.images ?? [],
      icon: p.icon,
      cost_price: p.cost_price ? String(p.cost_price / 100) : "",
      shipping_cost:
        p.shipping_cost != null ? String(p.shipping_cost / 100) : "",
      international_shipping_cost:
        p.international_shipping_cost != null
          ? String(p.international_shipping_cost / 100)
          : "",
      weight_grams:
        p.weight_grams != null ? String(p.weight_grams) : "",
      weightUnit: "g" as "g" | "kg",
      length_cm: p.length_cm != null ? String(p.length_cm) : "",
      width_cm: p.width_cm != null ? String(p.width_cm) : "",
      height_cm: p.height_cm != null ? String(p.height_cm) : "",
      status: p.status ?? "available",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }


  async function handleDelete(id: string) {
    if (!confirm("Delete this item?")) return;
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    loadProducts();
  }

  // Drafts (e.g. imported from eBay) live in Review drafts, not in this list or the totals.
  const live = products.filter((p) => !p.is_draft);
  const withCost = live.filter((p) => typeof p.cost_price === "number");
  const totalListed = live.reduce((sum, p) => sum + p.price, 0);
  const totalCost = withCost.reduce((sum, p) => sum + (p.cost_price ?? 0), 0);
  const totalPotentialProfit = withCost.reduce(
    (sum, p) => sum + (p.price - (p.cost_price ?? 0)),
    0
  );
  const sold = live.filter((p) => p.status === "sold" && typeof p.cost_price === "number");
  const totalRealizedProfit = sold.reduce(
    (sum, p) => sum + (p.price - (p.cost_price ?? 0)),
    0
  );

  return (
    <div>
      {igItem && (
        <InstagramPublishModal
          item={igItem}
          username={igStatus.username}
          posted={igStatus.posted[igItem.id]}
          onClose={() => setIgItem(null)}
          onPublished={(info) =>
            setIgStatus((s) => ({ ...s, posted: { ...s.posted, [igItem.id]: info } }))
          }
        />
      )}
      {igStatus.configured && igStatus.error && (
        <div className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Instagram: {igStatus.error}
        </div>
      )}
      {loadError && (
        <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <p>{loadError}</p>
          <button
            onClick={loadProducts}
            className="mt-1.5 font-medium underline"
          >
            Try again
          </button>
        </div>
      )}

      {live.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-border p-5 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted">Inventory value</p>
            <p className="mt-1 text-lg">£{(totalListed / 100).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Invested (cost)</p>
            <p className="mt-1 text-lg">£{(totalCost / 100).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Potential profit</p>
            <p className="mt-1 text-lg">
              £{(totalPotentialProfit / 100).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Realized profit (sold)</p>
            <p className="mt-1 text-lg">
              £{(totalRealizedProfit / 100).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 grid gap-4 rounded-xl border border-border p-6 sm:grid-cols-2"
      >
        <h2 className="col-span-full font-medium">
          {editingId
            ? editingDraft
              ? "Edit draft — not on the site yet"
              : "Edit item"
            : "Add a new item"}
        </h2>

        <div className="col-span-full">
          <label className="text-xs text-muted">Photo</label>
          <div className="mt-1">
            <ImageCropUpload
              value={form.images}
              onChange={(urls) => setForm((f) => ({ ...f, images: urls }))}
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted">Name</label>
          <input
            required
            value={form.name}
            onChange={(e) => {
              const name = e.target.value;
              setForm((f) => ({
                ...f,
                name,
                slug: editingId
                  ? f.slug
                  : name
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/(^-|-$)/g, ""),
              }));
            }}
            className="mt-1 w-full rounded-md border border-border-strong px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-muted">Price (£)</label>
          <input
            required
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            className="mt-1 w-full rounded-md border border-border-strong px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-muted">Category</label>
          <select
            value={form.category}
            onChange={(e) => {
              const nextCategory = e.target.value as AdminProduct["category"];
              // Reset subcategory/era whenever the category changes, since
              // the old values almost certainly don't apply to the new one.
              setForm((f) => ({
                ...f,
                category: nextCategory,
                subcategory: "",
                era: "",
              }));
            }}
            className="mt-1 w-full rounded-md border border-border-strong px-3 py-2 text-sm"
          >
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-muted">Subcategory</label>
          <select
            value={form.subcategory}
            onChange={(e) =>
              setForm((f) => ({ ...f, subcategory: e.target.value }))
            }
            className="mt-1 w-full rounded-md border border-border-strong px-3 py-2 text-sm"
          >
            <option value="">Select a subcategory…</option>
            {categories
              .find((c) => c.slug === form.category)
              ?.subcategories.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
          </select>
        </div>

        {categories.find((c) => c.slug === form.category)?.eras && (
          <div>
            <label className="text-xs text-muted">
              Era <span className="normal-case text-muted">(optional)</span>
            </label>
            <select
              value={form.era}
              onChange={(e) =>
                setForm((f) => ({ ...f, era: e.target.value }))
              }
              className="mt-1 w-full rounded-md border border-border-strong px-3 py-2 text-sm"
            >
              <option value="">Not specified</option>
              {categories
                .find((c) => c.slug === form.category)
                ?.eras?.map((era) => (
                  <option key={era} value={era}>
                    {era}
                  </option>
                ))}
            </select>
          </div>
        )}

        <div>
          <label className="text-xs text-muted">
            Cost price (£){" "}
            <span className="normal-case text-muted">
              — what you paid, kept private
            </span>
          </label>
          <input
            type="number"
            step="0.01"
            value={form.cost_price}
            onChange={(e) =>
              setForm((f) => ({ ...f, cost_price: e.target.value }))
            }
            className="mt-1 w-full rounded-md border border-border-strong px-3 py-2 text-sm"
          />
          {form.price && form.cost_price && (
            <p className="mt-1 text-xs text-muted">
              Profit: £
              {(Number(form.price) - Number(form.cost_price)).toFixed(2)} (
              {(
                ((Number(form.price) - Number(form.cost_price)) /
                  Number(form.price)) *
                100
              ).toFixed(0)}
              % margin)
            </p>
          )}
        </div>

        <div>
          <label className="text-xs text-muted">
            UK shipping cost (£){" "}
            <span className="normal-case text-muted">
              — shown to buyers, offered at checkout
            </span>
          </label>
          <div className="mt-1 flex items-center gap-3">
            <input
              type="number"
              step="0.01"
              disabled={form.shipping_cost === "0"}
              value={form.shipping_cost === "0" ? "" : form.shipping_cost}
              placeholder={form.shipping_cost === "0" ? "Free" : undefined}
              onChange={(e) =>
                setForm((f) => ({ ...f, shipping_cost: e.target.value }))
              }
              className="w-full rounded-md border border-border-strong px-3 py-2 text-sm disabled:bg-surface disabled:text-muted"
            />
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
              <input
                type="checkbox"
                checked={form.shipping_cost === "0"}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    shipping_cost: e.target.checked ? "0" : "",
                  }))
                }
              />
              Free shipping
            </label>
          </div>
        </div>

        <div>
          <label className="text-xs text-muted">
            International shipping cost (£){" "}
            <span className="normal-case text-muted">
              — optional, leave blank to only offer UK shipping
            </span>
          </label>
          <div className="mt-1 flex items-center gap-3">
            <input
              type="number"
              step="0.01"
              disabled={form.international_shipping_cost === "0"}
              value={
                form.international_shipping_cost === "0"
                  ? ""
                  : form.international_shipping_cost
              }
              placeholder={
                form.international_shipping_cost === "0" ? "Free" : undefined
              }
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  international_shipping_cost: e.target.value,
                }))
              }
              className="w-full rounded-md border border-border-strong px-3 py-2 text-sm disabled:bg-surface disabled:text-muted"
            />
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
              <input
                type="checkbox"
                checked={form.international_shipping_cost === "0"}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    international_shipping_cost: e.target.checked ? "0" : "",
                  }))
                }
              />
              Free shipping
            </label>
          </div>
        </div>

        <div>
          <label className="text-xs text-muted">
            Weight &amp; packed size
            <span className="ml-1 normal-case">
              — for Royal Mail label automation
            </span>
          </label>

          {/* Weight — full width on mobile, g/kg toggle */}
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              step={form.weightUnit === "kg" ? "0.001" : "1"}
              min="0"
              placeholder={form.weightUnit === "kg" ? "e.g. 0.25" : "e.g. 250"}
              value={form.weight_grams}
              onChange={(e) =>
                setForm((f) => ({ ...f, weight_grams: e.target.value }))
              }
              className="w-full rounded-md border border-border-strong px-3 py-2 text-sm"
            />
            <div className="flex shrink-0 overflow-hidden rounded-md border border-border-strong text-sm">
              {(["g", "kg"] as const).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, weightUnit: unit, weight_grams: "" }))
                  }
                  className={`px-2.5 py-2 transition-colors ${
                    form.weightUnit === unit
                      ? "bg-ink text-white"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>

          {/* Dimensions — 2 columns on mobile, clear labels */}
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="Length"
                value={form.length_cm}
                onChange={(e) =>
                  setForm((f) => ({ ...f, length_cm: e.target.value }))
                }
                className="w-full rounded-md border border-border-strong px-3 py-2 text-sm"
              />
              <span className="shrink-0 text-xs text-muted">cm</span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="Width"
                value={form.width_cm}
                onChange={(e) =>
                  setForm((f) => ({ ...f, width_cm: e.target.value }))
                }
                className="w-full rounded-md border border-border-strong px-3 py-2 text-sm"
              />
              <span className="shrink-0 text-xs text-muted">cm</span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="Height"
                value={form.height_cm}
                onChange={(e) =>
                  setForm((f) => ({ ...f, height_cm: e.target.value }))
                }
                className="w-full rounded-md border border-border-strong px-3 py-2 text-sm"
              />
              <span className="shrink-0 text-xs text-muted">cm</span>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs text-muted">Status</label>
          <select
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                status: e.target.value as "available" | "unavailable" | "sold",
              }))
            }
            className="mt-1 w-full rounded-md border border-border-strong px-3 py-2 text-sm"
          >
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
            <option value="sold">Sold</option>
          </select>
        </div>

        <div className="col-span-full">
          <label className="text-xs text-muted">Description</label>
          <textarea
            required
            rows={3}
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            className="mt-1 max-h-32 w-full resize-none overflow-y-auto rounded-md border border-border-strong px-3 py-2 text-sm"
          />
        </div>

        <div className="col-span-full flex gap-3">
          <button
            type="submit"
            disabled={saving}
            onClick={() => (publishRef.current = false)}
            className="rounded-md bg-ink px-5 py-2 text-sm text-white disabled:opacity-50"
          >
            {saving
              ? "Saving…"
              : editingId
              ? editingDraft
                ? "Save draft"
                : "Save changes"
              : "Add item"}
          </button>
          {editingDraft && (
            <button
              type="submit"
              disabled={saving}
              onClick={() => (publishRef.current = true)}
              className="rounded-md border border-ink px-5 py-2 text-sm text-ink hover:bg-ink hover:text-white disabled:opacity-50"
            >
              Save &amp; publish
            </button>
          )}
          {editingId && (
            <button
              type="button"
              onClick={() => {
                const wasDraft = editingDraft;
                const backId = editingId;
                setEditingId(null);
                setEditingDraft(false);
                setForm(emptyForm);
                if (wasDraft && onBackToDrafts) onBackToDrafts(backId ?? undefined);
              }}
              className="text-sm text-muted"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Category tabs + search — makes it easy to find one item among many */}
      <div className="mt-10 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterCategory("all")}
          className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
            filterCategory === "all"
              ? "border-ink text-ink"
              : "border-border-strong text-muted hover:text-ink"
          }`}
        >
          All ({live.length})
        </button>
        {categories.map((c) => {
          const count = live.filter((p) => p.category === c.slug).length;
          return (
            <button
              key={c.slug}
              onClick={() => setFilterCategory(c.slug)}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                filterCategory === c.slug
                  ? "border-ink text-ink"
                  : "border-border-strong text-muted hover:text-ink"
              }`}
            >
              {c.name} ({count})
            </button>
          );
        })}
      </div>
      <input
        type="text"
        placeholder="Search by name…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="mt-3 w-full max-w-sm rounded-md border border-border-strong px-3 py-2 text-sm"
      />

      <div className="mt-4 space-y-3">
        {live
          .filter(
            (p) => filterCategory === "all" || p.category === filterCategory
          )
          .filter((p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-4 rounded-lg border border-border p-3"
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md">
              {(p.images && p.images.length > 0) || p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.images && p.images.length > 0 ? p.images[0] : p.image}
                  alt=""
                  className="h-14 w-14 object-cover"
                />
              ) : (
                <div className="h-14 w-14 bg-surface" />
              )}
              {p.is_draft ? (
                <div className="absolute bottom-0 left-0 right-0 bg-slate-500 py-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-white">
                  Draft
                </div>
              ) : (p.status === "sold" || p.status === "unavailable") && (
                <div
                  className={`absolute bottom-0 left-0 right-0 py-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-white ${
                    p.status === "sold" ? "bg-red-600" : "bg-[#AD8A4E]"
                  }`}
                >
                  {p.status === "sold" ? "Sold" : "N/A"}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm">
                {p.name}
              </p>
              <p className="text-xs text-muted">
                £{(p.price / 100).toFixed(2)} · {p.category}
                {typeof p.cost_price === "number" && (
                  <>
                    {" "}
                    · profit £{((p.price - p.cost_price) / 100).toFixed(2)} (
                    {(((p.price - p.cost_price) / p.price) * 100).toFixed(0)}%)
                  </>
                )}
              </p>
            </div>
            {igStatus.configured &&
              ((p.images && p.images.length > 0) || p.image) &&
              p.status !== "sold" &&
              !p.is_draft && (
                <button
                  onClick={() => setIgItem(p)}
                  title={
                    igStatus.posted[p.id]
                      ? "Already on Instagram — click to post again"
                      : "Post to Instagram"
                  }
                  className={`shrink-0 rounded-md px-2.5 py-2 text-sm ${
                    igStatus.posted[p.id] ? "text-green-700" : "text-[#AD8A4E] hover:text-ink"
                  }`}
                >
                  {igStatus.posted[p.id] ? "IG ✓" : "Instagram"}
                </button>
              )}
            <button
              onClick={() => startEdit(p)}
              className="shrink-0 rounded-md px-2.5 py-2 text-sm text-muted hover:text-ink"
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(p.id)}
              className="shrink-0 rounded-md px-2.5 py-2 text-sm text-red-600"
            >
              Delete
            </button>
          </div>
        ))}
        {live.length === 0 && !loadError && (
          <p className="text-sm text-muted">
            No items yet — add your first one above.
          </p>
        )}
        {live.length > 0 &&
          live.filter(
            (p) => filterCategory === "all" || p.category === filterCategory
          ).filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .length === 0 && (
            <p className="text-sm text-muted">
              No items match this filter or search.
            </p>
          )}
      </div>
    </div>
  );
}
