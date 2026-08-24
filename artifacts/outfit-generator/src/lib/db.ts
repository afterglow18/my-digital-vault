/**
 * Local IndexedDB database service — replaces the API server.
 * Works identically on iOS (via Capacitor's WKWebView) and web dev.
 *
 * Schema version 2: clothing_items, outfits, outfit_items, dinner_plans.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  ClothingItem,
  SavedOutfit,
  CreateClothingData,
  UpdateClothingData,
  WardrobeStats,
  DinnerPlan,
  DinnerPlanInput,
} from '@/types/local';

// ── Schema ────────────────────────────────────────────────────────────────────

type OutfitRow = Omit<SavedOutfit, 'items'>;
type OutfitItemRow = {
  id: string;
  outfitId: string;
  clothingItemId: string;
  position: number;
};

interface VanitySchema extends DBSchema {
  clothing: {
    key: string;
    value: ClothingItem;
    indexes: { 'by-category': string; 'by-created': string };
  };
  outfits: {
    key: string;
    value: OutfitRow;
    indexes: { 'by-created': string };
  };
  outfit_items: {
    key: string;
    value: OutfitItemRow;
    indexes: { 'by-outfit': string };
  };
  dinner_plans: {
    key: string;
    value: DinnerPlan;
    indexes: { 'by-date': string; 'by-created': string };
  };
}

// ── Singleton connection ───────────────────────────────────────────────────────

let _dbPromise: Promise<IDBPDatabase<VanitySchema>> | null = null;

function getDB(): Promise<IDBPDatabase<VanitySchema>> {
  if (!_dbPromise) {
    _dbPromise = openDB<VanitySchema>('vanity-db', 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('clothing')) {
          const s = db.createObjectStore('clothing', { keyPath: 'id' });
          s.createIndex('by-category', 'category');
          s.createIndex('by-created', 'createdAt');
        }
        if (!db.objectStoreNames.contains('outfits')) {
          const s = db.createObjectStore('outfits', { keyPath: 'id' });
          s.createIndex('by-created', 'createdAt');
        }
        if (!db.objectStoreNames.contains('outfit_items')) {
          const s = db.createObjectStore('outfit_items', { keyPath: 'id' });
          s.createIndex('by-outfit', 'outfitId');
        }
        if (!db.objectStoreNames.contains('dinner_plans')) {
          const s = db.createObjectStore('dinner_plans', { keyPath: 'id' });
          s.createIndex('by-date', 'date', { unique: true });
          s.createIndex('by-created', 'createdAt');
        }
      },
    });
  }
  return _dbPromise;
}

// ── Clothing ──────────────────────────────────────────────────────────────────

export async function dbListClothing(category?: string): Promise<ClothingItem[]> {
  const db = await getDB();
  if (category) {
    const items = await db.getAllFromIndex('clothing', 'by-category', category);
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const items = await db.getAll('clothing');
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function dbCreateClothing(data: CreateClothingData): Promise<ClothingItem> {
  const db = await getDB();
  const now = new Date().toISOString();
  const item: ClothingItem = {
    id: crypto.randomUUID(),
    name: data.name,
    category: data.category,
    imageObjectPath: data.imageObjectPath ?? null,
    color: data.color ?? null,
    brand: data.brand ?? null,
    size: data.size ?? null,
    season: data.season ?? null,
    occasion: data.occasion ?? null,
    purchasePrice: data.purchasePrice ?? null,
    purchaseDate: data.purchaseDate ?? null,
    notes: data.notes ?? null,
    isFavorite: data.isFavorite ?? false,
    timesWorn: 0,
    lastMadeDate: null,
    visionLabels: [],
    visionText: [],
    visionVersion: 0,
    createdAt: now,
    updatedAt: now,
  };
  await db.put('clothing', item);
  return item;
}

export async function dbUpdateClothing(id: string, data: UpdateClothingData): Promise<ClothingItem> {
  const db = await getDB();
  const existing = await db.get('clothing', id);
  if (!existing) throw new Error(`Clothing item ${id} not found`);
  const updated: ClothingItem = {
    ...existing,
    ...data,
    id,
    updatedAt: new Date().toISOString(),
  };
  await db.put('clothing', updated);
  return updated;
}

export async function dbDeleteClothing(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('clothing', id);

  // Remove from all outfits
  const allOI = await db.getAll('outfit_items');
  const tx = db.transaction('outfit_items', 'readwrite');
  await Promise.all(
    allOI
      .filter((oi) => oi.clothingItemId === id)
      .map((oi) => tx.store.delete(oi.id)),
  );
  await tx.done;

  // Update itemIds arrays on affected outfit rows
  const affectedOutfitIds = new Set(
    allOI.filter((oi) => oi.clothingItemId === id).map((oi) => oi.outfitId),
  );
  for (const outfitId of affectedOutfitIds) {
    const row = await db.get('outfits', outfitId);
    if (row) {
      await db.put('outfits', {
        ...row,
        itemIds: (row.itemIds ?? []).filter((i) => i !== id),
      });
    }
  }
}

export async function dbGetWardrobeStats(): Promise<WardrobeStats> {
  const db = await getDB();
  const allItems = await db.getAll('clothing');
  const allOutfits = await db.getAll('outfits');

  const byCategory = (['documents', 'finances', 'personal', 'recipes-meal-plans'] as const).map((cat) => ({
    category: cat,
    count: allItems.filter((i) => i.category === cat).length,
  }));

  return {
    total: allItems.length,
    byCategory,
    favorites: allItems.filter((i) => i.isFavorite).length,
    outfits: allOutfits.length,
  };
}

// ── Outfits ───────────────────────────────────────────────────────────────────

async function hydrateOutfit(
  row: OutfitRow,
  db: IDBPDatabase<VanitySchema>,
): Promise<SavedOutfit> {
  const ois = await db.getAllFromIndex('outfit_items', 'by-outfit', row.id);
  ois.sort((a, b) => a.position - b.position);
  const items = (
    await Promise.all(ois.map((oi) => db.get('clothing', oi.clothingItemId)))
  ).filter((i): i is ClothingItem => i != null);
  return { ...row, items };
}

export async function dbListOutfits(): Promise<SavedOutfit[]> {
  const db = await getDB();
  const rows = await db.getAll('outfits');
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // newest first
  return Promise.all(rows.map((row) => hydrateOutfit(row, db)));
}

export async function dbCreateOutfit(name: string, itemIds: string[]): Promise<SavedOutfit> {
  const db = await getDB();
  const now = new Date().toISOString();
  const outfitId = crypto.randomUUID();

  const row: OutfitRow = { id: outfitId, name, notes: null, itemIds, createdAt: now };
  await db.put('outfits', row);

  const tx = db.transaction('outfit_items', 'readwrite');
  await Promise.all(
    itemIds.map((itemId, idx) =>
      tx.store.put({
        id: crypto.randomUUID(),
        outfitId,
        clothingItemId: itemId,
        position: idx,
      }),
    ),
  );
  await tx.done;

  return hydrateOutfit(row, db);
}

export async function dbUpdateOutfit(
  id: string,
  data: { name?: string; notes?: string | null },
): Promise<void> {
  const db = await getDB();
  const existing = await db.get('outfits', id);
  if (!existing) return;
  await db.put('outfits', { ...existing, ...data });
}

export async function dbDeleteOutfit(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('outfits', id);
  const allOI = await db.getAll('outfit_items');
  const tx = db.transaction('outfit_items', 'readwrite');
  await Promise.all(
    allOI.filter((oi) => oi.outfitId === id).map((oi) => tx.store.delete(oi.id)),
  );
  await tx.done;
}

export async function dbAddItemToOutfit(outfitId: string, clothingItemId: string): Promise<void> {
  const db = await getDB();
  const row = await db.get('outfits', outfitId);
  if (!row) return;

  const allOI = await db.getAll('outfit_items');
  const already = allOI.some(
    (oi) => oi.outfitId === outfitId && oi.clothingItemId === clothingItemId,
  );
  if (already) return;

  const position = allOI.filter((oi) => oi.outfitId === outfitId).length;
  await db.put('outfit_items', {
    id: crypto.randomUUID(),
    outfitId,
    clothingItemId,
    position,
  });
  await db.put('outfits', {
    ...row,
    itemIds: [...(row.itemIds ?? []), clothingItemId],
  });
}

export async function dbRemoveItemFromOutfit(
  outfitId: string,
  clothingItemId: string,
): Promise<void> {
  const db = await getDB();
  const allOI = await db.getAll('outfit_items');
  const tx = db.transaction('outfit_items', 'readwrite');
  await Promise.all(
    allOI
      .filter((oi) => oi.outfitId === outfitId && oi.clothingItemId === clothingItemId)
      .map((oi) => tx.store.delete(oi.id)),
  );
  await tx.done;

  const row = await db.get('outfits', outfitId);
  if (row) {
    await db.put('outfits', {
      ...row,
      itemIds: (row.itemIds ?? []).filter((i) => i !== clothingItemId),
    });
  }
}

// ── Dinner planner ────────────────────────────────────────────────────────────

export async function dbListDinnerPlans(
  startDate?: string,
  endDate?: string,
): Promise<DinnerPlan[]> {
  const db = await getDB();
  const plans = await db.getAll('dinner_plans');
  return plans
    .filter((plan) => (!startDate || plan.date >= startDate) && (!endDate || plan.date <= endDate))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function dbUpsertDinnerPlan(data: DinnerPlanInput): Promise<DinnerPlan> {
  const db = await getDB();
  const existing = await db.getFromIndex('dinner_plans', 'by-date', data.date);
  const now = new Date().toISOString();
  const plan: DinnerPlan = {
    id: existing?.id ?? crypto.randomUUID(),
    date: data.date,
    recipeItemId: data.recipeItemId ?? null,
    recipeName: data.recipeName.trim(),
    notes: data.notes?.trim() || null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await db.put('dinner_plans', plan);
  return plan;
}

export async function dbDeleteDinnerPlan(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('dinner_plans', id);
}

// ── Export / Import ───────────────────────────────────────────────────────────

export interface ExportPayload {
  version: 1 | 2;
  exportedAt: string;
  clothing: ClothingItem[];
  outfits: OutfitRow[];
  outfit_items: OutfitItemRow[];
  dinnerPlans?: DinnerPlan[];
}

export async function dbExportAll(): Promise<ExportPayload> {
  const db = await getDB();
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    clothing: await db.getAll('clothing'),
    outfits: await db.getAll('outfits'),
    outfit_items: await db.getAll('outfit_items'),
    dinnerPlans: await db.getAll('dinner_plans'),
  };
}

export async function dbImportAll(payload: ExportPayload): Promise<void> {
  const db = await getDB();

  if (
    (payload.version !== 1 && payload.version !== 2) ||
    !Array.isArray(payload.clothing) ||
    !Array.isArray(payload.outfits) ||
    !Array.isArray(payload.outfit_items) ||
    (payload.dinnerPlans !== undefined && !Array.isArray(payload.dinnerPlans))
  ) {
    throw new Error('Invalid backup file format');
  }

  const dinnerPlans = payload.dinnerPlans ?? [];
  const seenDates = new Set<string>();
  for (const plan of dinnerPlans) {
    if (
      !plan ||
      typeof plan.id !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(plan.date) ||
      typeof plan.recipeName !== 'string' ||
      !plan.recipeName.trim() ||
      seenDates.has(plan.date)
    ) {
      throw new Error('Invalid dinner plans in backup');
    }
    seenDates.add(plan.date);
  }

  // A single transaction ensures an invalid or corrupt import leaves the
  // current filing cabinet untouched instead of clearing it first.
  const tx = db.transaction(['clothing', 'outfits', 'outfit_items', 'dinner_plans'], 'readwrite');
  await Promise.all([
    tx.objectStore('clothing').clear(),
    tx.objectStore('outfits').clear(),
    tx.objectStore('outfit_items').clear(),
    tx.objectStore('dinner_plans').clear(),
  ]);

  await Promise.all([
    ...payload.clothing.map((item) => tx.objectStore('clothing').put(item)),
    ...payload.outfits.map((row) => tx.objectStore('outfits').put(row)),
    ...payload.outfit_items.map((oi) => tx.objectStore('outfit_items').put(oi)),
    ...dinnerPlans.map((plan) => tx.objectStore('dinner_plans').put(plan)),
  ]);
  await tx.done;
}
