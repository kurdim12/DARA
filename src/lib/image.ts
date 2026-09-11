import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_EDGE,
  type AnalyzeImage,
} from "../../shared/types";
import { AppError } from "./api";

/**
 * Turns a chosen file into something the Worker can forward to the model.
 *
 * A screenshot is evidence, so it is only resized when it has to be: past the
 * resolution the model actually reads, or past the size the request allows.
 * PNG sources stay PNG, because that is where small text survives.
 */
export async function prepareImage(file: File): Promise<AnalyzeImage> {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new AppError("error.bad_image");
  }

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new AppError("error.bad_image");
  });

  const longEdge = Math.max(bitmap.width, bitmap.height);
  const withinSize = file.size <= MAX_IMAGE_BYTES;
  const withinEdge = longEdge <= MAX_IMAGE_EDGE;

  if (withinSize && withinEdge) {
    bitmap.close();
    return {
      media_type: file.type as AnalyzeImage["media_type"],
      data: await toBase64(file),
    };
  }

  const scale = withinEdge ? 1 : MAX_IMAGE_EDGE / longEdge;
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new AppError("error.bad_image");
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Try the format that keeps text crispest first, and only trade quality away
  // if the result still will not fit.
  const attempts: [string, number | undefined][] =
    file.type === "image/png"
      ? [["image/png", undefined], ["image/jpeg", 0.92], ["image/jpeg", 0.8]]
      : [["image/jpeg", 0.92], ["image/jpeg", 0.8]];

  for (const [type, quality] of attempts) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, quality),
    );
    if (blob && blob.size <= MAX_IMAGE_BYTES) {
      return {
        media_type: type as AnalyzeImage["media_type"],
        data: await toBase64(blob),
      };
    }
  }

  throw new AppError("error.image_too_large");
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new AppError("error.bad_image"));
    reader.onload = () => {
      const result = String(reader.result);
      // Strip the "data:<type>;base64," prefix the API does not want.
      const comma = result.indexOf(",");
      resolve(comma === -1 ? result : result.slice(comma + 1));
    };
    reader.readAsDataURL(blob);
  });
}

export function previewUrl(image: AnalyzeImage): string {
  return `data:${image.media_type};base64,${image.data}`;
}
