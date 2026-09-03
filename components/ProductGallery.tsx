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

const MAX_SCALE = 4;
const SWIPE_THRESHOLD = 40;

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
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

  // Pinch-to-zoom-and-pan directly on the main photo, without opening the
  // fullscreen view:
  //  - One finger, not zoomed  → swipe to the next/previous photo.
  //  - Two fingers             → pinch to zoom in or out.
  //  - One finger, zoomed in   → drag around to look at different parts.
  //  - Pinch back down to ~1x  → settles back to the normal view.
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const gesture = useRef<{
    mode: "idle" | "swipe" | "pan" | "pinch";
    pointers: Map<number, { x: number; y: number }>;
    pinchStartDistance: number;
    pinchStartScale: number;
    panStart: { x: number; y: number };
    panStartOffset: { x: number; y: number };
    swipeStartX: number;
  }>({
    mode: "idle",
    pointers: new Map(),
    pinchStartDistance: 0,
    pinchStartScale: 1,
    panStart: { x: 0, y: 0 },
    panStartOffset: { x: 0, y: 0 },
    swipeStartX: 0,
  });

  function panBounds(currentScale: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (rect.width * (currentScale - 1)) / 2,
      y: (rect.height * (currentScale - 1)) / 2,
    };
  }

  function handlePointerDown(e: React.PointerEvent) {
    const g = gesture.current;
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (g.pointers.size === 1) {
      if (scale > 1.01) {
        g.mode = "pan";
        g.panStart = { x: e.clientX, y: e.clientY };
        g.panStartOffset = { ...offset };
      } else if (photos.length > 1) {
        g.mode = "swipe";
        g.swipeStartX = e.clientX;
      }
    } else if (g.pointers.size === 2) {
      g.mode = "pinch";
      const [p1, p2] = Array.from(g.pointers.values());
      g.pinchStartDistance = dist(p1, p2);
      g.pinchStartScale = scale;
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g.pointers.has(e.pointerId)) return;
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (g.mode === "pinch" && g.pointers.size === 2) {
      const [p1, p2] = Array.from(g.pointers.values());
      const distance = dist(p1, p2);
      const nextScale = clamp(
        g.pinchStartScale * (distance / g.pinchStartDistance),
        1,
        MAX_SCALE
      );
      setScale(nextScale);
      const bounds = panBounds(nextScale);
      setOffset((o) => ({
        x: clamp(o.x, -bounds.x, bounds.x),
        y: clamp(o.y, -bounds.y, bounds.y),
      }));
    } else if (g.mode === "pan") {
      const bounds = panBounds(scale);
      const nextX = clamp(
        g.panStartOffset.x + (e.clientX - g.panStart.x),
        -bounds.x,
        bounds.x
      );
      const nextY = clamp(
        g.panStartOffset.y + (e.clientY - g.panStart.y),
        -bounds.y,
        bounds.y
      );
      setOffset({ x: nextX, y: nextY });
    }
    // "swipe" mode needs no live update — resolved on release below.
  }

  function handlePointerUp(e: React.PointerEvent) {
    const g = gesture.current;
    const wasSwipe = g.mode === "swipe";
    g.pointers.delete(e.pointerId);

    if (wasSwipe) {
      const delta = e.clientX - g.swipeStartX;
      if (Math.abs(delta) >= SWIPE_THRESHOLD) {
        if (delta > 0) goPrev();
        else goNext();
      }
    }

    if (g.pointers.size === 0) {
      // All fingers lifted — if we're basically back to 1x, snap fully
      // closed so the view resets cleanly for next time.
      if (scale <= 1.05) {
        setScale(1);
        setOffset({ x: 0, y: 0 });
      }
      g.mode = "idle";
    } else if (g.pointers.size === 1) {
      // Went from two fingers to one — keep going as a pan if still
      // zoomed in, so lifting just one finger doesn't interrupt anything.
      if (scale > 1.01) {
        g.mode = "pan";
        const remaining = Array.from(g.pointers.values())[0];
        g.panStart = remaining;
        g.panStartOffset = { ...offset };
      } else {
        g.mode = "idle";
      }
    }
  }

  function openLightbox() {
    setZoomed(false);
    setLightboxOpen(true);
  }
  function closeLightbox() {
    setLightboxOpen(false);
    setZoomed(false);
  }

  // Lightbox still has its own simple swipe (its zoom mode is separate,
  // full-screen, with its own tap-to-zoom — unrelated to the pinch/pan
  // above on the inline photo).
  const lightboxSwipeRef = useRef<{ startX: number; pointerId: number } | null>(
    null
  );
  function handleLightboxSwipeStart(e: React.PointerEvent) {
    if (photos.length < 2) return;
    lightboxSwipeRef.current = { startX: e.clientX, pointerId: e.pointerId };
  }
  function handleLightboxSwipeEnd(e: React.PointerEvent) {
    const swipe = lightboxSwipeRef.current;
    if (!swipe || e.pointerId !== swipe.pointerId) return;
    const delta = e.clientX - swipe.startX;
    lightboxSwipeRef.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;
    if (delta > 0) goPrev();
    else goNext();
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
      <div
        ref={containerRef}
        className="group relative aspect-square w-full touch-none overflow-hidden rounded-xl bg-surface"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photos[active]}
          alt={alt}
          onClick={() => {
            if (scale <= 1.01) openLightbox();
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "center center",
          }}
          className={`h-full w-full touch-none object-contain ${
            scale > 1.01 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
          }`}
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
        {scale > 1.01 && (
          <button
            type="button"
            onClick={() => {
              setScale(1);
              setOffset({ x: 0, y: 0 });
            }}
            className="absolute left-2 top-2 rounded-full bg-white/90 px-3 py-1 text-xs text-ink shadow"
          >
            Reset zoom
          </button>
        )}
      </div>

      {photos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {photos.map((src, i) => (
            <button
              key={src}
              onClick={() => {
                setActive(i);
                setScale(1);
                setOffset({ x: 0, y: 0 });
              }}
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
              onPointerDown={!zoomed ? handleLightboxSwipeStart : undefined}
              onPointerUp={!zoomed ? handleLightboxSwipeEnd : undefined}
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
