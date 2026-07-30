/**
 * ItemDetailsSheet — full-screen overlay showing an item's details.
 * Every field is optional and editable. A "Save" button appears only when
 * the form is dirty. Delete is always available.
 *
 * Recipes + Meal Plans items get an extra cooking-tracker section:
 *  • "Making This Today" button directly below the photo
 *  • Editable "Times Made" field (saves on blur)
 *  • "Last made: M/D/YY" label — hidden if never logged
 */
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Trash2, Save, ChevronDown, Check, RotateCcw } from "lucide-react";
import type { ClothingItem, ClothingCategory, ClothingItemUpdateCategory } from "@/types/local";
import { useUpdateClothingItem, useDeleteClothingItem, getListClothingQueryKey } from "@/hooks/useLocalWardrobe";
import { getListOutfitsQueryKey } from "@/hooks/useLocalOutfits";
import { useQueryClient } from "@tanstack/react-query";
import { getImageUrl } from "@/lib/utils";

// ── Date helpers ──────────────────────────────────────────────────────────────

/** Returns today's date as "YYYY-MM-DD" in the user's local timezone. */
function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Formats "YYYY-MM-DD" → "M/D/YY" e.g. "2026-01-05" → "1/5/26". */
function formatLastMade(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `Last made: ${m}/${d}/${String(y).slice(2)}`;
}

// ── Static options ─────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS: { value: ClothingCategory; label: string }[] = [
  { value: "documents",          label: "Documents" },
  { value: "finances",           label: "Finances" },
  { value: "personal",           label: "Personal" },
  { value: "recipes-meal-plans", label: "Recipes + Meal Plans" },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? label}
        className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm font-medium
                   bg-white focus:outline-none focus:ring-2 focus:ring-primary
                   placeholder:font-normal placeholder:text-black/25"
      />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface ItemDetailsSheetProps {
  item: ClothingItem | null;
  onClose: () => void;
  onDeleted?: () => void;
}

interface FormState {
  name: string;
  category: string;
  purchasePrice: string;
  purchaseDate: string;
  notes: string;
  isFavorite: boolean;
}

function toForm(item: ClothingItem): FormState {
  return {
    name:          item.name          ?? "",
    category:      item.category      ?? "documents",
    purchasePrice: item.purchasePrice ?? "",
    purchaseDate:  item.purchaseDate  ?? "",
    notes:         item.notes         ?? "",
    isFavorite:    item.isFavorite    ?? false,
  };
}

function isDirty(form: FormState, item: ClothingItem): boolean {
  return (
    form.name          !== (item.name          ?? "")          ||
    form.category      !== (item.category      ?? "documents") ||
    form.purchasePrice !== (item.purchasePrice ?? "")          ||
    form.purchaseDate  !== (item.purchaseDate  ?? "")          ||
    form.notes         !== (item.notes         ?? "")          ||
    form.isFavorite    !== (item.isFavorite    ?? false)
  );
}

export function ItemDetailsSheet({ item, onClose, onDeleted }: ItemDetailsSheetProps) {
  const [form, setForm]                           = useState<FormState | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── Cooking tracker state (recipes-meal-plans only) ──────────────────────────
  // timesMadeInput: local string for the editable input, saved on blur
  const [timesMadeInput, setTimesMadeInput] = useState("");
  // prevLastMadeDate: the lastMadeDate before the user tapped "Making This Today"
  // in this session. null means either never logged, or logged before app opened.
  const [prevLastMadeDate, setPrevLastMadeDate] = useState<string | null>(null);
  // loggedToday: optimistic local flag so the button flips instantly on tap
  // without waiting for the async mutation + refetch cycle to complete.
  const [loggedToday, setLoggedToday] = useState(false);

  const updateItem  = useUpdateClothingItem();
  const deleteItem  = useDeleteClothingItem();
  const queryClient = useQueryClient();

  // Reset form whenever we open a different item
  useEffect(() => {
    if (item) {
      setForm(toForm(item));
      setTimesMadeInput(String(item.timesWorn ?? 0));
      setPrevLastMadeDate(null);
      setLoggedToday(item.lastMadeDate === todayLocal());
    }
    setShowDeleteConfirm(false);
  }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep timesMadeInput in sync after external mutations (e.g. button tap)
  useEffect(() => {
    if (item) setTimesMadeInput(String(item.timesWorn ?? 0));
  }, [item?.timesWorn]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!item || !form) return null;

  const today    = todayLocal(); // re-evaluated each render → auto-resets at midnight
  const isRecipe = item.category === "recipes-meal-plans";

  const dirty = isDirty(form, item);
  const patch = (key: keyof FormState) => (value: string | boolean) =>
    setForm((prev) => prev ? { ...prev, [key]: value } : prev);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListClothingQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListOutfitsQueryKey() });
  };

  // ── Form save ────────────────────────────────────────────────────────────────
  const handleSave = () => {
    updateItem.mutate(
      {
        id: item.id,
        data: {
          name:          form.name.trim() || item.name,
          category:      (form.category || item.category) as ClothingItemUpdateCategory,
          purchasePrice: form.purchasePrice.trim() || null,
          purchaseDate:  form.purchaseDate.trim() || null,
          notes:         form.notes.trim() || null,
          isFavorite:    form.isFavorite,
        },
      },
      { onSuccess: () => { invalidate(); onClose(); } },
    );
  };

  // ── Cooking tracker actions ──────────────────────────────────────────────────
  const handleLogToday = () => {
    // Read from timesMadeInput (already optimistic) — never from item.timesWorn
    // which may be stale if the previous refetch hasn't settled yet.
    const current   = Math.max(0, parseInt(timesMadeInput, 10) || 0);
    const nextCount = current + 1;
    setPrevLastMadeDate(item.lastMadeDate);
    setLoggedToday(true);
    setTimesMadeInput(String(nextCount));
    updateItem.mutate({
      id: item.id,
      data: { lastMadeDate: today, timesWorn: nextCount },
    }, { onSuccess: invalidate });
  };

  const handleUndo = () => {
    const current   = Math.max(0, parseInt(timesMadeInput, 10) || 0);
    const nextCount = Math.max(0, current - 1);
    setLoggedToday(false);
    setTimesMadeInput(String(nextCount));
    updateItem.mutate({
      id: item.id,
      data: { lastMadeDate: prevLastMadeDate, timesWorn: nextCount },
    }, { onSuccess: invalidate });
    setPrevLastMadeDate(null);
  };

  const handleTimesMadeBlur = () => {
    const parsed = parseInt(timesMadeInput, 10);
    const value  = Number.isFinite(parsed) ? Math.max(0, parsed) : (item.timesWorn ?? 0);
    if (value !== item.timesWorn) {
      updateItem.mutate({ id: item.id, data: { timesWorn: value } }, { onSuccess: invalidate });
    }
    setTimesMadeInput(String(value)); // normalise display
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = () => {
    deleteItem.mutate(
      { id: item.id },
      {
        onSuccess: () => {
          invalidate();
          onDeleted?.();
          onClose();
        },
      },
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 240 }}
      className="fixed inset-0 z-[65] flex flex-col max-w-md mx-auto bg-[#f9f4ee] overflow-y-auto"
    >
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 pb-3
                   bg-white border-b-2 border-black flex-shrink-0"
        style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
      >
        <h2 className="font-display font-bold text-xl uppercase tracking-tight">Item Details</h2>
        <div className="flex items-center gap-2">
          {/* Favourite toggle */}
          <button
            onClick={() => {
              const next = !form.isFavorite;
              patch("isFavorite")(next);
              updateItem.mutate(
                { id: item.id, data: { isFavorite: next } },
                { onSuccess: invalidate },
              );
            }}
            className="w-9 h-9 border-2 border-black rounded-full flex items-center justify-center
                       transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            style={form.isFavorite
              ? { background: "linear-gradient(to bottom, #8a8a8a, #666666)" }
              : { background: "white" }}
          >
            <Heart
              className="w-4 h-4"
              fill={form.isFavorite ? "white" : "none"}
              stroke={form.isFavorite ? "white" : "currentColor"}
            />
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 border-2 border-black rounded-full flex items-center justify-center
                       bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                       active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Photo ─────────────────────────────────────────────────────────────── */}
      {item.imageObjectPath && (
        <div
          className="w-full h-52 flex-shrink-0 border-b-2 border-black"
          style={{
            backgroundImage: "repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%)",
            backgroundSize: "16px 16px",
          }}
        >
          <img
            src={getImageUrl(item.imageObjectPath)!}
            alt={item.name}
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {/* ── Cooking tracker (recipes-meal-plans only) ─────────────────────────── */}
      {isRecipe && (
        <div className="px-4 pt-4 pb-2 flex flex-col gap-3 border-b-2 border-black/10">

          {/* "Making This Today" / "Logged ✓ · Undo" button */}
          {!loggedToday ? (
            <button
              onClick={handleLogToday}
              disabled={updateItem.isPending}
              className="w-full py-3 rounded-xl border-2 border-black font-black uppercase
                         text-sm tracking-wide text-white flex items-center justify-center gap-2
                         shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                         active:translate-x-0.5 active:translate-y-0.5 active:shadow-none
                         transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(to bottom, #8a8a8a, #666666)" }}
            >
              Making This Today
            </button>
          ) : (
            <div className="flex gap-2">
              {/* Logged state — full width green-ish pill */}
              <div
                className="flex-1 py-3 rounded-xl border-2 font-bold uppercase
                           text-sm tracking-wide flex items-center justify-center gap-2"
                style={{ background: "#f0f0f0", color: "#555555", borderColor: "rgba(0,0,0,0.18)" }}
              >
                <Check className="w-4 h-4" strokeWidth={2.5} />
                Logged
              </div>
              {/* Undo button */}
              <button
                onClick={handleUndo}
                disabled={updateItem.isPending}
                className="px-4 py-3 rounded-xl border-2 border-black bg-white font-bold uppercase
                           text-xs tracking-wide flex items-center justify-center gap-1.5
                           shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                           active:translate-x-0.5 active:translate-y-0.5 active:shadow-none
                           transition-all disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Undo
              </button>
            </div>
          )}

          {/* Times Made + Last Made */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 whitespace-nowrap">
                Times Made
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={timesMadeInput}
                onChange={(e) => setTimesMadeInput(e.target.value)}
                onBlur={handleTimesMadeBlur}
                className="w-16 border-2 border-black rounded-lg px-2 py-1 text-sm font-bold
                           text-center bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            {item.lastMadeDate && (
              <span className="text-xs text-black/40 font-medium">
                {formatLastMade(item.lastMadeDate)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Form fields ───────────────────────────────────────────────────────── */}
      <div className="flex-1 px-4 py-5 flex flex-col gap-4">
        <Field
          label="Item Name"
          value={form.name}
          onChange={patch("name") as (v: string) => void}
          placeholder="e.g. Passport, Tax Return 2024…"
        />

        {/* Category */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Category</label>
          <div className="relative">
            <select
              value={form.category}
              onChange={(e) => patch("category")(e.target.value)}
              className="w-full appearance-none border-2 border-black rounded-lg px-3 py-2 pr-8
                         text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-primary
                         cursor-pointer"
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-black/40" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Value / Amount"
            value={form.purchasePrice}
            onChange={patch("purchasePrice") as (v: string) => void}
            placeholder="$49.99"
          />
          <Field
            label="Date / Year"
            value={form.purchaseDate}
            onChange={patch("purchaseDate") as (v: string) => void}
            placeholder="e.g. 2024, Jan 2025…"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => patch("notes")(e.target.value)}
            placeholder="Anything worth remembering…"
            rows={3}
            className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm font-medium
                       bg-white focus:outline-none focus:ring-2 focus:ring-primary resize-none
                       placeholder:font-normal placeholder:text-black/25"
          />
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <div
        className="sticky bottom-0 px-4 py-4 bg-white border-t-2 border-black flex-shrink-0 flex flex-col gap-2"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        <AnimatePresence>
          {dirty && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onClick={handleSave}
              disabled={updateItem.isPending}
              className="w-full btn-brutalist py-3 rounded-xl flex items-center justify-center gap-2 text-sm"
            >
              <Save className="w-4 h-4" />
              {updateItem.isPending ? "Saving…" : "Save Changes"}
            </motion.button>
          )}
        </AnimatePresence>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm
                       font-bold uppercase border-2 border-black/20 text-black/35
                       hover:border-red-500 hover:text-red-600 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Delete from Cabinet Forever
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-3 rounded-xl text-sm font-bold uppercase border-2 border-black bg-white
                         shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                         active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteItem.isPending}
              className="flex-1 py-3 rounded-xl text-sm font-bold uppercase border-2 border-red-600
                         bg-red-500 text-white shadow-[2px_2px_0px_0px_rgba(185,28,28,1)]
                         active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all
                         disabled:opacity-50"
            >
              {deleteItem.isPending ? "Deleting…" : "Yes, Delete Forever"}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
