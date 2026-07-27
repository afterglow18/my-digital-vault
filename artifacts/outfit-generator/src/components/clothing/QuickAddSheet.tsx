/**
 * QuickAddSheet
 *
 * Upload flow:
 *   pick ──(file chosen)──► uploading ──► close
 *
 * Users pick a photo from their camera or photo library.
 * Photos are saved directly to IndexedDB as compressed data URLs.
 */
import React, { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { useCreateClothingItem, getListClothingQueryKey } from "@/hooks/useLocalWardrobe";
import type { ClothingItem } from "@/types/local";
import { useQueryClient } from "@tanstack/react-query";
import { encodeToPng } from "@/lib/processImage";

// ── Types ──────────────────────────────────────────────────────────────────────

type Category = "documents" | "finances" | "personal" | "recipes-meal-plans";

const CATEGORY_LABELS: Record<Category, string> = {
  "documents":          "Documents",
  "finances":           "Finances",
  "personal":           "Personal",
  "recipes-meal-plans": "Recipes + Meal Plans",
};

type Phase = "pick" | "uploading";

interface UploadProgress { done: number; total: number; }

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Compress a Blob to a JPEG data URL capped at 800 px wide. */
async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 800 / img.naturalWidth);
      canvas.width  = Math.round(img.naturalWidth  * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  category:      Category;
  existingCount: number;
  /** Called with the newly created item after a successful save. */
  onCreated?:    (item: ClothingItem) => void;
}

const PHOTO_TIPS: Record<Category, readonly string[]> = {
  "documents": [
    "📄 Photograph one page or document at a time.",
    "📑 Lay the document flat on a plain background.",
    "📷 Take the photo from directly above.",
    "✅ Keep the entire page fully in frame.",
  ],
  "finances": [
    "📄 Photograph one page or document at a time.",
    "📑 Lay the document flat on a plain background.",
    "📷 Take the photo from directly above.",
    "✅ Keep the entire page fully in frame.",
  ],
  "personal": [
    "🖼️ Photograph one item or keepsake at a time.",
    "🪞 Lay it flat on a plain, uncluttered background.",
    "📷 Take the photo from directly above.",
    "✅ Keep the entire item fully in frame.",
  ],
  "recipes-meal-plans": [
    "📖 Photograph one recipe or page at a time.",
    "📑 Lay it flat on a plain, uncluttered surface.",
    "📷 Take the photo from directly above.",
    "✅ Keep all text fully in frame.",
  ],
};

export function QuickAddSheet({ open, onOpenChange, category, existingCount, onCreated }: Props) {
  const [phase,    setPhase]    = useState<Phase>("pick");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  const cameraInputRef  = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const createItem  = useCreateClothingItem();
  const queryClient = useQueryClient();

  const handleClose = useCallback(() => {
    setPhase("pick");
    setErrorMsg(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleFile = useCallback(async (file: File, countOffset = 0): Promise<boolean> => {
    let png: Blob;
    try {
      png = await encodeToPng(file);
    } catch (err) {
      console.error("PNG encoding failed:", err);
      return false;
    }

    try {
      const dataUrl = await blobToDataUrl(png);
      const label    = CATEGORY_LABELS[category];
      const n        = existingCount + countOffset + 1;
      const autoName = n === 1 ? label : `${label} ${n}`;

      await new Promise<void>((resolve, reject) => {
        createItem.mutate(
          { data: { name: autoName, category, imageObjectPath: dataUrl } },
          {
            onSuccess: (createdItem) => {
              queryClient.invalidateQueries({ queryKey: getListClothingQueryKey() });
              if (onCreated) onCreated(createdItem);
              resolve();
            },
            onError: reject,
          },
        );
      });
      return true;
    } catch (err) {
      console.error("Save failed:", err);
      return false;
    }
  }, [category, existingCount, createItem, queryClient, onCreated]);

  const handleFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setErrorMsg(null);
    setPhase("uploading");
    setProgress({ done: 0, total: files.length });

    let saved = 0;
    for (let i = 0; i < files.length; i++) {
      const ok = await handleFile(files[i], i);
      if (ok) saved++;
      setProgress({ done: i + 1, total: files.length });
    }

    if (saved === 0) {
      setErrorMsg("Could not save the photos. Please try again.");
      setPhase("pick");
      setProgress(null);
    } else {
      handleClose();
      setProgress(null);
    }
  }, [handleFile, handleClose]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) handleFiles(files);
    e.target.value = "";
  };

  if (!open) return null;

  const label = CATEGORY_LABELS[category];

  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 240 }}
      className="fixed inset-0 z-[70] flex flex-col max-w-md mx-auto bg-[#f9f4ee]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-3 bg-white border-b-2 border-black flex-shrink-0"
        style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
        <h2 className="font-display font-bold text-xl uppercase tracking-tight">
          Add {label}
        </h2>
        {phase === "pick" && (
          <button
            onClick={handleClose}
            className="w-9 h-9 border-2 border-black rounded-full flex items-center justify-center
                       bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                       active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Body — plain conditionals, no AnimatePresence around phases.
           AnimatePresence mode="wait" creates a window where neither phase is
           mounted (old exits, new hasn't entered), causing a blank screen. */}
      <div className="flex-1 flex flex-col overflow-y-auto">

          {/* ── PICK ── */}
          {phase === "pick" && (
            <div className="flex flex-col p-5 gap-5">
              {errorMsg && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
                  {errorMsg}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 flex flex-col items-center justify-center gap-3 py-8
                             border-4 border-black rounded-2xl
                             shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]
                             active:translate-x-1 active:translate-y-1 active:shadow-none
                             transition-all"
                  style={{ background: "linear-gradient(to bottom, #8a8a8a, #666666)" }}
                >
                  <span className="text-4xl leading-none">📷</span>
                  <span className="font-display font-bold text-base uppercase tracking-tight text-center leading-tight">
                    Take<br />Photo
                  </span>
                </button>

                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex-1 flex flex-col items-center justify-center gap-3 py-8
                             border-4 border-black rounded-2xl bg-white
                             shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]
                             active:translate-x-1 active:translate-y-1 active:shadow-none
                             transition-all"
                >
                  <span className="text-4xl leading-none">🖼️</span>
                  <span className="font-display font-bold text-base uppercase tracking-tight text-center leading-tight">
                    Upload<br />Photo
                  </span>
                </button>
              </div>

              <div className="border-2 border-black rounded-2xl bg-white p-4
                              shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <p className="font-display font-bold text-sm uppercase tracking-tight mb-3">
                  PHOTO TIPS
                </p>
                <ul className="flex flex-col gap-2">
                  {PHOTO_TIPS[category].map((tip) => (
                    <li key={tip} className="text-sm text-black/70 leading-snug">
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* ── UPLOADING ── */}
          {phase === "uploading" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 p-6">
              <div className="w-28 h-28 border-4 border-black rounded-3xl bg-white
                              flex items-center justify-center
                              shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <Loader2 className="w-12 h-12 animate-spin" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="font-display font-bold text-2xl uppercase tracking-tight">Saving…</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {progress && progress.total > 1
                    ? `${progress.done} of ${progress.total} photos added.`
                    : "Adding to your cabinet."}
                </p>
              </div>
            </div>
          )}

      </div>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleInputChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />
    </motion.div>
  );
}
