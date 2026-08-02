/**
 * visionWeb — web canvas color extraction for photo search indexing.
 *
 * Draws each item photo to a 48×48 canvas, detects the studio background
 * by sampling 4×4 patches from each corner, excludes background-matching
 * pixels, then maps surviving foreground pixels to named colors.
 * A color must cover ≥10% of foreground pixels to be included.
 */

// ── Color math helpers ────────────────────────────────────────────────────────

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn)      h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else                 h = ((rn - gn) / d + 4) / 6;
  return [h * 360, s * 100, l * 100];
}

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function toColorName(r: number, g: number, b: number): string {
  const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
  if (brightness < 80)  return 'black';
  if (brightness < 110) return 'dark grey';
  if (brightness < 175) return 'grey';
  if (brightness < 225) return 'light grey';

  const [h, s, l] = rgbToHsl(r, g, b);

  // Low saturation → achromatic / near-white or neutral warm tones
  if (s < 15) return 'white';

  // Warm low-saturation: beige / tan / brown
  if (s < 30 && (h <= 50 || h >= 330)) {
    if (l > 72) return 'beige';
    if (l > 45) return 'tan';
    return 'brown';
  }
  if (s < 45 && h > 15 && h <= 45) return 'brown';

  // Chromatic
  if (h < 20 || h >= 350) return 'red';
  if (h < 40)  return 'orange';
  if (h < 65)  return 'yellow';
  if (h < 155) return 'green';
  if (h < 195) return 'teal';
  if (h < 260) return 'blue';
  if (h < 295) return 'purple';
  return 'pink';
}

// ── Corner sampling ───────────────────────────────────────────────────────────

/** Returns the average RGB of a 4×4 pixel patch at (cx, cy) in the pixel data. */
function samplePatch(
  data: Uint8ClampedArray,
  width: number,
  cx: number,
  cy: number,
): [number, number, number] {
  let r = 0, g = 0, b = 0, count = 0;
  for (let dy = 0; dy < 4; dy++) {
    for (let dx = 0; dx < 4; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x >= width || y >= width) continue;
      const idx = (y * width + x) * 4;
      r += data[idx]; g += data[idx + 1]; b += data[idx + 2];
      count++;
    }
  }
  if (count === 0) return [255, 255, 255];
  return [r / count, g / count, b / count];
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Extracts dominant foreground color names from a data URL.
 * Returns an empty array if the URL is null or the canvas fails.
 */
export async function extractColors(dataUrl: string | null): Promise<string[]> {
  if (!dataUrl) return [];

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const SIZE = 48;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE; canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve([]); return; }

        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

        // Sample 4 corners (4×4 each)
        const corners = [
          samplePatch(data, SIZE,  0,  0),  // top-left
          samplePatch(data, SIZE, 44,  0),  // top-right
          samplePatch(data, SIZE,  0, 44),  // bottom-left
          samplePatch(data, SIZE, 44, 44),  // bottom-right
        ];
        // Background = average of corners
        const bg: [number, number, number] = [
          corners.reduce((s, c) => s + c[0], 0) / 4,
          corners.reduce((s, c) => s + c[1], 0) / 4,
          corners.reduce((s, c) => s + c[2], 0) / 4,
        ];
        const BG_TOLERANCE = 30;

        // Count color names over foreground pixels
        const colorCounts = new Map<string, number>();
        let foregroundCount = 0;

        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 128) continue; // transparent
          const r = data[i], g = data[i + 1], b = data[i + 2];
          if (colorDistance(r, g, b, bg[0], bg[1], bg[2]) < BG_TOLERANCE) continue;
          foregroundCount++;
          const name = toColorName(r, g, b);
          colorCounts.set(name, (colorCounts.get(name) ?? 0) + 1);
        }

        if (foregroundCount === 0) { resolve([]); return; }

        const THRESHOLD = 0.10;
        const results: string[] = [];
        for (const [name, count] of colorCounts) {
          if (count / foregroundCount >= THRESHOLD) results.push(name);
        }

        resolve(results);
      } catch {
        resolve([]);
      }
    };
    img.onerror = () => resolve([]);
    img.src = dataUrl;
  });
}
