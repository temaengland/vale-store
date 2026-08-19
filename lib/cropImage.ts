// Rotates an image by 90-degree steps and returns a new object URL.
// Using fixed 90° steps (rather than arbitrary angles) keeps the maths
// simple and reliable: we just swap width/height as needed.
export function rotateImage90(
  image: HTMLImageElement,
  quarterTurns: number // 0-3
): Promise<string> {
  const turns = ((quarterTurns % 4) + 4) % 4;
  const swapped = turns === 1 || turns === 3;
  const canvas = document.createElement("canvas");
  canvas.width = swapped ? image.naturalHeight : image.naturalWidth;
  canvas.height = swapped ? image.naturalWidth : image.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((turns * 90 * Math.PI) / 180);
  ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(URL.createObjectURL(blob!));
    }, "image/png");
  });
}

// Crops the (already correctly-oriented) displayed image to the given pixel
// area, at the photo's own full native resolution — nothing is shrunk,
// stretched, or forced into a smaller square. maxOutputSize is only a
// generous safety ceiling against extreme cases (e.g. a 12,000px panorama),
// not a normal downscale.
export async function cropToBlob(
  image: HTMLImageElement,
  crop: { x: number; y: number; width: number; height: number },
  maxOutputSize = 4000,
  quality = 0.95
): Promise<Blob> {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const cropW = crop.width * scaleX;
  const cropH = crop.height * scaleY;

  // Scale down only if genuinely oversized, and keep the crop's own aspect
  // ratio rather than forcing a square canvas.
  const largestSide = Math.max(cropW, cropH);
  const scale = largestSide > maxOutputSize ? maxOutputSize / largestSide : 1;
  const outW = Math.round(cropW * scale);
  const outH = Math.round(cropH * scale);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    cropW,
    cropH,
    0,
    0,
    outW,
    outH
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Crop failed"))),
      "image/jpeg",
      quality
    );
  });
}
