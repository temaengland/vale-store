export type PixelCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Crops the image to the given pixel area, resizes to a sensible max size
// for the web, and returns a compressed JPEG blob.
export async function getCroppedImageBlob(
  imageSrc: string,
  cropPixels: PixelCrop,
  maxOutputSize = 1200,
  quality = 0.85
): Promise<Blob> {
  const image = await loadImage(imageSrc);

  const outputSize = Math.min(maxOutputSize, cropPixels.width);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Crop failed"))),
      "image/jpeg",
      quality
    );
  });
}
