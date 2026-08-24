import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  format,
  addDays,
  subDays,
  isToday,
  startOfToday,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Utensils,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ClothingItem, DinnerPlan, DinnerPlanInput } from "@/types/local";

export interface DinnerPlannerProps {
  plans?: DinnerPlan[];
  recipes?: ClothingItem[];
  isLoading?: boolean;
  isSaving?: boolean;
  error?: string | null;
  onSavePlan?: (data: DinnerPlanInput) => void;
  onDeletePlan?: (id: string) => void;
}

const toDateString = (date: Date) => format(date, "yyyy-MM-dd");

function PlanForm({
  date,
  recipes,
  initialRecipeName = "",
  initialRecipeItemId = null,
  initialNotes = "",
  isSaving = false,
  onSave,
  onCancel,
}: {
  date: string;
  recipes: ClothingItem[];
  initialRecipeName?: string;
  initialRecipeItemId?: string | null;
  initialNotes?: string;
  isSaving?: boolean;
  onSave: (data: DinnerPlanInput) => void;
  onCancel: () => void;
}) {
  const [recipeName, setRecipeName] = useState(initialRecipeName);
  const [recipeItemId, setRecipeItemId] = useState(initialRecipeItemId ?? "");
  const [notes, setNotes] = useState(initialNotes);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Slight delay to ensure animation completes before focusing to prevent layout jump
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeName.trim()) return;
    onSave({
      date,
      recipeName: recipeName.trim(),
      recipeItemId: recipeItemId || null,
      notes: notes.trim() || null,
    });
  };

  return (
    <motion.form
      key="form"
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      onSubmit={handleSubmit}
      className="flex-1 bg-[#FFF9E6] border-2 border-black rounded-xl p-3 md:p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-3 relative z-10"
    >
      <select
        value={recipeItemId}
        onChange={(e) => {
          const selectedId = e.target.value;
          setRecipeItemId(selectedId);
          if (selectedId) {
            setRecipeName(recipes.find((recipe) => recipe.id === selectedId)?.name ?? "");
          } else {
            setRecipeName("");
          }
        }}
        className="w-full font-bold text-sm bg-white border-2 border-black rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-black"
      >
        <option value="">Custom dinner</option>
        {recipes.map((recipe) => (
          <option key={recipe.id} value={recipe.id}>{recipe.name || "Untitled recipe"}</option>
        ))}
      </select>
      <input
        ref={inputRef}
        value={recipeName}
        onChange={(e) => setRecipeName(e.target.value)}
        placeholder="Dinner name..."
        maxLength={100}
        disabled={Boolean(recipeItemId)}
        className="w-full font-display font-bold text-lg md:text-xl uppercase bg-white border-2 border-black rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-black placeholder:text-black/25 transition-shadow disabled:bg-black/5 disabled:text-black/60"
      />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes or recipe details (optional)..."
        rows={2}
        maxLength={300}
        className="w-full text-sm font-medium bg-white border-2 border-black rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-black resize-none placeholder:text-black/25 transition-shadow"
      />
      <div className="flex justify-end gap-2 mt-1">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 px-4 py-2 border-2 border-black rounded-lg bg-white font-bold text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!recipeName.trim() || isSaving}
          className="min-h-11 px-6 py-2 border-2 border-black rounded-lg bg-[#4A5D23] text-white font-bold text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Saving…" : "Save Dinner"}
        </button>
      </div>
    </motion.form>
  );
}

export default function DinnerPlanner({
  plans = [],
  recipes = [],
  isLoading = false,
  isSaving = false,
  error = null,
  onSavePlan,
  onDeletePlan,
}: DinnerPlannerProps) {
  const today = useMemo(() => startOfToday(), []);
  const [windowStart, setWindowStart] = useState(() => subDays(today, 2));

  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const todayRef = useRef<HTMLDivElement>(null);

  const days = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => addDays(windowStart, i));
  }, [windowStart]);

  const plansByDate = useMemo(() => {
    const map = new Map<string, DinnerPlan>();
    plans.forEach((p) => map.set(p.date, p));
    return map;
  }, [plans]);

  const handlePrevWindow = () => setWindowStart((prev) => subDays(prev, 30));
  const handleNextWindow = () => setWindowStart((prev) => addDays(prev, 30));
  const handleGoToToday = () => {
    setWindowStart(subDays(today, 2));
    setTimeout(() => {
      todayRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const handleSaveAdd = (data: DinnerPlanInput) => {
    onSavePlan?.(data);
    setEditingDate(null);
  };

  const handleSaveEdit = (data: DinnerPlanInput) => {
    onSavePlan?.(data);
    setEditingPlanId(null);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5 animate-pulse w-full max-w-2xl mx-auto">
        <div className="h-16 bg-black/10 rounded-xl border-2 border-black/20" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="w-12 md:w-16 h-16 bg-black/10 rounded-lg border-2 border-black/20 shrink-0" />
            <div className="flex-1 h-24 bg-black/10 rounded-xl border-2 border-black/20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col">
      {/* Header / Window Navigation */}
      <div className="sticky top-0 z-20 pb-4 mb-4 pt-2 bg-background/80 backdrop-blur-xl -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex items-center justify-between bg-[#2C302E] text-white border-2 border-black rounded-xl p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <button
            onClick={handlePrevWindow}
            className="w-11 h-11 flex items-center justify-center border-2 border-white/20 rounded-lg hover:bg-white hover:text-black transition-colors active:translate-y-0.5 active:translate-x-0.5"
            aria-label="Previous 30 days"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center justify-center min-w-0 px-2">
            <div className="flex items-center gap-2">
              <Utensils className="w-4 h-4 text-[#FFD966] shrink-0" />
              <span className="font-display font-bold text-base md:text-lg uppercase tracking-tight truncate">
                {format(days[0], "MMM d")} - {format(days[days.length - 1], "MMM d")}
              </span>
            </div>
            <button
              onClick={handleGoToToday}
              className="min-h-11 px-3 text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/60 hover:text-[#FFD966] transition-colors mt-0.5 active:scale-95"
            >
              Return to Today
            </button>
          </div>

          <button
            onClick={handleNextWindow}
            className="w-11 h-11 flex items-center justify-center border-2 border-white/20 rounded-lg hover:bg-white hover:text-black transition-colors active:translate-y-0.5 active:translate-x-0.5"
            aria-label="Next 30 days"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border-2 border-red-500 bg-red-50 px-3 py-2 text-center text-xs font-bold text-red-700">
          {error}
        </p>
      )}

      {/* Calendar List */}
      <div className="relative flex flex-col gap-4 md:gap-6 pb-12">
        {/* Timeline dotted line */}
        <div className="absolute top-4 bottom-4 left-[23px] md:left-[31px] w-0 border-l-2 border-dashed border-black/20 z-0" />

        {days.map((date) => {
          const dateStr = toDateString(date);
          const plan = plansByDate.get(dateStr);
          const isEditingThisNew = editingDate === dateStr;
          const isEditingThisExisting = plan && editingPlanId === plan.id;
          const isTodayDate = isToday(date);
          const isPast = date < today && !isTodayDate;

          return (
            <div
              key={dateStr}
              ref={isTodayDate ? todayRef : null}
              className="flex gap-3 md:gap-5 group relative z-10"
            >
              {/* Date Column */}
              <div className="w-12 md:w-16 flex flex-col items-center shrink-0">
                <div
                  className={`w-full aspect-[3/4] flex flex-col items-center justify-center border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-colors ${
                    isTodayDate
                      ? "bg-[#FFD966] text-black"
                      : isPast
                      ? "bg-[#F2F2F2] text-black/40 border-black/20 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]"
                      : "bg-white text-black"
                  }`}
                >
                  <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest leading-none mt-1">
                    {format(date, "EEE")}
                  </span>
                  <span className="text-xl md:text-2xl font-display font-bold leading-none mt-1">
                    {format(date, "d")}
                  </span>
                </div>
                {isTodayDate && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#4A5D23] mt-2 bg-background px-1 rounded-sm">
                    Today
                  </span>
                )}
              </div>

              {/* Content Column */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  {isEditingThisNew ? (
                    <PlanForm
                      key="form-new"
                      date={dateStr}
                      recipes={recipes}
                      isSaving={isSaving}
                      onSave={handleSaveAdd}
                      onCancel={() => setEditingDate(null)}
                    />
                  ) : isEditingThisExisting ? (
                    <PlanForm
                      key="form-edit"
                      date={dateStr}
                      recipes={recipes}
                      initialRecipeName={plan.recipeName}
                      initialRecipeItemId={plan.recipeItemId}
                      initialNotes={plan.notes || ""}
                      isSaving={isSaving}
                      onSave={handleSaveEdit}
                      onCancel={() => setEditingPlanId(null)}
                    />
                  ) : plan ? (
                    <motion.div
                      key="card"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className={`bg-white border-2 border-black rounded-xl p-3 md:p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-2 relative group/card ${
                        isPast ? "opacity-75 grayscale-[20%]" : ""
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-display font-bold text-lg md:text-xl uppercase leading-tight break-words mt-1">
                          {plan.recipeName}
                        </h4>

                        {/* Actions */}
                        <div className="flex gap-1 shrink-0 opacity-100 md:opacity-0 md:group-hover/card:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingPlanId(plan.id)}
                            className="w-11 h-11 flex items-center justify-center border-2 border-black rounded-full bg-white hover:bg-[#FFD966] transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                            aria-label="Edit plan"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(plan.id)}
                            className="w-11 h-11 flex items-center justify-center border-2 border-black rounded-full bg-white hover:bg-destructive hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                            aria-label="Delete plan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {plan.notes && (
                        <p className="text-sm font-medium text-black/70 bg-black/5 p-2.5 rounded-lg border border-black/10 whitespace-pre-wrap leading-snug">
                          {plan.notes}
                        </p>
                      )}
                      {deleteConfirmId === plan.id && (
                        <div className="mt-1 flex items-center justify-between gap-2 rounded-lg border-2 border-red-500 bg-red-50 p-2">
                          <span className="text-xs font-bold text-red-700">Remove this dinner?</span>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="min-h-11 px-2.5 py-1.5 border-2 border-black rounded-md bg-white text-[10px] font-bold uppercase"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                onDeletePlan?.(plan.id);
                                setDeleteConfirmId(null);
                              }}
                              className="min-h-11 px-2.5 py-1.5 border-2 border-red-700 rounded-md bg-red-600 text-white text-[10px] font-bold uppercase"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.button
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => setEditingDate(dateStr)}
                      className={`w-full h-full min-h-[4.5rem] border-2 border-dashed rounded-xl flex items-center justify-center transition-all group/btn ${
                        isPast
                          ? "border-black/15 bg-transparent text-black/30 hover:bg-black/5 hover:border-black/30"
                          : "border-black/25 bg-black/5 text-black/40 hover:bg-black/10 hover:border-black/50 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
                      }`}
                    >
                      <Plus
                        className={`w-5 h-5 mr-1 transition-transform group-hover/btn:scale-110 ${
                          isPast ? "opacity-50" : ""
                        }`}
                      />
                      <span className="text-xs font-bold uppercase tracking-widest">
                        Add Dinner
                      </span>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
