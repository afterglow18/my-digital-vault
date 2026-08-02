/**
 * visionNative — thin wrapper around the native iOS VisionPlugin.
 * Falls back to empty arrays on web / any error.
 */
import { registerPlugin } from '@capacitor/core';

interface VisionPluginInterface {
  analyzeImage(options: { dataUrl: string }): Promise<{ labels: string[]; text: string[] }>;
}

const VisionPlugin = registerPlugin<VisionPluginInterface>('VisionPlugin', {
  // Web stub — always returns empty so the indexer gracefully falls back to canvas.
  web: {
    async analyzeImage() {
      return { labels: [], text: [] };
    },
  },
});

export async function analyzeImageNative(
  dataUrl: string,
): Promise<{ labels: string[]; text: string[] }> {
  try {
    return await VisionPlugin.analyzeImage({ dataUrl });
  } catch {
    return { labels: [], text: [] };
  }
}
