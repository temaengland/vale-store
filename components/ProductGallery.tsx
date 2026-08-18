"use client";

import { useState } from "react";
import { ProductImage, IconName } from "@/components/ItemIllustration";

export default function ProductGallery({
  images,
  legacyImage,
  icon,
  alt,
}: {
  images?: string[] | null;
  legacyImage?: string | null;
  icon: IconName;
  alt: string;
}) {
  const photos = images && images.length > 0 ? images : legacyImage ? [legacyImage] : [];
  const [active, setActive] = useState(0);

  if (photos.length === 0) {
    return (
      <ProductImage
        icon={icon}
        alt={alt}
        className="aspect-square w-full rounded-xl"
      />
    );
  }

  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photos[active]}
        alt={alt}
        className="aspect-square w-full rounded-xl object-cover"
      />
      {photos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {photos.map((src, i) => (
            <button
              key={src}
              onClick={() => setActive(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                i === active ? "border-ink" : "border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
