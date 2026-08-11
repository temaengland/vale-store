"use client";

import { useRef, useState } from "react";
import ReactCrop, {
  Crop,
  PixelCrop,
  centerCrop,
  makeAspectCrop,
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
  const imgRef = useRef<HTMLImageElement>(null);

  function handleFileSelect(file: File) {
    const url = URL.createObjectURL(file);
    setRawImage(url);
    setCrop(undefined);
    setPixelCrop(undefined);
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(
      lockSquare
        ? centeredSquareCrop(width, height)
        : centerCrop(
            { unit: "%", width: 90, height: 90, x: 5, y: 5 },
            width,
            height
          )
    );
  }

  async function rotate(direction: 1 | -1) {
    if (!imgRef.current || !rawImage) return;
    const newUrl = await rotateImage90(imgRef.current, direction);
    setRawImage(newUrl);
    setCrop(undefined);
    setPixelCrop(undefined);
  }

  function toggleAspect() {
    const next = !lockSquare;
    setLockSquare(next);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(
        next
          ? centeredSquareCrop(width, height)
          : centerCrop(
              { unit: "%", width: 90, height: 90, x: 5, y: 5 },
              width,
              height
            )
      );
    }
  }

  function resetCrop() {
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(
        lockSquare
          ? centeredSquareCrop(width, height)
          : centerCrop(
              { unit: "%", width: 90, height: 90, x: 5, y: 5 },
              width,
              height
            )
      );
    }
  }

  async function confirmCrop() {
    if (!imgRef.current || !pixelCrop) return;
    setUploading(true);
    try {
      const blob = await cropToBlob(imgRef.current, pixelCrop);
      const fd = new FormData();
      fd.append("file", blob, "photo.jpg");
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        alert("Upload failed. Check the console / server logs.");
        return;
      }
      const data = await res.json();
      onChange(data.url);
      setRawImage(null);
    } finally {
      setUploading(false);
    }
  }

  function cancelCrop() {
    setRawImage(null);
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

      {rawImage && (
        <div className="mt-4 rounded-lg border border-border p-4">
          <p className="mb-2 text-xs text-muted">
            Drag the corners to resize the frame, drag inside to move it —
            only what's inside the frame will be used.
          </p>

          <div className="max-h-[420px] overflow-auto rounded-md bg-surface">
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
                className="max-w-full"
              />
            </ReactCrop>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => rotate(-1)}
              className="rounded-md border border-border-strong px-3 py-1.5 text-xs text-muted hover:text-ink"
            >
              ⟲ Rotate left
            </button>
            <button
              type="button"
              onClick={() => rotate(1)}
              className="rounded-md border border-border-strong px-3 py-1.5 text-xs text-muted hover:text-ink"
            >
              ⟳ Rotate right
            </button>
            <button
              type="button"
              onClick={toggleAspect}
              className="rounded-md border border-border-strong px-3 py-1.5 text-xs text-muted hover:text-ink"
            >
              {lockSquare ? "Unlock free crop" : "Lock to square"}
            </button>
            <button
              type="button"
              onClick={resetCrop}
              className="rounded-md border border-border-strong px-3 py-1.5 text-xs text-muted hover:text-ink"
            >
              Reset frame
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={confirmCrop}
              disabled={uploading || !pixelCrop}
              className="rounded-md bg-ink px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Use this crop"}
            </button>
            <button
              type="button"
              onClick={cancelCrop}
              className="rounded-md border border-border-strong px-4 py-2 text-sm text-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
