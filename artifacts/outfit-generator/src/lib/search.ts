/**
 * search — fuzzy full-text search across items and outfits.
 *
 * Scoring weights (highest → lowest):
 *   name 10 · brand 9 · category 7 · color/notes 6
 *   size/season/occasion/price/date 5
 *   visionLabels 3 · visionText 2
 *
 * An outfit matches if its name, notes, or any item inside it matches.
 */
import type { ClothingItem, SavedOutfit } from '@/types/local';

export interface SearchResults {
  items: Array<{ item: ClothingItem; score: number }>;
  outfits: Array<{ outfit: SavedOutfit; score: number }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function contains(field: string | null | undefined, q: string): boolean {
  return !!field && field.toLowerCase().includes(q);
}

function scoreItem(item: ClothingItem, q: string): number {
  let score = 0;
  if (contains(item.name,          q)) score += 10;
  if (contains(item.brand,         q)) score += 9;
  if (contains(item.category,      q)) score += 7;
  if (contains(item.color,         q)) score += 6;
  if (contains(item.notes,         q)) score += 6;
  if (contains(item.size,          q)) score += 5;
  if (contains(item.season,        q)) score += 5;
  if (contains(item.occasion,      q)) score += 5;
  if (contains(item.purchasePrice, q)) score += 5;
  if (contains(item.purchaseDate,  q)) score += 5;
  if ((item.visionLabels ?? []).some((l) => l.toLowerCase().includes(q))) score += 3;
  if ((item.visionText   ?? []).some((t) => t.toLowerCase().includes(q))) score += 2;
  return score;
}

function scoreOutfit(
  outfit: SavedOutfit,
  q: string,
  allItems: ClothingItem[],
): number {
  let score = 0;
  if (contains(outfit.name,  q)) score += 8;
  if (contains(outfit.notes, q)) score += 6;

  // Check items inside the outfit
  const itemMap = new Map(allItems.map((i) => [i.id, i]));
  for (const id of (outfit.itemIds ?? [])) {
    const item = outfit.items?.find((i) => i.id === id) ?? itemMap.get(id);
    if (item) {
      const s = scoreItem(item, q);
      if (s > 0) score += 3; // group gets a fixed bump if any member matches
    }
  }
  return score;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function search(
  query: string,
  items: ClothingItem[],
  outfits: SavedOutfit[],
): SearchResults {
  const q = query.toLowerCase().trim();
  if (!q) return { items: [], outfits: [] };

  // Score + deduplicate items
  const seen = new Set<string>();
  const scoredItems = items
    .map((item) => ({ item, score: scoreItem(item, q) }))
    .filter(({ item, score }) => {
      if (score === 0 || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .sort((a, b) => b.score - a.score);

  // Score outfits
  const scoredOutfits = outfits
    .map((outfit) => ({ outfit, score: scoreOutfit(outfit, q, items) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  return { items: scoredItems, outfits: scoredOutfits };
}
