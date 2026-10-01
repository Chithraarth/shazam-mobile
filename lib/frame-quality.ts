import * as ImageManipulator from "expo-image-manipulator";
import { decode } from "jpeg-js";

export type FrameQuality = { dark: boolean; blurry: boolean; brightness: number; sharpness: number };

// Thresholds are deliberately conservative: a warning the user can skip is
// fine, but warning about good frames would be annoying.
const DARK_BELOW = 40; // mean luminance, 0–255
const BLURRY_BELOW = 35; // variance of the Laplacian on a 160px-wide frame
const SAMPLE_WIDTH = 160;

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Checks a captured frame for low light and blur on-device, before a scan
// is spent on it. Returns null if the frame can't be analysed.
export async function checkFrameQuality(uri: string): Promise<FrameQuality | null> {
  try {
    const small = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: SAMPLE_WIDTH } }], {
      compress: 0.9,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    if (!small.base64) return null;
    const { width, height, data } = decode(base64ToBytes(small.base64), { useTArray: true, formatAsRGBA: true });

    const gray = new Float32Array(width * height);
    let sum = 0;
    for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
      const y = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
      gray[i] = y;
      sum += y;
    }
    const brightness = sum / gray.length;

    // Variance of the 4-neighbour Laplacian: low means few sharp edges.
    let lapSum = 0;
    let lapSq = 0;
    let n = 0;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = y * width + x;
        const lap = gray[i - 1] + gray[i + 1] + gray[i - width] + gray[i + width] - 4 * gray[i];
        lapSum += lap;
        lapSq += lap * lap;
        n++;
      }
    }
    const mean = lapSum / n;
    const sharpness = lapSq / n - mean * mean;

    return { dark: brightness < DARK_BELOW, blurry: sharpness < BLURRY_BELOW, brightness, sharpness };
  } catch {
    return null;
  }
}
