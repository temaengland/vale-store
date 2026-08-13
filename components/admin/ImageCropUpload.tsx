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

export default function ImageCropUpload({
  value,
  onChange,
}: {
  value?: string;
  onChange: (url: string) => void;
}) {
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [pixelCrop, setPixelCrop] = useState<PixelCrop>();
  const [lockSquare, setLockSquare] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const imgRef = useRef<HTMLImageElement>(null);

  function applyCrop(nextCrop: Crop, width: number, height: number) {
    setCrop(nextCrop);
    // Compute the pixel crop immediately too — ReactCrop only fires its own
    // onComplete after the user drags the frame, so without this, tapping
    // "Use this crop" without first touching the frame would silently do
    // nothing (the button stays effectively disabled).
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
      onChange(data.url);
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
      <div className="flex items-center gap-4">
        {value && !rawImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className="h-20 w-20 rounded-md object-cover"
          />
        )}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileSelect(f);
          }}
          className="text-sm"
        />
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {rawImage && (
        <div className="mt-4 rounded-lg border border-border p-4">
          <p className="mb-2 text-xs text-muted">
            Drag the corners to resize the frame, drag inside to move it —
            only what's inside the frame will be used.
          </p>

          <div
            className="crop-viewport mx-auto flex w-fit items-center justify-center rounded-md bg-surface p-2"
            style={{ maxHeight: "34vh", overflow: "hidden" }}
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
                  maxHeight: "38vh",
                  maxWidth: "100%",
                  width: "auto",
                  height: "auto",
                  display: "block",
                }}
              />
            </ReactCrop>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => rotate(-1)}
              className="min-h-[42px] rounded-md border border-border-strong px-4 py-2 text-sm text-muted hover:text-ink"
            >
              ⟲ Rotate left
            </button>
            <button
              type="button"
              onClick={() => rotate(1)}
              className="min-h-[42px] rounded-md border border-border-strong px-4 py-2 text-sm text-muted hover:text-ink"
            >
              ⟳ Rotate right
            </button>
            <button
              type="button"
              onClick={toggleAspect}
              className="min-h-[42px] rounded-md border border-border-strong px-4 py-2 text-sm text-muted hover:text-ink"
            >
              {lockSquare ? "Unlock free crop" : "Lock to square"}
            </button>
            <button
              type="button"
              onClick={resetCrop}
              className="min-h-[42px] rounded-md border border-border-strong px-4 py-2 text-sm text-muted hover:text-ink"
            >
              Reset frame
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={confirmCrop}
              disabled={uploading}
              className="min-h-[44px] rounded-md bg-ink px-5 py-2 text-sm text-white disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Use this crop"}
            </button>
            <button
              type="button"
              onClick={cancelCrop}
              className="min-h-[44px] rounded-md border border-border-strong px-5 py-2 text-sm text-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
