"use client";

import { useEffect, useRef, useState } from "react";
import { trackPixel } from "@/components/MetaPixel";

// Update 171: lead form for /before-clearance.
// 1) photos are shrunk in the browser (so they fit Vercel's upload limit),
// 2) the lead is saved on our server (Admin → Enquiries),
// 3) a copy is emailed to the shop through FormSubmit (no account or key needed —
//    the very first submission sends an "Activate" email to the shop inbox).
const LEAD_EMAIL = "charmchaseuk@gmail.com";
const MAX_PHOTOS = 6;

async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error("photo"))), "image/jpeg", 0.8)
    );
  } catch {
    return file; // the server will skip anything too large
  }
}

const field =
  "mt-1 w-full rounded-md border border-border-strong bg-white px-3 py-2.5 text-sm outline-none focus:border-ink";
const label = "block text-sm font-medium text-ink";

export default function ClearanceLeadForm() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const thanksRef = useRef<HTMLDivElement>(null);

  // Update 173: on phones the form is long, so after sending, bring the
  // "Thank you" message into view (otherwise it sits above the screen).
  useEffect(() => {
    if (done) thanksRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [done]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const data = new FormData(form);
    data.delete("photos");
    setBusy(true);
    try {
      for (const f of files.slice(0, MAX_PHOTOS)) data.append("photos", await shrink(f), "photo.jpg");
      const res = await fetch("/api/clearance-lead", { method: "POST", body: data });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || "Something went wrong. Please try again or call us.");

      // Email copy to the shop — if it fails the lead is still saved in the admin.
      const get = (k: string) => String(data.get(k) || "");
      fetch(`https://formsubmit.co/ajax/${LEAD_EMAIL}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: `New house clearance lead — ${get("location")}`,
          _template: "table",
          _captcha: "false",
          Name: get("name"),
          Phone: get("phone"),
          Email: get("email") || "—",
          "Town / postcode": get("location"),
          Situation: get("situation") || "—",
          "Needs clearing": get("when") || "—",
          "Best way to contact": get("contact") || "—",
          "What they have": get("items"),
          Photos: (out.photos || []).join("\n") || "none",
          _replyto: get("email") || undefined,
        }),
      }).catch(() => {});

      // Update 176: tell Meta Pixel a lead came in, so adverts can optimise for enquiries.
      trackPixel("Lead", { content_name: "Before clearance visit" });
      setDone(true);
      form.reset();
      setFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div
        ref={thanksRef}
        role="status"
        aria-live="polite"
        className="scroll-mt-24 rounded-xl border-2 border-[#2e7d32] bg-[#f1f8f1] p-6 text-center sm:text-left"
      >
        <p className="flex items-center justify-center gap-3 font-serif text-2xl text-ink sm:justify-start">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2e7d32] text-xl text-white">✓</span>
          Sent — thank you!
        </p>
        <p className="mt-3 text-sm font-medium text-ink">We&apos;ve received your details.</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          We&apos;ll be in touch shortly, usually the same day, to arrange a convenient time to come and have a look.
          If it&apos;s urgent, call or WhatsApp us on{" "}
          <a href="tel:+447918527790" className="text-ink underline">
            07918 527790
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-surface p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          Your name *
          <input name="name" required autoComplete="name" className={field} />
        </label>
        <label className={label}>
          Phone *
          <input name="phone" required type="tel" autoComplete="tel" className={field} />
        </label>
        <label className={label}>
          Email
          <input name="email" type="email" autoComplete="email" className={field} />
        </label>
        <label className={label}>
          Town or postcode of the property *
          <input name="location" required autoComplete="postal-code" className={field} placeholder="e.g. Evesham WR11" />
        </label>
        <label className={label}>
          Situation
          <select name="situation" className={field} defaultValue="">
            <option value="">Choose…</option>
            <option>Probate / late relative&apos;s home</option>
            <option>Downsizing or moving</option>
            <option>Moving into care</option>
            <option>Landlord / empty property</option>
            <option>Just a few items to sell</option>
            <option>Other</option>
          </select>
        </label>
        <label className={label}>
          When does it need clearing?
          <select name="when" className={field} defaultValue="">
            <option value="">Choose…</option>
            <option>As soon as possible</option>
            <option>Within 2 weeks</option>
            <option>Within a month</option>
            <option>No rush</option>
          </select>
        </label>
      </div>

      <label className={label}>
        What&apos;s in the house? *
        <textarea
          name="items"
          required
          rows={4}
          className={field}
          placeholder="e.g. Victorian furniture, a box of old jewellery, silver cutlery, clocks, paintings, china… Anything you're unsure about, just mention it."
        />
      </label>

      <div>
        <p className={label}>Photos (optional, up to {MAX_PHOTOS})</p>
        <input
          name="photos"
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, MAX_PHOTOS))}
          className="mt-1 block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:text-white"
        />
        {files.length > 0 && <p className="mt-1 text-xs text-muted">{files.length} photo(s) selected</p>}
      </div>

      <fieldset>
        <legend className={label}>Best way to contact you</legend>
        <div className="mt-1 flex flex-wrap gap-4 text-sm text-muted">
          {["Phone call", "WhatsApp", "Email"].map((c, i) => (
            <label key={c} className="flex items-center gap-2">
              <input type="radio" name="contact" value={c} defaultChecked={i === 0} /> {c}
            </label>
          ))}
        </div>
      </fieldset>

      {/* honeypot — hidden from people, bots fill it in */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <label className="flex items-start gap-2 text-xs leading-relaxed text-muted">
        <input type="checkbox" required className="mt-0.5" />
        <span>
          I&apos;m happy for CharmChase to contact me about this enquiry. We never share your details. See our{" "}
          <a href="/privacy" className="underline">
            privacy policy
          </a>
          .
        </span>
      </label>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-ink px-6 py-3 text-sm font-medium text-white disabled:opacity-60 sm:w-auto"
      >
        {busy ? "Sending…" : "Request a free visit"}
      </button>
    </form>
  );
}
