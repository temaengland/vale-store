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
// area, resizes to a sensible max size for the web, and returns a
// compressed JPEG blob.
export async function cropToBlob(
  image: HTMLImageElement,
  crop: { x: number; y: number; width: number; height: number },
  maxOutputSize = 1200,
  quality = 0.85
): Promise<Blob> {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const cropW = crop.width * scaleX;
  const cropH = crop.height * scaleY;

  const outputSize = Math.min(maxOutputSize, Math.max(cropW, cropH));
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    cropW,
    cropH,
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
