"use client";

import { useRef, useState } from "react";
import ReactCrop, {
  Crop,
  PixelCrop,
  centerCrop,
  makeAspectCrop,
  convertToPixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { cropToBlob, rotateImage90 } from "@/lib/cropImage";

function centeredSquareCrop(width: number, height: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, 1, width, height),
    width,
    height
  );
}

function centeredFreeCrop(): Crop {
  return { unit: "%", width: 90, height: 90, x: 5, y: 5 };
}

// Small inline icons — kept dependency-free rather than pulling in an icon
// library just for four glyphs.
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
function AspectIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="10" height="10" rx="1" />
      <rect x="10" y="10" width="10" height="10" rx="1" />
    </svg>
  );
}
function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
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
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [pixelCrop, setPixelCrop] = useState<PixelCrop>();
  const [lockSquare, setLockSquare] = useState(true);
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

  function applyCrop(nextCrop: Crop, width: number, height: number) {
    setCrop(nextCrop);
    setPixelCrop(convertToPixelCrop(nextCrop, width, height));
  }

  function handleFileSelect(file: File) {
    setError("");
    if (file.size > 25 * 1024 * 1024) {
      setError(
        "That photo is quite large (over 25MB) — try a smaller photo, or take a new one at a lower resolution."
      );
      return;
    }
    const url = URL.createObjectURL(file);
    setRawImage(url);
    setCrop(undefined);
    setPixelCrop(undefined);
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    applyCrop(
      lockSquare ? centeredSquareCrop(width, height) : centeredFreeCrop(),
      width,
      height
    );
  }

  async function rotate(direction: 1 | -1) {
    if (!imgRef.current || !rawImage) return;
    try {
      const newUrl = await rotateImage90(imgRef.current, direction);
      setRawImage(newUrl);
      setCrop(undefined);
      setPixelCrop(undefined);
    } catch {
      setError("Couldn't rotate that image — try a different photo.");
    }
  }

  function toggleAspect() {
    const next = !lockSquare;
    setLockSquare(next);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      applyCrop(
        next ? centeredSquareCrop(width, height) : centeredFreeCrop(),
        width,
        height
      );
    }
  }

  function resetCrop() {
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      applyCrop(
        lockSquare ? centeredSquareCrop(width, height) : centeredFreeCrop(),
        width,
        height
      );
    }
  }

  async function confirmCrop() {
    setError("");
    if (!imgRef.current || !pixelCrop || pixelCrop.width < 5) {
      setError(
        "No crop area selected yet — drag the frame over the part of the photo you want, then try again."
      );
      return;
    }
    setUploading(true);

    let blob: Blob;
    try {
      blob = await cropToBlob(imgRef.current, pixelCrop);
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
      setRawImage(null);
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

  function cancelCrop() {
    setRawImage(null);
    setError("");
  }

  return (
    <div>
      {photos.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-3">
          {photos.map((src, i) => (
            <div key={src} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className="h-20 w-20 rounded-md border border-border object-cover"
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
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs text-ink shadow border border-border-strong"
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
      )}

      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFileSelect(f);
          e.target.value = ""; // allow selecting the same file again
        }}
        className="text-sm"
      />
      <p className="mt-1 text-xs text-muted">
        {photos.length === 0
          ? "Add a photo — you can add more than one."
          : "Add another photo, or reorder/remove the ones above. The first photo is the cover shown on the site."}
      </p>

      {error && !rawImage && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {rawImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl shadow-xl"
            style={{ background: "#1f1c19" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <button
                type="button"
                onClick={cancelCrop}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
              <p className="text-sm font-medium text-white">Edit photo</p>
              <div className="w-8" />
            </div>

            {error && (
              <p className="mx-4 mt-3 rounded-md bg-red-500/15 px-3 py-2 text-xs text-red-200">
                {error}
              </p>
            )}

            {/* Image canvas */}
            <div className="flex flex-1 items-center justify-center overflow-hidden p-4">
              <div
                className="crop-viewport flex items-center justify-center"
                style={{ maxHeight: "50vh" }}
              >
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setPixelCrop(c)}
                  aspect={lockSquare ? 1 : undefined}
                  minWidth={40}
                  minHeight={40}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imgRef}
                    src={rawImage}
                    alt=""
                    onLoad={onImageLoad}
                    style={{
                      maxHeight: "50vh",
                      maxWidth: "100%",
                      width: "auto",
                      height: "auto",
                      display: "block",
                    }}
                  />
                </ReactCrop>
              </div>
            </div>

            <p className="px-4 pb-1 text-center text-xs text-white/50">
              Drag the corners to resize, drag inside to move — only what's
              inside the frame will be used.
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
                onClick={toggleAspect}
                active={!lockSquare}
                icon={<AspectIcon />}
                label={lockSquare ? "Square" : "Free"}
              />
              <ToolbarButton
                onClick={resetCrop}
                icon={<ResetIcon />}
                label="Reset"
              />
            </div>

            {/* Footer actions */}
            <div className="flex gap-2 border-t border-white/10 p-4">
              <button
                type="button"
                onClick={cancelCrop}
                className="flex-1 rounded-full border border-white/20 py-2.5 text-sm text-white/80 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmCrop}
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
