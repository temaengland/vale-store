"use client";

import { useCallback, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { getCroppedImageBlob } from "@/lib/cropImage";

export default function ImageCropUpload({
  value,
  onChange,
}: {
  value?: string;
  onChange: (url: string) => void;
}) {
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(
    null
  );
  const [uploading, setUploading] = useState(false);

  function handleFileSelect(file: File) {
    const url = URL.createObjectURL(file);
    setRawImage(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function confirmCrop() {
    if (!rawImage || !croppedAreaPixels) return;
    setUploading(true);
    try {
      const blob = await getCroppedImageBlob(rawImage, croppedAreaPixels);
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
            Drag to reposition, use the slider to zoom — the square shows
            exactly what will be used.
          </p>
          <div className="relative h-72 w-full overflow-hidden rounded-md bg-surface">
            <Cropper
              image={rawImage}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="mt-3 w-full"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={confirmCrop}
              disabled={uploading}
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
