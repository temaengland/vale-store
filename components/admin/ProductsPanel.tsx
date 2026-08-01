"use client";

import { useEffect, useState } from "react";

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
  icon: string;
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
  icon: "generic",
};

export default function ProductsPanel() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  async function loadProducts() {
    const res = await fetch("/api/admin/products");
    if (!res.ok) {
      setLoadError(
        "Couldn't load products. Check that Supabase env vars are set."
      );
      return;
    }
    const data = await res.json();
    setProducts(data.products ?? []);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function handleUpload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    setUploading(false);
    if (!res.ok) {
      alert("Upload failed. Check the console / server logs.");
      return;
    }
    const data = await res.json();
    setForm((f) => ({ ...f, image: data.url }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, price: Math.round(Number(form.price) * 100) };
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
    setForm(emptyForm);
    setEditingId(null);
    loadProducts();
  }

  function startEdit(p: AdminProduct) {
    setEditingId(p.id);
    setForm({
      slug: p.slug,
      name: p.name,
      price: String(p.price / 100),
      category: p.category,
      subcategory: p.subcategory ?? "",
      era: p.era ?? "",
      description: p.description,
      image: p.image ?? "",
      icon: p.icon,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this item?")) return;
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    loadProducts();
  }

  return (
    <div>
      {loadError && <p className="mt-4 text-sm text-red-600">{loadError}</p>}

      <form
        onSubmit={handleSubmit}
        className="mt-6 grid gap-4 rounded-xl border border-border p-6 sm:grid-cols-2"
      >
        <h2 className="col-span-full font-medium">
          {editingId ? "Edit item" : "Add a new item"}
        </h2>

        <div className="col-span-full">
          <label className="text-xs text-muted">Photo</label>
          <div className="mt-1 flex items-center gap-4">
            {form.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.image}
                alt=""
                className="h-20 w-20 rounded-md object-cover"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
              }}
              className="text-sm"
            />
            {uploading && (
              <span className="text-xs text-muted">Uploading…</span>
            )}
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
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                category: e.target.value as AdminProduct["category"],
              }))
            }
            className="mt-1 w-full rounded-md border border-border-strong px-3 py-2 text-sm"
          >
            <option value="furniture">Furniture</option>
            <option value="jewelry">Jewelry</option>
            <option value="decor">Decor</option>
            <option value="art">Art</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-muted">Subcategory</label>
          <input
            value={form.subcategory}
            onChange={(e) =>
              setForm((f) => ({ ...f, subcategory: e.target.value }))
            }
            className="mt-1 w-full rounded-md border border-border-strong px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-muted">
            Era <span className="normal-case text-muted">(optional, e.g. Victorian)</span>
          </label>
          <input
            value={form.era}
            onChange={(e) => setForm((f) => ({ ...f, era: e.target.value }))}
            className="mt-1 w-full rounded-md border border-border-strong px-3 py-2 text-sm"
          />
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
            className="mt-1 w-full rounded-md border border-border-strong px-3 py-2 text-sm"
          />
        </div>

        <div className="col-span-full flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-ink px-5 py-2 text-sm text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : editingId ? "Save changes" : "Add item"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
              className="text-sm text-muted"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="mt-10 space-y-3">
        {products.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-4 rounded-lg border border-border p-3"
          >
            {p.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.image}
                alt=""
                className="h-14 w-14 rounded-md object-cover"
              />
            ) : (
              <div className="h-14 w-14 rounded-md bg-surface" />
            )}
            <div className="flex-1">
              <p className="text-sm">{p.name}</p>
              <p className="text-xs text-muted">
                £{(p.price / 100).toFixed(2)} · {p.category}
              </p>
            </div>
            <button
              onClick={() => startEdit(p)}
              className="text-sm text-muted hover:text-ink"
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(p.id)}
              className="text-sm text-red-600"
            >
              Delete
            </button>
          </div>
        ))}
        {products.length === 0 && !loadError && (
          <p className="text-sm text-muted">
            No items yet — add your first one above.
          </p>
        )}
      </div>
    </div>
  );
}
