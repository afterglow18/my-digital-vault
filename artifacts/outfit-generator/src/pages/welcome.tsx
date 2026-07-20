/**
 * WelcomePage — Filing cabinet drawer pull-open animation.
 *
 * SPLASH  : closed 3-drawer filing cabinet with "tap to open" hint.
 * PULLING : middle drawer slides forward/down (out toward viewer).
 * OPEN    : hanging file folders fan in inside the cavity.
 * HERO    : hero image crossfades in.
 * EXITING : whole screen fades out → onEnter().
 */

import { useState, useCallback, useRef } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";

type Phase = "splash" | "pulling" | "open" | "hero" | "exiting";

const PULL_MS = 720;
const HOLD_MS = 450;
const HERO_MS = 500;
const EXIT_MS = 500;

interface Props { onEnter: () => void; }

export default function WelcomePage({ onEnter }: Props) {
  const [phase,          setPhase]          = useState<Phase>("splash");
  const [foldersVisible, setFoldersVisible] = useState(false);
  const [heroVisible,    setHeroVisible]    = useState(false);
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

    // 1. Middle drawer slides forward (down the screen = toward viewer)
    drawerCtrl.start({
      y: 82,
      transition: { duration: PULL_MS / 1000, ease: [0.22, 0.1, 0.22, 1] },
    });

    // 2. File folders materialise inside cavity partway through the pull
    setTimeout(() => {
      setFoldersVisible(true);
      setPhase("open");
    }, PULL_MS * 0.42);

    // 3. Hero image fades in after drawer is fully out
    setTimeout(() => setHeroVisible(true), PULL_MS + 130);
    setTimeout(() => setPhase("hero"),     PULL_MS + 260);

    // 4. Exit
    setTimeout(() => setPhase("exiting"), PULL_MS + HOLD_MS + 200);
    setTimeout(finish,                    PULL_MS + HOLD_MS + 200 + EXIT_MS);
  };

  return (
    <motion.div
      animate={{ opacity: phase === "exiting" ? 0 : 1 }}
      transition={{ duration: EXIT_MS / 1000, ease: "easeIn" }}
      onClick={phase === "splash" ? handleTap : undefined}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "#0e0e0e",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: phase === "splash" ? "pointer" : "default",
        overflow: "hidden",
      }}
    >
      {/* Ambient silver glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        background:
          "radial-gradient(ellipse 60% 45% at 50% 46%, rgba(150,150,170,0.14) 0%, transparent 70%)",
      }} />

      {/* Hero image — fades in after drawer opens */}
      <motion.img
        src="/vault-door.png"
        alt="My Digital Filing Cabinet"
        draggable={false}
        animate={{ opacity: heroVisible ? 1 : 0 }}
        transition={{ duration: HERO_MS / 1000, ease: "easeOut" }}
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", objectPosition: "center", zIndex: 1,
        }}
      />

      {/* Cabinet + branding */}
      <div style={{
        position: "relative", zIndex: 2,
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        <FilingCabinet drawerCtrl={drawerCtrl} foldersVisible={foldersVisible} />

        {/* Branding */}
        <div style={{ marginTop: 22, textAlign: "center" }}>
          <div style={{
            fontFamily: "'Great Vibes', cursive",
            fontWeight: 400,
            fontSize: "clamp(34px, 9.5vw, 50px)",
            color: "#e8e8e8",
            textShadow: "0 0 28px rgba(220,220,220,0.5), 0 2px 10px rgba(0,0,0,0.95)",
            lineHeight: 1.15,
          }}>
            My Digital<br />Filing Cabinet
          </div>
          <div style={{
            fontSize: 10, fontWeight: 500,
            letterSpacing: "0.28em", textTransform: "uppercase",
            color: "rgba(200,200,210,0.38)", marginTop: 8,
          }}>
            your collection, secured
          </div>

          <AnimatePresence>
            {phase === "splash" && (
              <motion.div
                key="tap-hint"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ delay: 0.9, duration: 0.5 }}
                style={{
                  fontSize: 10, letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "rgba(200,200,210,0.45)", marginTop: 20,
                }}
              >
                tap to open
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: "fixed",
        bottom: "calc(env(safe-area-inset-bottom) + 10px)",
        left: 0, right: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 4, zIndex: 210,
      }}>
        <a
          href="https://classy-alpaca-441.notion.site/Privacy-Policy-39682db6065380b19dedcb108d4a0ef4"
          target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.2)", textDecoration: "none", letterSpacing: "0.02em" }}
        >
          Privacy Policy
        </a>
        <a
          href="https://app.notion.com/p/My-Digital-Closet-Support-39782db60653802a9088dcbae84c0527?source=copy_link"
          target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.2)", textDecoration: "none", letterSpacing: "0.02em" }}
        >
          Support
        </a>
      </div>
    </motion.div>
  );
}

// ── Filing Cabinet SVG ────────────────────────────────────────────────────────

const VW = 210;
const VH = 300;

// Cabinet body
const CAB = { x: 12, y: 10, w: 186, h: 268 };

// Vertical zones
const TOP_H  = 30;   // brand plate
const FOOT_H = 18;   // base / feet

// Drawer area
const DRAW_Y = CAB.y + TOP_H;
const DRAW_H_TOTAL = CAB.h - TOP_H - FOOT_H;  // 220

// 3 drawers
const N_DRAWERS = 3;
const DGAP = 5;
const DH   = Math.floor((DRAW_H_TOTAL - DGAP * (N_DRAWERS - 1)) / N_DRAWERS);  // ≈ 70

// Drawer horizontal bounds (inset from cabinet sides)
const DX = CAB.x + 7;
const DW = CAB.w - 14;

// Drawer Y positions
const DRAWER_YS = Array.from({ length: N_DRAWERS }, (_, i) =>
  DRAW_Y + i * (DH + DGAP),
);

const OPEN_IDX = 1;   // middle drawer opens
const OPEN_DY  = DRAWER_YS[OPEN_IDX];

// Hanging-file folder palette
const FOLDERS = [
  { body: "#7a9e87", tab: "#4e7a60" },
  { body: "#c8a96e", tab: "#a07838" },
  { body: "#8a9abf", tab: "#5a6a9f" },
  { body: "#b98a8a", tab: "#8a5a5a" },
  { body: "#a89870", tab: "#7a6a40" },
];

function FilingCabinet({
  drawerCtrl,
  foldersVisible,
}: {
  drawerCtrl: ReturnType<typeof useAnimation>;
  foldersVisible: boolean;
}) {
  return (
    <svg
      width={VW}
      height={VH}
      viewBox={`0 0 ${VW} ${VH}`}
      fill="none"
      style={{ overflow: "visible", filter: "drop-shadow(0 18px 52px rgba(0,0,0,0.92)) drop-shadow(0 2px 8px rgba(160,160,180,0.1))" }}
    >
      <defs>
        <linearGradient id="cabBody" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#545454" />
          <stop offset="30%"  stopColor="#424242" />
          <stop offset="75%"  stopColor="#383838" />
          <stop offset="100%" stopColor="#282828" />
        </linearGradient>

        <linearGradient id="cabTop" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#4c4c4c" />
          <stop offset="50%"  stopColor="#3c3c3c" />
          <stop offset="100%" stopColor="#2c2c2c" />
        </linearGradient>

        <linearGradient id="drwFace" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#5a5a5a" />
          <stop offset="25%"  stopColor="#4c4c4c" />
          <stop offset="75%"  stopColor="#424242" />
          <stop offset="100%" stopColor="#323232" />
        </linearGradient>

        <linearGradient id="drwFaceOpen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#545454" />
          <stop offset="100%" stopColor="#3c3c3c" />
        </linearGradient>

        <linearGradient id="interior" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#1c1c1c" />
          <stop offset="100%" stopColor="#101010" />
        </linearGradient>

        <linearGradient id="handle" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#b0b0b0" />
          <stop offset="35%"  stopColor="#d8d8d8" />
          <stop offset="100%" stopColor="#747474" />
        </linearGradient>

        <linearGradient id="cabBase" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#383838" />
          <stop offset="50%"  stopColor="#2e2e2e" />
          <stop offset="100%" stopColor="#222222" />
        </linearGradient>

        {/* Clip to keep folder content inside cavity */}
        <clipPath id="cavClip">
          <rect x={DX} y={OPEN_DY} width={DW} height={DH} />
        </clipPath>
      </defs>

      {/* ── Outer drop-shadow recess ── */}
      <rect
        x={CAB.x - 3} y={CAB.y - 3}
        width={CAB.w + 6} height={CAB.h + 6}
        rx={5} fill="#080808"
      />

      {/* ── Cabinet body ── */}
      <rect x={CAB.x} y={CAB.y} width={CAB.w} height={CAB.h} rx={3}
        fill="url(#cabBody)" />

      {/* Left highlight edge */}
      <rect x={CAB.x} y={CAB.y} width={3} height={CAB.h} rx={1}
        fill="rgba(255,255,255,0.09)" />
      {/* Top highlight edge */}
      <rect x={CAB.x} y={CAB.y} width={CAB.w} height={2}
        fill="rgba(255,255,255,0.13)" />
      {/* Right shadow edge */}
      <rect x={CAB.x + CAB.w - 5} y={CAB.y} width={5} height={CAB.h}
        fill="rgba(0,0,0,0.28)" />

      {/* ── Top brand plate ── */}
      <rect x={CAB.x} y={CAB.y} width={CAB.w} height={TOP_H} rx={3}
        fill="url(#cabTop)" />
      {/* Divider line below brand plate */}
      <rect x={CAB.x} y={CAB.y + TOP_H - 2} width={CAB.w} height={3}
        fill="rgba(0,0,0,0.5)" />
      {/* Label recessed card */}
      <rect x={CAB.x + 18} y={CAB.y + 7} width={CAB.w - 36} height={16} rx={2}
        fill="rgba(0,0,0,0.38)" stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
      {/* Brand-plate rivets */}
      {[CAB.x + 9, CAB.x + CAB.w - 9].map((rx, i) => (
        <circle key={i} cx={rx} cy={CAB.y + TOP_H / 2} r={3.5}
          fill="rgba(80,80,80,1)" stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
      ))}

      {/* ── Drawer cavity interior (always rendered, revealed when drawer slides out) ── */}
      <rect x={DX} y={OPEN_DY} width={DW} height={DH} fill="url(#interior)" />
      {/* Cavity inner shadows */}
      <rect x={DX}           y={OPEN_DY} width={DW}  height={10} fill="rgba(0,0,0,0.55)" />
      <rect x={DX}           y={OPEN_DY} width={5}   height={DH} fill="rgba(0,0,0,0.32)" />
      <rect x={DX + DW - 5}  y={OPEN_DY} width={5}   height={DH} fill="rgba(0,0,0,0.42)" />
      {/* Hanging rod across top of cavity */}
      <rect x={DX + 4} y={OPEN_DY + 9} width={DW - 8} height={4} rx={2}
        fill="rgba(120,120,120,0.35)" />

      {/* ── Hanging file folders (clipped to cavity) ── */}
      <g clipPath="url(#cavClip)">
        {FOLDERS.map((fc, i) => {
          const n       = FOLDERS.length;
          const fw      = Math.floor((DW - 6) / n);
          const fx      = DX + 3 + i * fw;
          const tabW    = Math.floor(fw * 0.62);
          const tabH    = 14;
          // Stagger tab positions left/right alternately
          const tabXOff = i % 2 === 0 ? 2 : fw - tabW - 2;
          const tabX    = fx + tabXOff;
          const bodyY   = OPEN_DY + tabH - 1;
          const bodyH   = DH - tabH + 1;

          return foldersVisible ? (
            <motion.g
              key={i}
              initial={{ opacity: 0, y: 9 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.065, duration: 0.28, ease: "easeOut" }}
            >
              {/* Folder body */}
              <rect x={fx + 1} y={bodyY} width={fw - 2} height={bodyH}
                fill={fc.body} opacity={0.82} rx={1} />
              {/* Folder left edge sheen */}
              <rect x={fx + 1} y={bodyY} width={1.5} height={bodyH}
                fill="rgba(255,255,255,0.18)" />
              {/* Folder body bottom shadow */}
              <rect x={fx + 1} y={bodyY + bodyH - 3} width={fw - 2} height={3}
                fill="rgba(0,0,0,0.25)" />
              {/* Tab */}
              <rect x={tabX} y={OPEN_DY} width={tabW} height={tabH} rx={2}
                fill={fc.tab} />
              {/* Tab top sheen */}
              <rect x={tabX + 1} y={OPEN_DY + 1} width={tabW - 2} height={2} rx={1}
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
            <DrawerFace
              x={DX} y={dy} w={DW} h={DH}
              gradId="drwFace"
              handleGradId="handle"
            />
            {/* Gap below drawer */}
            {i < N_DRAWERS - 1 && (
              <rect x={DX} y={dy + DH} width={DW} height={DGAP}
                fill="rgba(0,0,0,0.32)" />
            )}
          </g>
        );
      })}

      {/* ── Opening drawer (middle) — slides out on tap ── */}
      <motion.g animate={drawerCtrl}>
        {/* Extended drawer side shadows deepen as it comes out */}
        <rect x={DX - 3} y={OPEN_DY} width={3} height={DH + 82}
          fill="rgba(0,0,0,0.22)" />
        <rect x={DX + DW} y={OPEN_DY} width={3} height={DH + 82}
          fill="rgba(0,0,0,0.30)" />
        {/* Bottom of extended drawer underside shadow */}
        <rect x={DX} y={OPEN_DY + DH} width={DW} height={6}
          fill="rgba(0,0,0,0.5)" />

        <DrawerFace
          x={DX} y={OPEN_DY} w={DW} h={DH}
          gradId="drwFaceOpen"
          handleGradId="handle"
          prominent
        />
      </motion.g>

      {/* Gap between drawer 1 and open drawer slot */}
      <rect x={DX} y={DRAWER_YS[0] + DH} width={DW} height={DGAP}
        fill="rgba(0,0,0,0.32)" />

      {/* ── Base plate ── */}
      <rect x={CAB.x} y={CAB.y + CAB.h - FOOT_H} width={CAB.w} height={FOOT_H}
        rx={3} fill="url(#cabBase)" />
      <rect x={CAB.x} y={CAB.y + CAB.h - FOOT_H} width={CAB.w} height={2}
        fill="rgba(0,0,0,0.45)" />

      {/* Cabinet feet */}
      {[CAB.x + 14, CAB.x + CAB.w - 34].map((fx, i) => (
        <g key={i}>
          <rect x={fx} y={CAB.y + CAB.h - 2} width={20} height={8} rx={2}
            fill="#252525" stroke="rgba(0,0,0,0.5)" strokeWidth={1} />
          <rect x={fx + 2} y={CAB.y + CAB.h - 2} width={16} height={2} rx={1}
            fill="rgba(255,255,255,0.05)" />
        </g>
      ))}
    </svg>
  );
}

// ── Shared drawer face element ────────────────────────────────────────────────

function DrawerFace({
  x, y, w, h,
  gradId, handleGradId,
  prominent = false,
}: {
  x: number; y: number; w: number; h: number;
  gradId: string; handleGradId: string;
  prominent?: boolean;
}) {
  const labelW = w - 56;

  return (
    <>
      {/* Face plate */}
      <rect x={x} y={y} width={w} height={h} rx={2}
        fill={`url(#${gradId})`} />

      {/* Top edge highlight */}
      <rect x={x} y={y} width={w} height={1.5}
        fill="rgba(255,255,255,0.13)" />

      {/* Bottom shadow line */}
      <rect x={x} y={y + h - 2} width={w} height={2}
        fill="rgba(0,0,0,0.45)" />

      {/* Inset side shadows */}
      <rect x={x}         y={y} width={3} height={h} fill="rgba(0,0,0,0.18)" />
      <rect x={x + w - 3} y={y} width={3} height={h} fill="rgba(0,0,0,0.28)" />

      {/* Label holder */}
      <rect x={x + 10} y={y + 9} width={labelW} height={17} rx={2}
        fill="rgba(0,0,0,0.38)" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      {/* Simulated label lines */}
      <rect x={x + 14} y={y + 14} width={labelW - 8} height={2} rx={1}
        fill="rgba(255,255,255,0.08)" />
      <rect x={x + 14} y={y + 19} width={Math.floor((labelW - 8) * 0.6)} height={2} rx={1}
        fill="rgba(255,255,255,0.05)" />

      {/* Pull handle recess */}
      <rect x={x + w - 46} y={y + h / 2 - (prominent ? 8 : 7)} width={36} height={prominent ? 16 : 13} rx={3}
        fill="#222" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
      {/* Pull handle chrome bar */}
      <rect x={x + w - 42} y={y + h / 2 - (prominent ? 5 : 4)} width={28} height={prominent ? 9 : 7} rx={2}
        fill={`url(#${handleGradId})`} />
      {/* Handle top sheen */}
      <rect x={x + w - 42} y={y + h / 2 - (prominent ? 5 : 4)} width={28} height={2} rx={1}
        fill="rgba(255,255,255,0.3)" />
    </>
  );
}
