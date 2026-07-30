/**
 * WelcomePage — Full-screen filing cabinet drawer pull-open animation.
 *
 * The cabinet SVG fills the entire screen. Tapping "Open" slides the middle
 * drawer out, reveals hanging file folders, then fades the whole screen to
 * the app. The hero image is shown in HeroSplash (Phase 1) — it does NOT
 * appear here again.
 *
 * SPLASH  : full-screen closed cabinet + branding + Open button.
 * PULLING : middle drawer slides out.
 * OPEN    : hanging folders fan in inside cavity.
 * EXITING : screen fades out → onEnter().
 */

import { useState, useCallback, useRef } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";

type Phase = "splash" | "pulling" | "open" | "exiting";

const PULL_MS = 740;
const HOLD_MS = 420;
const EXIT_MS = 500;

// ViewBox dimensions — matches a typical modern iPhone aspect ratio.
// SVG is stretched to fill the screen with preserveAspectRatio="xMidYMid slice".
const VBW = 390;
const VBH = 844;

// Cabinet fills the viewBox completely.
const CAB = { x: 0, y: 0, w: VBW, h: VBH };

// Vertical zones
const TOP_H  = 130;  // brand plate / logo area at top
const BASE_H =  44;  // base strip at bottom

// Drawer section
const DRAW_Y = TOP_H;
const DRAW_H_TOTAL = VBH - TOP_H - BASE_H; // 670
const N_D   = 3;
const DGAP  = 5;
const DH    = Math.floor((DRAW_H_TOTAL - DGAP * (N_D - 1)) / N_D); // ≈ 220

// Drawer X bounds — slight inset from cabinet edges
const DX = 8;
const DW = VBW - 16;

// Drawer Y positions (absolute SVG coordinates)
const DRAWER_YS = Array.from({ length: N_D }, (_, i) =>
  DRAW_Y + i * (DH + DGAP),
);
const OPEN_IDX = 1;   // middle drawer opens
const OPEN_DY  = DRAWER_YS[OPEN_IDX];

// Hanging-file folder palette
const FOLDERS = [
  { body: "#e8dcc8", tab: "#c8b898" },
  { body: "#e8dcc8", tab: "#c8b898" },
  { body: "#e8dcc8", tab: "#c8b898" },
  { body: "#e8dcc8", tab: "#c8b898" },
  { body: "#e8dcc8", tab: "#c8b898" },
  { body: "#e8dcc8", tab: "#c8b898" },
];

interface Props { onEnter: () => void; }

export default function WelcomePage({ onEnter }: Props) {
  const [phase,          setPhase]          = useState<Phase>("splash");
  const [foldersVisible, setFoldersVisible] = useState(false);
  const calledRef  = useRef(false);
  const drawerCtrl = useAnimation();

  const finish = useCallback(() => {
    if (calledRef.current) return;
    calledRef.current = true;
    onEnter();
  }, [onEnter]);

  const handleTap = async () => {
    if (phase !== "splash") return;
    setPhase("pulling");

    // Drawer slides forward (down the screen = toward viewer).
    drawerCtrl.start({
      y: 300,
      transition: { duration: PULL_MS / 1000, ease: [0.22, 0.1, 0.22, 1] },
    });

    // Folders appear midway through the pull
    setTimeout(() => {
      setFoldersVisible(true);
      setPhase("open");
    }, PULL_MS * 0.40);

    // Exit — no hero image here; it was already shown in HeroSplash (Phase 1)
    setTimeout(() => setPhase("exiting"), PULL_MS + HOLD_MS);
    setTimeout(finish,                    PULL_MS + HOLD_MS + EXIT_MS);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: phase === "exiting" ? 0 : 1 }}
      transition={{ duration: phase === "exiting" ? EXIT_MS / 1000 : 0.5, ease: "easeIn" }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "#1a1a1a",
        overflow: "hidden",
      }}
    >
      {/* ── Full-screen cabinet SVG ── */}
      <svg
        viewBox={`0 0 ${VBW} ${VBH}`}
        preserveAspectRatio="xMidYMid slice"
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          zIndex: 2, overflow: "visible",
        }}
      >
        <CabinetDefs />

        {/* ── Cabinet body ── */}
        <rect x={CAB.x} y={CAB.y} width={CAB.w} height={CAB.h}
          fill="url(#cabBody)" />

        {/* Left edge highlight */}
        <rect x={0} y={0} width={5} height={VBH}
          fill="rgba(255,255,255,0.07)" />
        {/* Right edge shadow */}
        <rect x={VBW - 6} y={0} width={6} height={VBH}
          fill="rgba(0,0,0,0.28)" />

        {/* ── Top brand plate ── */}
        <rect x={0} y={0} width={VBW} height={TOP_H}
          fill="url(#topPlate)" />
        {/* Bottom edge of brand plate */}
        <rect x={0} y={TOP_H - 3} width={VBW} height={4}
          fill="rgba(0,0,0,0.55)" />
        {/* Brand plate highlight */}
        <rect x={0} y={0} width={VBW} height={2}
          fill="rgba(255,255,255,0.1)" />
        {/* Decorative rivets */}
        {[22, VBW - 22].map((cx, i) => (
          <g key={i}>
            <circle cx={cx} cy={TOP_H / 2} r={7}
              fill="#2e2e2e" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} />
            <circle cx={cx} cy={TOP_H / 2} r={3.5}
              fill="rgba(255,255,255,0.1)" />
          </g>
        ))}

        {/* ── Drawer cavity interior (revealed when drawer slides out) ── */}
        <rect x={DX} y={OPEN_DY} width={DW} height={DH}
          fill="url(#cavityInterior)" />
        {/* Cavity shadows */}
        <rect x={DX}          y={OPEN_DY} width={DW}  height={16}
          fill="rgba(0,0,0,0.6)" />
        <rect x={DX}          y={OPEN_DY} width={8}   height={DH}
          fill="rgba(0,0,0,0.3)" />
        <rect x={DX + DW - 8} y={OPEN_DY} width={8}   height={DH}
          fill="rgba(0,0,0,0.4)" />
        {/* Hanging rod */}
        <rect x={DX + 12} y={OPEN_DY + 14} width={DW - 24} height={6} rx={3}
          fill="rgba(140,140,140,0.3)" />

        {/* ── Hanging folders (clipped to cavity) ── */}
        <clipPath id="cavClip">
          <rect x={DX} y={OPEN_DY} width={DW} height={DH} />
        </clipPath>
        <g clipPath="url(#cavClip)">
          {FOLDERS.map((fc, i) => {
            const n      = FOLDERS.length;
            const fw     = Math.floor((DW - 10) / n);
            const fx     = DX + 5 + i * fw;
            const tabW   = Math.floor(fw * 0.58);
            const tabH   = 22;
            const tabX   = fx + (i % 2 === 0 ? 3 : fw - tabW - 3);
            const bodyY  = OPEN_DY + tabH - 2;
            const bodyH  = DH - tabH + 2;

            return foldersVisible ? (
              <motion.g
                key={i}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.3, ease: "easeOut" }}
              >
                <rect x={fx + 1} y={bodyY} width={fw - 2} height={bodyH}
                  fill={fc.body} opacity={0.8} rx={1} />
                <rect x={fx + 1} y={bodyY} width={2} height={bodyH}
                  fill="rgba(255,255,255,0.16)" />
                <rect x={fx + 1} y={bodyY + bodyH - 5} width={fw - 2} height={5}
                  fill="rgba(0,0,0,0.22)" />
                <rect x={tabX} y={OPEN_DY} width={tabW} height={tabH} rx={3}
                  fill={fc.tab} />
                <rect x={tabX + 2} y={OPEN_DY + 2} width={tabW - 4} height={3} rx={1}
                  fill="rgba(255,255,255,0.22)" />
              </motion.g>
            ) : null;
          })}
        </g>

        {/* ── Closed drawers (top and bottom) ── */}
        {DRAWER_YS.map((dy, i) => {
          if (i === OPEN_IDX) return null;
          return (
            <g key={i}>
              <ClosedDrawerFace x={DX} y={dy} w={DW} h={DH} />
              {/* Gap shadow below this drawer */}
              <rect x={0} y={dy + DH} width={VBW} height={DGAP}
                fill="rgba(0,0,0,0.38)" />
            </g>
          );
        })}

        {/* Gap above and below the open drawer slot */}
        <rect x={0} y={DRAWER_YS[0] + DH} width={VBW} height={DGAP}
          fill="rgba(0,0,0,0.38)" />
        <rect x={0} y={DRAWER_YS[2] + DH} width={VBW} height={DGAP}
          fill="rgba(0,0,0,0.38)" />

        {/* ── Opening drawer — slides out on tap ── */}
        <motion.g animate={drawerCtrl}>
          {/* Extended drawer side shadows (grow as drawer extends) */}
          <rect x={0}         y={OPEN_DY} width={DX}  height={DH + 300}
            fill="rgba(0,0,0,0.22)" />
          <rect x={DX + DW}   y={OPEN_DY} width={VBW - DX - DW} height={DH + 300}
            fill="rgba(0,0,0,0.28)" />
          {/* Underside shadow below extended drawer face */}
          <rect x={DX} y={OPEN_DY + DH} width={DW} height={12}
            fill="rgba(0,0,0,0.55)" />
          <OpenDrawerFace x={DX} y={OPEN_DY} w={DW} h={DH} />
        </motion.g>

        {/* ── Base strip ── */}
        <rect x={0} y={VBH - BASE_H} width={VBW} height={BASE_H}
          fill="url(#cabBase)" />
        <rect x={0} y={VBH - BASE_H} width={VBW} height={3}
          fill="rgba(0,0,0,0.5)" />
        {/* Feet */}
        {[28, VBW - 68].map((fx, i) => (
          <g key={i}>
            <rect x={fx} y={VBH - 12} width={40} height={12} rx={3}
              fill="#222" stroke="rgba(0,0,0,0.5)" strokeWidth={1} />
            <rect x={fx + 3} y={VBH - 12} width={34} height={3} rx={1}
              fill="rgba(255,255,255,0.05)" />
          </g>
        ))}
      </svg>

      {/* ── Bottom branding + action button + links ── */}
      <div style={{
        position: "fixed",
        bottom: 0, left: 0, right: 0,
        paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)",
        paddingLeft: 28, paddingRight: 28,
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 0,
        zIndex: 10,
        background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.42) 55%, transparent 100%)",
        paddingTop: 40,
        pointerEvents: phase === "splash" ? "auto" : "none",
      }}>
        {/* Branding */}
        <div style={{
          fontSize: 11, fontWeight: 800,
          letterSpacing: "0.28em", textTransform: "uppercase",
          color: "rgba(220,225,240,0.72)",
          textShadow: "0 1px 6px rgba(0,0,0,0.7)",
          marginBottom: 2,
        }}>
          Welcome to
        </div>
        <div style={{
          fontFamily: "'Great Vibes', cursive",
          fontWeight: 400,
          fontSize: "clamp(32px, 9vw, 46px)",
          color: "#f0f0f0",
          textShadow: "0 2px 12px rgba(0,0,0,0.9), 0 0 28px rgba(200,200,200,0.15)",
          lineHeight: 1.2,
          textAlign: "center",
          marginBottom: 20,
        }}>
          My Digital<br />Filing Cabinet
        </div>

        {/* Primary action button */}
        <button
          onClick={handleTap}
          disabled={phase !== "splash"}
          style={{
            width: "100%",
            padding: "14px 0",
            background: "rgba(255,255,255,0.96)",
            border: "2px solid #000",
            borderRadius: 14,
            boxShadow: "3px 3px 0px 0px rgba(0,0,0,0.85)",
            fontSize: 14, fontWeight: 900,
            letterSpacing: "0.2em", textTransform: "uppercase",
            color: "#1a1a1a",
            cursor: "pointer",
            marginBottom: 18,
            opacity: phase !== "splash" ? 0.4 : 1,
            transition: "opacity 0.2s, box-shadow 0.1s, transform 0.1s",
          }}
        >
          Open
        </button>

        {/* Links */}
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <a
            href="https://classy-alpaca-441.notion.site/Privacy-Policy-39682db6065380b19dedcb108d4a0ef4"
            target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.25)", textDecoration: "none", letterSpacing: "0.02em" }}
          >
            Privacy Policy
          </a>
          <span style={{ color: "rgba(255,255,255,0.12)", fontSize: 10 }}>•</span>
          <a
            href="https://app.notion.com/p/My-Digital-Closet-Support-39782db60653802a9088dcbae84c0527?source=copy_link"
            target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.25)", textDecoration: "none", letterSpacing: "0.02em" }}
          >
            Support
          </a>
        </div>
      </div>
    </motion.div>
  );
}

// ── SVG gradient / filter defs ────────────────────────────────────────────────

function CabinetDefs() {
  return (
    <defs>
      {/* Cabinet body — subtle left-to-right metallic sheen */}
      <linearGradient id="cabBody" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"   stopColor="#525252" />
        <stop offset="20%"  stopColor="#444444" />
        <stop offset="60%"  stopColor="#3c3c3c" />
        <stop offset="100%" stopColor="#2a2a2a" />
      </linearGradient>

      {/* Top brand plate — slightly cooler/darker metallic */}
      <linearGradient id="topPlate" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"   stopColor="#4a4a4a" />
        <stop offset="40%"  stopColor="#3c3c3c" />
        <stop offset="100%" stopColor="#2c2c2c" />
      </linearGradient>

      {/* Drawer face — slightly lighter for depth separation */}
      <linearGradient id="drwFace" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"   stopColor="#5c5c5c" />
        <stop offset="25%"  stopColor="#4e4e4e" />
        <stop offset="75%"  stopColor="#444444" />
        <stop offset="100%" stopColor="#343434" />
      </linearGradient>

      {/* Open drawer — top-to-bottom gradient (face coming toward viewer) */}
      <linearGradient id="drwOpen" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#585858" />
        <stop offset="100%" stopColor="#3e3e3e" />
      </linearGradient>

      {/* Cavity interior */}
      <linearGradient id="cavityInterior" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#1a1a1a" />
        <stop offset="100%" stopColor="#0e0e0e" />
      </linearGradient>

      {/* Pull handle chrome */}
      <linearGradient id="handle" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#b0b0b0" />
        <stop offset="35%"  stopColor="#dedede" />
        <stop offset="100%" stopColor="#727272" />
      </linearGradient>

      {/* Base strip */}
      <linearGradient id="cabBase" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"   stopColor="#363636" />
        <stop offset="50%"  stopColor="#2c2c2c" />
        <stop offset="100%" stopColor="#202020" />
      </linearGradient>
    </defs>
  );
}

// ── Closed drawer face ────────────────────────────────────────────────────────

function ClosedDrawerFace({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const labelW  = w * 0.52;
  const handleW = 130;
  const handleH = 24;
  const handleX = x + (w - handleW) / 2;
  const handleY = y + h / 2 - handleH / 2;

  return (
    <>
      {/* Face plate */}
      <rect x={x} y={y} width={w} height={h} fill="url(#drwFace)" />

      {/* Top highlight */}
      <rect x={x} y={y} width={w} height={2} fill="rgba(255,255,255,0.12)" />
      {/* Bottom shadow */}
      <rect x={x} y={y + h - 3} width={w} height={3} fill="rgba(0,0,0,0.4)" />
      {/* Left/right inset shadows */}
      <rect x={x}         y={y} width={5} height={h} fill="rgba(0,0,0,0.14)" />
      <rect x={x + w - 5} y={y} width={5} height={h} fill="rgba(0,0,0,0.24)" />

      {/* Label holder */}
      <rect x={x + 14} y={y + 16} width={labelW} height={28} rx={3}
        fill="rgba(0,0,0,0.36)" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      {/* Simulated label lines */}
      <rect x={x + 20} y={y + 24} width={labelW - 12} height={3} rx={1.5}
        fill="rgba(255,255,255,0.09)" />
      <rect x={x + 20} y={y + 31} width={(labelW - 12) * 0.6} height={3} rx={1.5}
        fill="rgba(255,255,255,0.06)" />

      {/* Pull handle recess */}
      <rect x={handleX - 6} y={handleY - 4} width={handleW + 12} height={handleH + 8} rx={6}
        fill="#202020" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      {/* Handle chrome bar */}
      <rect x={handleX} y={handleY} width={handleW} height={handleH} rx={4}
        fill="url(#handle)" />
      {/* Handle sheen */}
      <rect x={handleX + 2} y={handleY + 2} width={handleW - 4} height={4} rx={2}
        fill="rgba(255,255,255,0.28)" />
    </>
  );
}

// ── Opening drawer face (slightly more prominent) ─────────────────────────────

function OpenDrawerFace({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const labelW  = w * 0.52;
  const handleW = 140;
  const handleH = 28;
  const handleX = x + (w - handleW) / 2;
  const handleY = y + h / 2 - handleH / 2;

  return (
    <>
      {/* Face plate */}
      <rect x={x} y={y} width={w} height={h} fill="url(#drwOpen)" />

      {/* Top highlight */}
      <rect x={x} y={y} width={w} height={2.5} fill="rgba(255,255,255,0.14)" />
      {/* Bottom shadow */}
      <rect x={x} y={y + h - 4} width={w} height={4} fill="rgba(0,0,0,0.5)" />
      {/* Side insets */}
      <rect x={x}         y={y} width={5} height={h} fill="rgba(0,0,0,0.16)" />
      <rect x={x + w - 5} y={y} width={5} height={h} fill="rgba(0,0,0,0.26)" />

      {/* Label holder */}
      <rect x={x + 14} y={y + 16} width={labelW} height={28} rx={3}
        fill="rgba(0,0,0,0.36)" stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
      <rect x={x + 20} y={y + 24} width={labelW - 12} height={3} rx={1.5}
        fill="rgba(255,255,255,0.1)" />
      <rect x={x + 20} y={y + 31} width={(labelW - 12) * 0.6} height={3} rx={1.5}
        fill="rgba(255,255,255,0.06)" />

      {/* Pull handle recess — more prominent on open drawer */}
      <rect x={handleX - 8} y={handleY - 5} width={handleW + 16} height={handleH + 10} rx={7}
        fill="#1e1e1e" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
      {/* Handle chrome bar */}
      <rect x={handleX} y={handleY} width={handleW} height={handleH} rx={5}
        fill="url(#handle)" />
      {/* Handle top sheen */}
      <rect x={handleX + 2} y={handleY + 2} width={handleW - 4} height={5} rx={2.5}
        fill="rgba(255,255,255,0.32)" />
    </>
  );
}
