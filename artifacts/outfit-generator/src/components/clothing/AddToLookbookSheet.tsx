/**
 * AddToLookbookSheet — bottom sheet for adding/removing an item from lookbooks.
 *
 * Shows all saved groups with a 3-thumbnail row preview and a filled checkmark
 * on groups that already contain this item. Tapping a row toggles membership.
 */
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";
import type { ClothingItem, SavedOutfit } from "@/types/local";
import {
  useListOutfits,
  useAddItemToOutfit,
  useRemoveItemFromOutfit,
  getListOutfitsQueryKey,
} from "@/hooks/useLocalOutfits";
import { useQueryClient } from "@tanstack/react-query";
import { getImageUrl } from "@/lib/utils";

interface Props {
  item: ClothingItem;
  onClose: () => void;
}

function ThumbRow({ outfit }: { outfit: SavedOutfit }) {
  const thumbs = (outfit.items ?? []).slice(0, 3);
  return (
    <div className="flex gap-1">
      {Array.from({ length: 3 }).map((_, i) => {
        const it = thumbs[i];
        return (
          <div
            key={i}
            className="w-10 h-10 border border-black/20 rounded overflow-hidden flex-shrink-0"
            style={{ background: "#f2f2f2" }}
          >
            {it?.imageObjectPath ? (
              <img
                src={getImageUrl(it.imageObjectPath)!}
                alt={it.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-[8px] text-black/20">—</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AddToLookbookSheet({ item, onClose }: Props) {
  const { data: outfits, isLoading } = useListOutfits();
  const addItem    = useAddItemToOutfit();
  const removeItem = useRemoveItemFromOutfit();
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListOutfitsQueryKey() });

  const toggle = (outfit: SavedOutfit) => {
    const inGroup = (outfit.itemIds ?? []).includes(item.id);
    if (inGroup) {
      removeItem.mutate(
        { id: outfit.id, itemId: item.id },
        { onSuccess: invalidate },
      );
    } else {
      addItem.mutate(
        { id: outfit.id, data: { itemId: item.id } },
        { onSuccess: invalidate },
      );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[80] flex flex-col justify-end"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 240 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#f9f4ee] border-t-2 border-black rounded-t-2xl overflow-hidden"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)", maxHeight: "70vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black bg-white">
          <h2 className="font-display font-bold text-lg uppercase tracking-tight">
            Add to Lookbook
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 border-2 border-black rounded-full flex items-center justify-center
                       bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                       active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(70vh - 60px)" }}>
          {isLoading ? (
            <div className="p-6 text-center text-sm text-black/40 font-medium">Loading…</div>
          ) : !outfits || outfits.length === 0 ? (
            <div className="p-6 text-center text-sm text-black/40 font-medium">
              No lookbooks yet. Save a group from your cabinet first.
            </div>
          ) : (
            outfits.map((outfit) => {
              const inGroup = (outfit.itemIds ?? []).includes(item.id);
              return (
                <button
                  key={outfit.id}
                  onClick={() => toggle(outfit)}
                  className="w-full flex items-center gap-3 px-4 py-3 border-b border-black/10
                             hover:bg-black/5 active:bg-black/10 transition-colors text-left"
                >
                  <ThumbRow outfit={outfit} />
                  <span className="flex-1 font-bold text-sm uppercase tracking-tight truncate">
                    {outfit.name}
                  </span>
                  <div
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={
                      inGroup
                        ? { background: "linear-gradient(to bottom, #8a8a8a, #666666)", borderColor: "#555" }
                        : { background: "white", borderColor: "rgba(0,0,0,0.2)" }
                    }
                  >
                    {inGroup && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
