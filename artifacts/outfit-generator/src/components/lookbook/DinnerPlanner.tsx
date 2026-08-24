import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  format,
  getDay,
  isToday,
  parseISO,
  startOfToday,
  startOfWeek,
  subDays,
} from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { ClothingItem, DinnerPlan, DinnerPlanInput } from "@/types/local";
import { getImageUrl } from "@/lib/utils";

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

function DinnerPickerSheet({
  date,
  plan,
  recipes,
  customEditor,
  isSaving,
  onClose,
  onPickRecipe,
  onSaveCustom,
  onOpenCustom,
  onDelete,
}: {
  date: string;
  plan?: DinnerPlan;
  recipes: ClothingItem[];
  customEditor: boolean;
  isSaving: boolean;
  onClose: () => void;
  onPickRecipe: (recipe: ClothingItem) => void;
  onSaveCustom: (name: string, notes: string) => void;
  onOpenCustom: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(plan && !plan.recipeItemId ? plan.recipeName : "");
  const [notes, setNotes] = useState(plan?.notes ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const getFocusable = () => Array.from(
      sheetRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])',
      ) ?? [],
    );
    const focusable = getFocusable();
    (customEditor ? nameRef.current : focusable[0])?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const elements = getFocusable();
      if (elements.length === 0) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [customEditor, onClose]);

  const titleDate = format(parseISO(date), "EEEE, MMMM d");

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/35"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.section
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dinner-picker-title"
        className="w-full max-w-md rounded-t-[24px] border-2 border-black bg-white shadow-[0_-5px_0px_0px_rgba(0,0,0,1)]"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        onClick={(event) => event.stopPropagation()}
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-black px-5 pb-4 pt-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/45">
              Plan dinner for
            </p>
            <h2 id="dinner-picker-title" className="mt-1 font-display text-2xl font-bold leading-none">
              {titleDate}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dinner picker"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-black bg-[#F2F2F2] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {customEditor ? (
          <form
            className="flex flex-col gap-3 p-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (name.trim()) onSaveCustom(name, notes);
            }}
          >
            <p className="text-xs font-bold uppercase tracking-widest text-black/50">
              Custom dinner
            </p>
            <input
              ref={nameRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Dinner name"
              maxLength={100}
              className="min-h-11 w-full rounded-lg border-2 border-black bg-[#FFF9E6] px-3 font-display text-lg font-bold uppercase outline-none focus:ring-2 focus:ring-black"
            />
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Notes or recipe details (optional)"
              rows={3}
              maxLength={300}
              className="w-full resize-none rounded-lg border-2 border-black bg-white px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-black"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 flex-1 rounded-lg border-2 border-black bg-white px-3 text-xs font-bold uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || isSaving}
                className="min-h-11 flex-1 rounded-lg border-2 border-black bg-[#4A5D23] px-3 text-xs font-bold uppercase tracking-wider text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save Dinner"}
              </button>
            </div>
            {plan && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="min-h-11 self-center px-3 text-xs font-bold uppercase tracking-wider text-red-700"
              >
                Delete this dinner
              </button>
            )}
          </form>
        ) : (
          <>
            <div className="max-h-[48vh] overflow-y-auto px-5 py-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-black/45">
                Your recipe + meal plan photos
              </p>
              {recipes.length > 0 ? (
                <div className="divide-y-2 divide-black/10">
                  {recipes.map((recipe) => {
                    const selected = plan?.recipeItemId === recipe.id;
                    return (
                      <button
                        type="button"
                        key={recipe.id}
                        disabled={isSaving}
                        onClick={() => onPickRecipe(recipe)}
                        className="flex min-h-[76px] w-full items-center gap-3 py-2 text-left transition-colors active:bg-[#FFF9E6] disabled:opacity-60"
                      >
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 border-black bg-[#FDECEF]">
                          {recipe.imageObjectPath ? (
                            <img
                              src={getImageUrl(recipe.imageObjectPath) ?? undefined}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[9px] font-bold uppercase text-black/30">
                              No photo
                            </div>
                          )}
                        </div>
                        <span className="min-w-0 flex-1 truncate font-display text-lg font-bold uppercase">
                          {recipe.name || "Untitled recipe"}
                        </span>
                        {selected && (
                          <span className="rounded-full border-2 border-black bg-[#FFD966] px-2 py-1 text-[9px] font-bold uppercase">
                            Planned
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-black/25 bg-black/5 px-4 py-6 text-center text-sm font-medium text-black/55">
                  No recipe or meal plan uploads yet.
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 border-t-2 border-black bg-[#FFF9E6] p-5">
              <button
                type="button"
                onClick={onOpenCustom}
                className="min-h-11 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-black bg-white px-3 text-xs font-bold uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <Plus className="h-4 w-4" />
                {plan?.recipeItemId
                  ? "Use a custom dinner"
                  : plan
                  ? "Edit custom dinner"
                  : "Add custom dinner"}
              </button>
              {plan && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="min-h-11 flex w-full items-center justify-center gap-2 rounded-lg px-3 text-xs font-bold uppercase tracking-wider text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete planned dinner
                </button>
              )}
            </div>
          </>
        )}

        {confirmDelete && (
          <div className="mx-5 mb-4 flex items-center justify-between gap-3 rounded-lg border-2 border-red-500 bg-red-50 p-3">
            <span className="text-xs font-bold text-red-700">Remove this dinner?</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="min-h-11 rounded-md border-2 border-black bg-white px-3 text-[10px] font-bold uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={isSaving}
                className="min-h-11 rounded-md border-2 border-red-700 bg-red-600 px-3 text-[10px] font-bold uppercase text-white disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </motion.section>
    </motion.div>
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
  const [windowStart, setWindowStart] = useState(() => startOfWeek(today, { weekStartsOn: 0 }));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [customEditor, setCustomEditor] = useState(false);
  const dateOpenerRef = useRef<HTMLButtonElement | null>(null);

  const days = useMemo(
    () => Array.from({ length: 30 }, (_, index) => addDays(windowStart, index)),
    [windowStart],
  );
  const gridCells = useMemo(() => {
    const leadingBlanks = Array.from({ length: getDay(windowStart) }, () => null);
    const trailingCount = (7 - ((leadingBlanks.length + days.length) % 7)) % 7;
    return [
      ...leadingBlanks,
      ...days,
      ...Array.from({ length: trailingCount }, () => null),
    ];
  }, [days, windowStart]);

  const plansByDate = useMemo(() => {
    const result = new Map<string, DinnerPlan>();
    plans.forEach((plan) => result.set(plan.date, plan));
    return result;
  }, [plans]);

  const selectedPlan = selectedDate ? plansByDate.get(selectedDate) : undefined;

  const closePicker = () => {
    setSelectedDate(null);
    setCustomEditor(false);
    window.setTimeout(() => dateOpenerRef.current?.focus(), 0);
  };

  const openDate = (date: Date, opener: HTMLButtonElement) => {
    const dateString = toDateString(date);
    const existing = plansByDate.get(dateString);
    dateOpenerRef.current = opener;
    setSelectedDate(dateString);
    setCustomEditor(Boolean(existing && !existing.recipeItemId));
  };

  const handlePickRecipe = (recipe: ClothingItem) => {
    if (!selectedDate) return;
    onSavePlan?.({
      date: selectedDate,
      recipeItemId: recipe.id,
      recipeName: recipe.name.trim() || "Untitled recipe",
      notes: selectedPlan?.notes ?? null,
    });
    closePicker();
  };

  const handleSaveCustom = (name: string, notes: string) => {
    if (!selectedDate) return;
    onSavePlan?.({
      date: selectedDate,
      recipeItemId: null,
      recipeName: name.trim(),
      notes: notes.trim() || null,
    });
    closePicker();
  };

  const handleDelete = () => {
    if (!selectedPlan) return;
    onDeletePlan?.(selectedPlan.id);
    closePicker();
  };

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-md animate-pulse flex-col gap-4">
        <div className="h-[430px] rounded-[18px] border-2 border-black/20 bg-black/10" />
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto w-full max-w-md">
        <section className="rounded-[18px] border-2 border-black bg-white p-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold uppercase tracking-tight">30-Day Planner</h2>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-black/45">
                Tap a day to plan your dinner
              </p>
            </div>
            <CalendarDays className="mt-1 h-7 w-7 shrink-0" strokeWidth={1.7} />
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setWindowStart((current) => subDays(current, 30))}
              aria-label="Previous 30 days"
              className="flex h-11 w-11 items-center justify-center rounded-lg border-2 border-black bg-white active:translate-x-0.5 active:translate-y-0.5"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-center">
              <p className="font-display text-sm font-bold uppercase">
                {format(days[0], "MMM d")} – {format(days[days.length - 1], "MMM d")}
              </p>
              <button
                type="button"
                onClick={() => setWindowStart(startOfWeek(today, { weekStartsOn: 0 }))}
                className="min-h-11 px-3 text-[10px] font-bold uppercase tracking-widest text-[#4A5D23]"
              >
                Return to Today
              </button>
            </div>
            <button
              type="button"
              onClick={() => setWindowStart((current) => addDays(current, 30))}
              aria-label="Next 30 days"
              className="flex h-11 w-11 items-center justify-center rounded-lg border-2 border-black bg-white active:translate-x-0.5 active:translate-y-0.5"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1.5">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
              <span
                key={`${day}-${index}`}
                className="pb-1 text-center text-[10px] font-bold uppercase tracking-widest text-black/45"
              >
                {day}
              </span>
            ))}
            {gridCells.map((date, index) => {
              if (!date) return <span key={`blank-${index}`} aria-hidden="true" />;

              const dateString = toDateString(date);
              const plan = plansByDate.get(dateString);
              const current = isToday(date);
              const past = date < today && !current;

              return (
                <motion.button
                  type="button"
                  key={dateString}
                  whileTap={{ scale: 0.96 }}
                  onClick={(event) => openDate(date, event.currentTarget)}
                  aria-label={`${format(date, "EEEE, MMMM d")}${plan ? `, ${plan.recipeName}` : ", Add Dinner"}`}
                  className={`relative flex aspect-[0.82] min-h-[54px] flex-col items-start justify-between rounded-[10px] border-2 p-1.5 text-left transition-colors after:absolute after:-inset-1 after:content-[''] ${
                    current
                      ? "border-black bg-[#FFD966]"
                      : past
                      ? "border-black/15 bg-[#F2F2F2] text-black/40"
                      : plan
                      ? "border-black bg-[#FDECEF]"
                      : "border-black/20 bg-white hover:bg-[#FFF9E6]"
                  }`}
                >
                  <span className="text-[11px] font-bold leading-none">{format(date, "d")}</span>
                  {plan ? (
                    <span className="line-clamp-2 w-full pr-0.5 text-[9px] font-bold uppercase leading-[1.05]">
                      {plan.recipeName}
                    </span>
                  ) : (
                    <Plus className="absolute bottom-1 right-1 h-3 w-3 text-black/30" />
                  )}
                  {current && (
                    <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-bold uppercase tracking-widest text-[#4A5D23]">
                      Today
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          <div className="mt-7 flex items-center justify-center gap-4 text-[10px] font-bold uppercase tracking-wider text-black/45">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 border-2 border-black bg-[#FFD966]" />
              Today
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 border-2 border-black bg-[#FDECEF]" />
              Planned
            </span>
          </div>
        </section>
      </div>

      {error && (
        <p className="mx-auto mt-4 w-full max-w-md rounded-xl border-2 border-red-500 bg-red-50 px-3 py-2 text-center text-xs font-bold text-red-700">
          {error}
        </p>
      )}

      <AnimatePresence>
        {selectedDate && (
          <DinnerPickerSheet
            date={selectedDate}
            plan={selectedPlan}
            recipes={recipes}
            customEditor={customEditor}
            isSaving={isSaving}
            onClose={closePicker}
            onPickRecipe={handlePickRecipe}
            onSaveCustom={handleSaveCustom}
            onOpenCustom={() => setCustomEditor(true)}
            onDelete={handleDelete}
          />
        )}
      </AnimatePresence>
    </>
  );
}