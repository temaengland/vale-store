"use client";

import { useEffect, useRef, useState } from "react";
import { ProductImage, IconName } from "@/components/ItemIllustration";

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
function ZoomIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
      <path d="M11 8v6M8 11h6" />
    </svg>
  );
}

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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  function goPrev() {
    setActive((i) => (i === 0 ? photos.length - 1 : i - 1));
  }
  function goNext() {
    setActive((i) => (i === photos.length - 1 ? 0 : i + 1));
  }

  // Swipe-to-change-photo — works the same way with a finger or a mouse
  // drag, via the Pointer Events API. A swipe only counts once it clears
  // a minimum distance, so a normal tap (to zoom) still works normally.
  const swipeRef = useRef<{ startX: number; pointerId: number } | null>(null);
  const SWIPE_THRESHOLD = 40;

  function handleSwipeStart(e: React.PointerEvent) {
    if (photos.length < 2) return;
    swipeRef.current = { startX: e.clientX, pointerId: e.pointerId };
  }
  function handleSwipeEnd(e: React.PointerEvent) {
    const swipe = swipeRef.current;
    if (!swipe || e.pointerId !== swipe.pointerId) return;
    const delta = e.clientX - swipe.startX;
    swipeRef.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;
    if (delta > 0) goPrev();
    else goNext();
  }

  function openLightbox() {
    setZoomed(false);
    setLightboxOpen(true);
  }
  function closeLightbox() {
    setLightboxOpen(false);
    setZoomed(false);
  }

  // Arrow-key navigation and Escape-to-close while the lightbox is open.
  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape") closeLightbox();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, photos.length]);

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
      <div className="group relative aspect-square w-full overflow-hidden rounded-xl bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photos[active]}
          alt={alt}
          onClick={openLightbox}
          onPointerDown={handleSwipeStart}
          onPointerUp={handleSwipeEnd}
          className="h-full w-full touch-pan-y cursor-zoom-in object-contain"
        />
        <button
          type="button"
          onClick={openLightbox}
          aria-label="Enlarge photo"
          className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink shadow opacity-0 transition-opacity group-hover:opacity-100"
        >
          <ZoomIcon />
        </button>
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow opacity-0 transition-opacity group-hover:opacity-100"
            >
              <ChevronLeftIcon />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow opacity-0 transition-opacity group-hover:opacity-100"
            >
              <ChevronRightIcon />
            </button>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {photos.map((src, i) => (
            <button
              key={src}
              onClick={() => setActive(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 bg-surface transition-colors ${
                i === active ? "border-ink" : "border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${alt} — photo ${i + 1} of ${photos.length}`}
                className="h-full w-full object-contain"
              />
            </button>
          ))}
        </div>
      )}

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/90"
          onClick={closeLightbox}
        >
          <div className="flex items-center justify-between p-4">
            <p className="text-sm text-white/70">
              {photos.length > 1 ? `${active + 1} / ${photos.length}` : ""}
            </p>
            <button
              type="button"
              onClick={closeLightbox}
              aria-label="Close"
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div
            className={`relative flex flex-1 items-center justify-center px-4 py-6 sm:px-14 sm:py-10 ${
              zoomed ? "overflow-auto" : "overflow-hidden"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {photos.length > 1 && (
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow sm:left-6"
              >
                <ChevronLeftIcon />
              </button>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[active]}
              alt={alt}
              onClick={() => setZoomed((z) => !z)}
              onPointerDown={!zoomed ? handleSwipeStart : undefined}
              onPointerUp={!zoomed ? handleSwipeEnd : undefined}
              className={
                zoomed
                  ? "max-w-none cursor-zoom-out"
                  : "touch-pan-y cursor-zoom-in object-contain"
              }
              style={
                zoomed
                  ? { width: "180%" }
                  : { maxHeight: "85vh", maxWidth: "85vw" }
              }
            />

            {photos.length > 1 && (
              <button
                type="button"
                onClick={goNext}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow sm:right-6"
              >
                <ChevronRightIcon />
              </button>
            )}
          </div>

          <p className="p-3 text-center text-xs text-white/50">
            {zoomed
              ? "Tap the photo to zoom back out."
              : "Tap the photo to zoom in — drag to look around."}
          </p>
        </div>
      )}
    </div>
  );
}
