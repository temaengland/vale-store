"use client";

import { useEffect, useRef, useState } from "react";
import ReactCrop, {
  Crop,
  PixelCrop,
  centerCrop,
  makeAspectCrop,
  convertToPixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { cropToBlob, rotateImage90 } from "@/lib/cropImage";

type PendingPhoto = {
  id: string;
  url: string;
};

function centeredSquareCrop(width: number, height: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, 1, width, height),
    width,
    height
  );
}

// Small inline icons — kept dependency-free rather than pulling in an icon
// library just for a few glyphs.
function RotateLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a7 7 0 0 1 0 14h-1" />
    </svg>
  );
}
function RotateRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 14l5-5-5-5" />
      <path d="M20 9H10a7 7 0 0 0 0 14h1" />
    </svg>
  );
}
function CropIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2v14a2 2 0 0 0 2 2h14" />
      <path d="M18 22V8a2 2 0 0 0-2-2H2" />
    </svg>
  );
}
function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function ToolbarButton({
  onClick,
  active,
  icon,
  label,
}: {
  onClick: () => void;
  active?: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-[64px] flex-col items-center gap-1 rounded-md px-3 py-2 text-xs transition-colors ${
        active ? "bg-white/15 text-white" : "text-white/80 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export default function ImageCropUpload({
  value,
  onChange,
}: {
  value?: string[];
  onChange: (urls: string[]) => void;
}) {
  const photos = value ?? [];
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [cropMode, setCropMode] = useState(false);
  const [crop, setCrop] = useState<Crop>();
  const [pixelCrop, setPixelCrop] = useState<PixelCrop>();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const imgRef = useRef<HTMLImageElement>(null);

  function removePhoto(index: number) {
    onChange(photos.filter((_, i) => i !== index));
  }

  function movePhoto(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  // Handles selecting one or many photos at once (up to 10) — they're
  // queued as thumbnails first; nothing uploads until each one is confirmed.
  function handleFilesSelect(files: FileList) {
    setError("");
    const list = Array.from(files).slice(0, 10);
    const tooBig = list.find((f) => f.size > 25 * 1024 * 1024);
    if (tooBig) {
      setError(
        `"${tooBig.name}" is quite large (over 25MB) — try a smaller photo, or take a new one at a lower resolution.`
      );
    }
    const usable = list.filter((f) => f.size <= 25 * 1024 * 1024);
    const newPending = usable.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url: URL.createObjectURL(file),
    }));
    setPending((p) => [...p, ...newPending]);
  }

  function openEditor(index: number) {
    setError("");
    setEditIndex(index);
    setCropMode(false);
    setCrop(undefined);
    setPixelCrop(undefined);
  }

  // Keep rawImage in sync with whichever pending photo is being edited —
  // this is what makes the ‹ › navigation work without closing the modal.
  useEffect(() => {
    if (editIndex !== null && pending[editIndex]) {
      setRawImage(pending[editIndex].url);
    } else if (editIndex !== null) {
      // The photo at this index was removed (e.g. just uploaded) — close.
      setEditIndex(null);
      setRawImage(null);
    }
  }, [editIndex, pending]);

  function removePending(id: string) {
    setPending((p) => p.filter((item) => item.id !== id));
  }

  function enableCrop() {
    if (!imgRef.current) return;
    const { width, height } = imgRef.current;
    setCropMode(true);
    setCrop(centeredSquareCrop(width, height));
    setPixelCrop(convertToPixelCrop(centeredSquareCrop(width, height), width, height));
  }

  async function rotate(direction: 1 | -1) {
    if (!imgRef.current || !rawImage || editIndex === null) return;
    try {
      const newUrl = await rotateImage90(imgRef.current, direction);
      setPending((p) =>
        p.map((item, i) => (i === editIndex ? { ...item, url: newUrl } : item))
      );
      setCropMode(false);
      setCrop(undefined);
      setPixelCrop(undefined);
    } catch {
      setError("Couldn't rotate that image — try a different photo.");
    }
  }

  function goToPending(index: number) {
    if (index < 0 || index >= pending.length) return;
    openEditor(index);
  }

  async function confirmPhoto() {
    setError("");
    if (!imgRef.current || editIndex === null) return;

    const useCrop = cropMode && pixelCrop && pixelCrop.width >= 5;
    setUploading(true);

    let blob: Blob;
    try {
      blob = useCrop
        ? await cropToBlob(imgRef.current, pixelCrop!)
        : await cropToBlob(imgRef.current, {
            x: 0,
            y: 0,
            width: imgRef.current.width,
            height: imgRef.current.height,
          });
    } catch (e) {
      setError(
        `Couldn't process that photo (${
          e instanceof Error ? e.message : "unknown error"
        }). Try a different photo.`
      );
      setUploading(false);
      return;
    }

    try {
      const fd = new FormData();
      fd.append("file", blob, "photo.jpg");
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const text = await res.text();
        let message = text;
        try {
          message = JSON.parse(text).error ?? text;
        } catch {
          /* not JSON — use raw text */
        }
        setError(`Upload failed (${res.status}): ${message || "no details returned"}`);
        return;
      }
      const data = await res.json();
      onChange([...photos, data.url]);
      const finishedId = pending[editIndex].id;
      const remaining = pending.filter((item) => item.id !== finishedId);
      setPending(remaining);
      // Move on to the next pending photo automatically, like eBay's ‹ ›
      // flow — or close if that was the last one.
      if (remaining.length > 0) {
        setEditIndex(Math.min(editIndex, remaining.length - 1));
        setCropMode(false);
        setCrop(undefined);
        setPixelCrop(undefined);
      } else {
        setEditIndex(null);
        setRawImage(null);
      }
    } catch (e) {
      setError(
        `Network request failed (${
          e instanceof Error ? e.message : "unknown error"
        }). Check your connection and try again.`
      );
    } finally {
      setUploading(false);
    }
  }

  function closeEditor() {
    setEditIndex(null);
    setRawImage(null);
    setError("");
  }

  return (
    <div>
      {photos.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-xs text-muted">Added photos</p>
          <div className="flex flex-wrap gap-3">
            {photos.map((src, i) => (
              <div key={src} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  className="h-20 w-20 rounded-md border border-border bg-surface object-contain"
                />
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                    Cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  aria-label="Remove photo"
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-border-strong bg-white text-xs text-ink shadow"
                >
                  ✕
                </button>
                <div className="mt-1 flex justify-center gap-1">
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => movePhoto(i, -1)}
                      aria-label="Move left"
                      className="text-xs text-muted hover:text-ink"
                    >
                      ←
                    </button>
                  )}
                  {i < photos.length - 1 && (
                    <button
                      type="button"
                      onClick={() => movePhoto(i, 1)}
                      aria-label="Move right"
                      className="text-xs text-muted hover:text-ink"
                    >
                      →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-xs text-muted">
            Waiting — tap one to review and add it
          </p>
          <div className="flex flex-wrap gap-3">
            {pending.map((item, i) => (
              <div key={item.id} className="relative">
                <button
                  type="button"
                  onClick={() => openEditor(i)}
                  className="block h-20 w-20 overflow-hidden rounded-md border-2 border-dashed border-border-strong bg-surface"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt="" className="h-full w-full object-contain opacity-80" />
                </button>
                <button
                  type="button"
                  onClick={() => removePending(item.id)}
                  aria-label="Remove"
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-border-strong bg-white text-xs text-ink shadow"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFilesSelect(e.target.files);
          }
          e.target.value = ""; // allow selecting the same file(s) again
        }}
        className="text-sm"
      />
      <p className="mt-1 text-xs text-muted">
        Select up to 10 photos at once. Each one is used exactly as shown —
        crop is optional, only if you want to trim it.
      </p>

      {error && editIndex === null && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {rawImage && editIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl shadow-xl"
            style={{ background: "#1f1c19" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <button
                type="button"
                onClick={closeEditor}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
              <p className="text-sm font-medium text-white">
                Edit photo
                {pending.length > 1 ? ` (${editIndex + 1}/${pending.length})` : ""}
              </p>
              <div className="w-8" />
            </div>

            {error && (
              <p className="mx-4 mt-3 rounded-md bg-red-500/15 px-3 py-2 text-xs text-red-200">
                {error}
              </p>
            )}

            {/* Image canvas with prev/next like eBay's editor */}
            <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
              {pending.length > 1 && editIndex > 0 && (
                <button
                  type="button"
                  onClick={() => goToPending(editIndex - 1)}
                  aria-label="Previous photo"
                  className="absolute left-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink shadow"
                >
                  <ChevronLeftIcon />
                </button>
              )}

              <div
                className="crop-viewport flex items-center justify-center"
                style={{ maxHeight: "50vh" }}
              >
                {cropMode ? (
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setPixelCrop(c)}
                    aspect={1}
                    minWidth={40}
                    minHeight={40}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={imgRef}
                      src={rawImage}
                      alt=""
                      style={{
                        maxHeight: "50vh",
                        maxWidth: "100%",
                        width: "auto",
                        height: "auto",
                        display: "block",
                      }}
                    />
                  </ReactCrop>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    ref={imgRef}
                    src={rawImage}
                    alt=""
                    style={{
                      maxHeight: "50vh",
                      maxWidth: "100%",
                      width: "auto",
                      height: "auto",
                      display: "block",
                    }}
                  />
                )}
              </div>

              {pending.length > 1 && editIndex < pending.length - 1 && (
                <button
                  type="button"
                  onClick={() => goToPending(editIndex + 1)}
                  aria-label="Next photo"
                  className="absolute right-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink shadow"
                >
                  <ChevronRightIcon />
                </button>
              )}
            </div>

            <p className="px-4 pb-1 text-center text-xs text-white/50">
              {cropMode
                ? "Drag the corners to resize, drag inside to move."
                : "Shown exactly as it will appear on the site. Tap Crop to trim it."}
            </p>

            {/* Icon toolbar */}
            <div className="flex items-center justify-center gap-1 border-t border-white/10 px-2 py-2">
              <ToolbarButton
                onClick={() => rotate(-1)}
                icon={<RotateLeftIcon />}
                label="Rotate"
              />
              <ToolbarButton
                onClick={() => rotate(1)}
                icon={<RotateRightIcon />}
                label="Rotate"
              />
              <ToolbarButton
                onClick={enableCrop}
                active={cropMode}
                icon={<CropIcon />}
                label="Crop"
              />
            </div>

            {/* Footer actions */}
            <div className="flex gap-2 border-t border-white/10 p-4">
              <button
                type="button"
                onClick={closeEditor}
                className="flex-1 rounded-full border border-white/20 py-2.5 text-sm text-white/80 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPhoto}
                disabled={uploading}
                className="flex-1 rounded-full bg-white py-2.5 text-sm font-medium text-black disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Done"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
