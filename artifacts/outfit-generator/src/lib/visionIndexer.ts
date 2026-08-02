/**
 * visionIndexer — background photo-search indexer.
 *
 * On app start: finds all items with visionVersion < 4 and processes them
 * one at a time with a 350 ms delay so the UI stays responsive.
 *
 * On native iOS: calls VisionPlugin (labels + OCR text), sets visionVersion = 1.
 * On web: runs canvas color extraction, sets visionVersion = 4 (or 5 if no labels).
 *
 * Dispatches "vault:vision-indexing" CustomEvents so UI can show a toast.
 * Call queueItemForIndexing() after a new item is created to index it immediately.
 */

import { dbListClothing, dbUpdateClothing } from '@/lib/db';
import { extractColors } from '@/lib/visionWeb';
import { analyzeImageNative } from '@/lib/visionNative';
import { Capacitor } from '@capacitor/core';
import type { ClothingItem } from '@/types/local';

// ── Internal queue ────────────────────────────────────────────────────────────

let running = false;
const immediateQueue: ClothingItem[] = [];

function dispatch(active: boolean, done: number, total: number) {
  window.dispatchEvent(
    new CustomEvent('vault:vision-indexing', { detail: { active, done, total } }),
  );
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// ── Core analysis ─────────────────────────────────────────────────────────────

async function analyzeItem(item: ClothingItem): Promise<void> {
  if (!item.imageObjectPath) {
    // No photo — mark as "web done, no labels" so we skip it next time
    await dbUpdateClothing(item.id, {
      visionLabels: [],
      visionText: [],
      visionVersion: 5,
    });
    return;
  }

  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    const { labels, text } = await analyzeImageNative(item.imageObjectPath);
    await dbUpdateClothing(item.id, {
      visionLabels: labels,
      visionText:   text,
      visionVersion: 1,
    });
  } else {
    const labels = await extractColors(item.imageObjectPath);
    await dbUpdateClothing(item.id, {
      visionLabels:  labels,
      visionText:    [],
      visionVersion: labels.length > 0 ? 4 : 5,
    });
  }
}

// ── Main indexer loop ─────────────────────────────────────────────────────────

async function runIndexer(items: ClothingItem[]) {
  if (running || items.length === 0) return;
  running = true;

  const total = items.length;
  let done = 0;
  dispatch(true, done, total);

  for (const item of items) {
    try {
      await analyzeItem(item);
    } catch {
      // Non-fatal — continue with next item
    }
    done++;
    dispatch(true, done, total);
    await delay(350);
  }

  // Drain any items queued during the run
  while (immediateQueue.length > 0) {
    const next = immediateQueue.shift()!;
    try { await analyzeItem(next); } catch { /* ignore */ }
    dispatch(true, ++done, total + immediateQueue.length + 1);
    await delay(350);
  }

  running = false;
  dispatch(false, done, total);
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Call once on app startup to kick off background indexing. */
export async function startVisionIndexer(): Promise<void> {
  try {
    const all = await dbListClothing();
    // Re-run anything < version 4 (version 1 = old iOS run; still re-index on web)
    const needsWork = all.filter(
      (i) => (i.visionVersion ?? 0) < 4,
    );
    runIndexer(needsWork); // fire-and-forget
  } catch {
    /* silent — search falls back to text-only */
  }
}

/**
 * Queue a single item for immediate analysis.
 * Call after a new photo is added or an existing photo is replaced.
 */
export function queueItemForIndexing(item: ClothingItem): void {
  if (running) {
    immediateQueue.push(item);
  } else {
    runIndexer([item]);
  }
}
