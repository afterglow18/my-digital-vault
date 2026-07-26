import React, { useCallback, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { ClothingCategory } from "@/types/local";
import { ImagePlus, Loader2, Check, RotateCcw } from "lucide-react";
import { getImageUrl } from "@/lib/utils";
import { removeBackground, blobToDataUrl, dataUrlToBlob } from "@/lib/backgroundRemoval";

const CATEGORIES: ClothingCategory[] = ["documents", "finances", "personal", "recipes-meal-plans"];

const formSchema = z.object({
  name:            z.string().min(1, "Name is required"),
  category:        z.enum(["documents", "finances", "personal", "recipes-meal-plans"]),
  color:           z.string().optional(),
  brand:           z.string().optional(),
  notes:           z.string().optional(),
  isFavorite:      z.boolean().default(false),
  imageObjectPath: z.string().optional().nullable(),
});

export type ClothingFormData = z.infer<typeof formSchema>;

interface ClothingFormProps {
  initialData?:  Partial<ClothingFormData>;
  onSubmit:      (data: ClothingFormData) => void;
  isSubmitting:  boolean;
  submitLabel:   string;
}

// Outside component — no re-creation on each render
async function encodeForUpload(input: File | Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(input);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX   = 2048;
      const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
      const w     = Math.round(img.naturalWidth  * scale);
      const h     = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (b) => (b && b.size > 1000 ? resolve(b) : reject(new Error("blank image"))),
        "image/jpeg", 0.85,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("failed to load image")); };
    img.src = objectUrl;
  });
}

type UploadPhase = "idle" | "encoding" | "preview" | "saving";

export function ClothingForm({ initialData, onSubmit, isSubmitting, submitLabel }: ClothingFormProps) {
  const form = useForm<ClothingFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name:            initialData?.name            || "",
      category:        initialData?.category        || "documents",
      color:           initialData?.color           || "",
      brand:           initialData?.brand           || "",
      notes:           initialData?.notes           || "",
      isFavorite:      initialData?.isFavorite      || false,
      imageObjectPath: initialData?.imageObjectPath || null,
    },
  });

  const [uploadPhase,  setUploadPhase]  = useState<UploadPhase>("idle");
  const [originalUrl,  setOriginalUrl]  = useState<string | null>(null);
  const [cleanedUrl,   setCleanedUrl]   = useState<string | null>(null);
  const [cleanedBlob,  setCleanedBlob]  = useState<Blob | null>(null);
  const [originalBlob, setOriginalBlob] = useState<Blob | null>(null);
  const [bgProcessing, setBgProcessing] = useState(false);
  const [bgFailed,     setBgFailed]     = useState(false);
  const [selected,     setSelected]     = useState<"original" | "cleaned">("original");
  const bgGenRef = useRef(0);

  const resetPhotoState = useCallback(() => {
    bgGenRef.current += 1;
    setBgProcessing(false);
    setUploadPhase("idle");
    setOriginalUrl(null);
    setCleanedUrl(null);
    setCleanedBlob(null);
    setOriginalBlob(null);
    setBgFailed(false);
    setSelected("original");
  }, []);

  const handleFile = useCallback(async (file: File) => {
    const myGen = ++bgGenRef.current;
    setOriginalUrl(null); setCleanedUrl(null);
    setCleanedBlob(null); setOriginalBlob(null);
    setBgFailed(false); setBgProcessing(false); setSelected("original");
    setUploadPhase("encoding");

    let jpeg: Blob;
    try {
      jpeg = await encodeForUpload(file);
    } catch {
      if (bgGenRef.current !== myGen) return;
      setUploadPhase("idle");
      return;
    }
    if (bgGenRef.current !== myGen) return;

    setOriginalBlob(jpeg);
    setOriginalUrl(URL.createObjectURL(jpeg));
    setUploadPhase("preview");
    setBgProcessing(true);

    try {
      const dataUrl    = await blobToDataUrl(jpeg);
      if (bgGenRef.current !== myGen) return;
      const resultUrl  = await removeBackground(dataUrl);
      if (bgGenRef.current !== myGen) return;
      const resultBlob   = await dataUrlToBlob(resultUrl);
      const resultObjUrl = URL.createObjectURL(resultBlob);
      if (bgGenRef.current !== myGen) { URL.revokeObjectURL(resultObjUrl); return; }
      setCleanedBlob(resultBlob);
      setCleanedUrl(resultObjUrl);
      setSelected("cleaned");
    } catch (err) {
      if (bgGenRef.current !== myGen) return;
      console.warn("Background removal failed:", err);
      setBgFailed(true);
    } finally {
      if (bgGenRef.current === myGen) setBgProcessing(false);
    }
  }, []);

  const confirmPhoto = useCallback(async () => {
    const blob = selected === "cleaned" && cleanedBlob ? cleanedBlob : originalBlob;
    if (!blob) return;
    const dataUrl = await blobToDataUrl(blob);
    form.setValue("imageObjectPath", dataUrl);
    resetPhotoState();
  }, [selected, cleanedBlob, originalBlob, form, resetPhotoState]);

  const imagePath = form.watch("imageObjectPath");
  const GREY_GRAD  = "linear-gradient(to bottom, #8a8a8a, #666666)";
  const BORDER_ACT = "4px solid #111";
  const BORDER_DIM = "4px solid rgba(0,0,0,0.18)";

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">

      {/* ── Image Upload Area ─────────────────────────────────────────────── */}
      <div className="relative">

        {/* Idle / existing image */}
        {uploadPhase === "idle" && (
          <div className="aspect-[4/3] w-full border-4 border-dashed border-black bg-muted flex items-center justify-center relative overflow-hidden">
            {imagePath ? (
              <img src={getImageUrl(imagePath)!} alt="Upload preview" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center flex flex-col items-center p-4">
                <div className="w-16 h-16 bg-white border-2 border-black rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center mb-4">
                  <ImagePlus className="w-8 h-8" />
                </div>
                <span className="font-bold uppercase text-muted-foreground">Upload Photo</span>
                <span className="text-xs text-black/40 mt-1">Background removed automatically ✨</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>
        )}

        {/* Encoding spinner */}
        {uploadPhase === "encoding" && (
          <div className="aspect-[4/3] w-full border-4 border-dashed border-black bg-muted flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-10 h-10 animate-spin" strokeWidth={1.5} />
            <p className="font-bold uppercase text-sm">Processing…</p>
          </div>
        )}

        {/* Preview — side-by-side comparison */}
        {uploadPhase === "preview" && (
          <div className="flex flex-col gap-3">
            <p className="text-center text-[11px] font-bold uppercase tracking-widest opacity-40">
              {bgProcessing ? "Removing background…" : bgFailed ? "Background removal unavailable" : "Tap to choose"}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              {/* Original */}
              <button type="button" onClick={() => setSelected("original")}
                style={{ flex: 1, border: selected === "original" ? BORDER_ACT : BORDER_DIM,
                         opacity: selected === "original" ? 1 : 0.55,
                         borderRadius: 12, overflow: "hidden", padding: 0, background: "none", cursor: "pointer" }}>
                <div style={{ background: "#111", minHeight: 120, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img src={originalUrl!} alt="Original" style={{ width: "100%", objectFit: "contain", maxHeight: 120, display: "block" }} />
                  {selected === "original" && (
                    <div style={{ position: "absolute", top: 5, right: 5, width: 20, height: 20, borderRadius: "50%", background: "black", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Check size={12} color="white" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <p style={{ textAlign: "center", fontWeight: 800, fontSize: 10, textTransform: "uppercase", padding: "5px 0", margin: 0, background: "white" }}>Original</p>
              </button>
              {/* Cleaned */}
              <button type="button" onClick={() => cleanedUrl && setSelected("cleaned")} disabled={!cleanedUrl}
                style={{ flex: 1, border: selected === "cleaned" && cleanedUrl ? BORDER_ACT : BORDER_DIM,
                         opacity: selected === "cleaned" && cleanedUrl ? 1 : 0.55,
                         borderRadius: 12, overflow: "hidden", padding: 0, background: "none", cursor: cleanedUrl ? "pointer" : "default" }}>
                <div style={{ background: "repeating-conic-gradient(#d1d5db 0% 25%, white 0% 50%) 0 0 / 10px 10px",
                              minHeight: 120, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {cleanedUrl ? (
                    <>
                      <img src={cleanedUrl} alt="Cleaned" style={{ width: "100%", objectFit: "contain", maxHeight: 120, display: "block" }} />
                      {selected === "cleaned" && (
                        <div style={{ position: "absolute", top: 5, right: 5, width: 20, height: 20, borderRadius: "50%", background: "black", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Check size={12} color="white" strokeWidth={3} />
                        </div>
                      )}
                    </>
                  ) : bgFailed ? (
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", opacity: 0.4, textAlign: "center", padding: "0 8px", margin: 0 }}>Unavailable</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <Loader2 size={24} style={{ opacity: 0.5 }} className="animate-spin" />
                    </div>
                  )}
                </div>
                <p style={{ textAlign: "center", fontWeight: 800, fontSize: 10, textTransform: "uppercase", padding: "5px 0", margin: 0, background: "white" }}>Cleaned ✨</p>
              </button>
            </div>
            {/* Confirm / retake */}
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={resetPhotoState}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border-2 border-black bg-white font-bold uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                style={{ flex: "0 0 auto" }}>
                <RotateCcw className="w-3.5 h-3.5" /> Retake
              </button>
              <button type="button" onClick={confirmPhoto} disabled={bgProcessing}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border-2 border-black font-black uppercase text-xs text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50"
                style={{ background: bgProcessing ? "#888" : GREY_GRAD }}>
                {bgProcessing
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing…</>
                  : <><Check className="w-3.5 h-3.5" /> Use this photo</>}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Form Fields ───────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <label className="block font-bold uppercase text-sm mb-1">Item Name *</label>
          <input
            {...form.register("name")}
            placeholder="e.g. Charlotte Tilbury Flawless Filter"
            className="w-full px-4 py-3 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-y-0.5 focus:translate-x-0.5 outline-none transition-all font-medium"
          />
          {form.formState.errors.name && (
            <span className="text-destructive text-sm font-bold mt-1 block">{form.formState.errors.name.message}</span>
          )}
        </div>

        <div>
          <label className="block font-bold uppercase text-sm mb-2">Category *</label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((cat) => (
              <label key={cat} className="cursor-pointer">
                <input type="radio" value={cat} {...form.register("category")} className="sr-only peer" />
                <div className="px-2 py-3 text-center border-2 border-black bg-white peer-checked:bg-secondary font-bold text-xs uppercase tracking-tight transition-colors">
                  {cat}
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-bold uppercase text-sm mb-1">Color</label>
            <input {...form.register("color")} placeholder="Rose Gold" className="w-full px-3 py-2 bg-white border-2 border-black focus:bg-accent outline-none font-medium" />
          </div>
          <div>
            <label className="block font-bold uppercase text-sm mb-1">Brand</label>
            <input {...form.register("brand")} placeholder="e.g. NARS" className="w-full px-3 py-2 bg-white border-2 border-black focus:bg-accent outline-none font-medium" />
          </div>
        </div>

        <div>
          <label className="block font-bold uppercase text-sm mb-1">Notes</label>
          <textarea {...form.register("notes")} placeholder="Anything worth remembering..." rows={3} className="w-full px-3 py-2 bg-white border-2 border-black focus:bg-accent outline-none font-medium resize-none" />
        </div>

        <label className="flex items-center gap-3 p-4 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer">
          <input
            type="checkbox"
            {...form.register("isFavorite")}
            className="w-6 h-6 border-2 border-black appearance-none checked:bg-primary checked:after:content-['★'] checked:after:text-black checked:after:flex checked:after:items-center checked:after:justify-center checked:after:h-full checked:after:text-sm transition-colors"
          />
          <span className="font-bold uppercase tracking-wider">Mark as Favorite</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || uploadPhase === "preview"}
        className="btn-brutalist py-4 rounded-xl w-full text-lg mt-4 disabled:opacity-50"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> saving...
          </span>
        ) : submitLabel}
      </button>
    </form>
  );
}
