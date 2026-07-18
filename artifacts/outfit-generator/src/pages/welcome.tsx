/**
 * WelcomePage — Vault door spin-and-swing-open animation.
 *
 * SPLASH    : closed vault door with combination wheel, "tap to open" hint.
 * SPINNING  : combination wheel spins 2.5 turns (unlocking).
 * OPENING   : vault door swings open via perspective scaleX + translateX.
 * HERO      : hero image crossfades in through the open vault.
 * EXITING   : whole screen fades out → onEnter().
 */

import { useState, useCallback, useRef } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";

type Phase = "splash" | "spinning" | "opening" | "hero" | "exiting";

const SPIN_MS   = 1400;
const OPEN_MS   = 900;
const HERO_MS   = 700;
const HOLD_MS   = 500;
const EXIT_MS   = 700;

const GOLD   = "#c8a96e";
const STEEL  = "#3c3c3c";
const CHROME = "#999";

interface Props { onEnter: () => void; }

export default function WelcomePage({ onEnter }: Props) {
  const [phase,       setPhase]       = useState<Phase>("splash");
  const [heroVisible, setHeroVisible] = useState(false);
  const calledRef    = useRef(false);
  const wheelCtrl    = useAnimation();   // combination wheel rotation
  const doorCtrl     = useAnimation();   // vault door swing open
  const frameCtrl    = useAnimation();   // door frame subtle push

  const finish = useCallback(() => {
    if (calledRef.current) return;
    calledRef.current = true;
    onEnter();
  }, [onEnter]);

  const handleTap = async () => {
    if (phase !== "splash") return;
    setPhase("spinning");

    // 1. Combination wheel spins 2.5 turns
    wheelCtrl.start({
      rotate: 900,
      transition: { duration: SPIN_MS / 1000, ease: [0.2, 0, 0.5, 1] },
    });

    // Frame vibrates slightly as bolts retract
    frameCtrl.start({
      x: [0, -3, 3, -2, 2, 0],
      transition: { duration: 0.5, delay: SPIN_MS / 1000 - 0.1 },
    });

    // 2. Door swings open — perspective illusion via scaleX + translateX
    setTimeout(() => {
      setPhase("opening");
      doorCtrl.start({
        scaleX: 0,
        x: -60,
        opacity: 0,
        transition: { duration: OPEN_MS / 1000, ease: [0.6, 0, 1, 0.8] },
      });
    }, SPIN_MS + 80);

    // 3. Hero fades in as door swings
    setTimeout(() => setHeroVisible(true), SPIN_MS + OPEN_MS * 0.3);
    setTimeout(() => setPhase("hero"),     SPIN_MS + OPEN_MS * 0.7);

    // 4. Exit
    setTimeout(() => setPhase("exiting"), SPIN_MS + OPEN_MS + HOLD_MS);
    setTimeout(finish,                    SPIN_MS + OPEN_MS + HOLD_MS + EXIT_MS);
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
      {/* Ambient radial glow — warm gold from center */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 65% 50% at 50% 52%, rgba(160,120,40,0.22) 0%, transparent 70%)",
      }} />

      {/* Hero image — fades in after door opens */}
      <motion.img
        src="/vault-door.png"
        alt="My Digital Vault"
        draggable={false}
        animate={{ opacity: heroVisible ? 1 : 0 }}
        transition={{ duration: HERO_MS / 1000, ease: "easeOut" }}
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", objectPosition: "center", zIndex: 1,
        }}
      />

      {/* Vault door + branding — swings open */}
      <motion.div
        animate={doorCtrl}
        style={{
          position: "relative", zIndex: 2,
          display: "flex", flexDirection: "column", alignItems: "center",
          transformOrigin: "left center",
        }}
      >
        <motion.div animate={frameCtrl}>
          <VaultDoor wheelCtrl={wheelCtrl} />
        </motion.div>

        {/* Branding */}
        <div style={{ marginTop: 28, textAlign: "center" }}>
          <div style={{
            fontFamily: "'Great Vibes', cursive",
            fontWeight: 400,
            fontSize: "clamp(36px, 10vw, 52px)",
            color: "#e8e8e8",
            textShadow: `0 0 28px rgba(220,220,220,0.5), 0 2px 10px rgba(0,0,0,0.95)`,
            lineHeight: 1.15,
          }}>
            My Digital<br />Vault
          </div>
          <div style={{
            fontSize: 10, fontWeight: 500,
            letterSpacing: "0.28em", textTransform: "uppercase",
            color: "rgba(220,200,160,0.45)", marginTop: 8,
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
                  color: "rgba(200,180,130,0.5)", marginTop: 20,
                }}
              >
                tap to open
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Footer links */}
      <div style={{
        position: "fixed", bottom: "calc(env(safe-area-inset-bottom) + 10px)",
        left: 0, right: 0, display: "flex", flexDirection: "column",
        alignItems: "center", gap: 4, zIndex: 210,
      }}>
        <a href="https://classy-alpaca-441.notion.site/Privacy-Policy-39682db6065380b19dedcb108d4a0ef4"
          target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.2)", textDecoration: "none", letterSpacing: "0.02em" }}>
          Privacy Policy
        </a>
        <a href="https://app.notion.com/p/My-Digital-Closet-Support-39782db60653802a9088dcbae84c0527?source=copy_link"
          target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.2)", textDecoration: "none", letterSpacing: "0.02em" }}>
          Support
        </a>
      </div>
    </motion.div>
  );
}

// ── Vault Door SVG Illustration ───────────────────────────────────────────────

const VW = 260;
const VH = 260;
const CX = VW / 2;
const CY = VH / 2;
const DOOR_R  = 110;   // outer door ring
const INNER_R = 90;    // inner door face
const WHEEL_R = 38;    // combination wheel radius
const BOLT_R  = 7;     // locking bolt circles
const NUM_BOLTS = 8;

function VaultDoor({ wheelCtrl }: { wheelCtrl: ReturnType<typeof useAnimation> }) {
  const bolts = Array.from({ length: NUM_BOLTS }, (_, i) => {
    const angle = (i / NUM_BOLTS) * Math.PI * 2 - Math.PI / 2;
    const r = DOOR_R - 14;
    return { x: CX + Math.cos(angle) * r, y: CY + Math.sin(angle) * r };
  });

  const spokes = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return {
      x1: CX + Math.cos(a) * 10,
      y1: CY + Math.sin(a) * 10,
      x2: CX + Math.cos(a) * (WHEEL_R - 5),
      y2: CY + Math.sin(a) * (WHEEL_R - 5),
    };
  });

  return (
    <svg
      width={VW}
      height={VH}
      viewBox={`0 0 ${VW} ${VH}`}
      fill="none"
      style={{ filter: "drop-shadow(0 12px 40px rgba(0,0,0,0.95)) drop-shadow(0 2px 8px rgba(200,169,110,0.18))" }}
    >
      <defs>
        {/* Door body gradient */}
        <radialGradient id="doorGrad" cx="40%" cy="35%" r="65%">
          <stop offset="0%"   stopColor="#4a4a4a" />
          <stop offset="50%"  stopColor="#2e2e2e" />
          <stop offset="100%" stopColor="#1a1a1a" />
        </radialGradient>

        {/* Door ring gradient */}
        <radialGradient id="ringGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%"   stopColor="#666" />
          <stop offset="60%"  stopColor="#3a3a3a" />
          <stop offset="100%" stopColor="#222" />
        </radialGradient>

        {/* Wheel gradient */}
        <radialGradient id="wheelGrad" cx="40%" cy="35%" r="65%">
          <stop offset="0%"   stopColor="#dab96a" />
          <stop offset="40%"  stopColor="#c8a96e" />
          <stop offset="100%" stopColor="#7a6030" />
        </radialGradient>

        {/* Bolt gradient */}
        <radialGradient id="boltGrad" cx="35%" cy="30%" r="65%">
          <stop offset="0%"   stopColor="#bbb" />
          <stop offset="100%" stopColor="#555" />
        </radialGradient>

        {/* Hinge gradient */}
        <linearGradient id="hingeGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#888" />
          <stop offset="50%"  stopColor="#ccc" />
          <stop offset="100%" stopColor="#666" />
        </linearGradient>
      </defs>

      {/* Outer frame recess shadow */}
      <circle cx={CX} cy={CY} r={DOOR_R + 8} fill="#111" />

      {/* Door outer ring */}
      <circle cx={CX} cy={CY} r={DOOR_R} fill="url(#ringGrad)" />

      {/* Ring inner bevel */}
      <circle cx={CX} cy={CY} r={DOOR_R - 2} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={2} />
      <circle cx={CX} cy={CY} r={DOOR_R - 10} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth={3} />

      {/* Main door face */}
      <circle cx={CX} cy={CY} r={INNER_R} fill="url(#doorGrad)" />

      {/* Rivet bolts around ring */}
      {bolts.map((b, i) => (
        <g key={i}>
          <circle cx={b.x} cy={b.y} r={BOLT_R + 1} fill="rgba(0,0,0,0.5)" />
          <circle cx={b.x} cy={b.y} r={BOLT_R} fill="url(#boltGrad)" />
          <circle cx={b.x - 2} cy={b.y - 2} r={2} fill="rgba(255,255,255,0.25)" />
        </g>
      ))}

      {/* Cross locking bars (horizontal + vertical) */}
      <rect x={CX - INNER_R + 8} y={CY - 5} width={(INNER_R - 8) * 2} height={10} rx={5}
        fill="#1e1e1e" stroke="rgba(120,100,50,0.35)" strokeWidth={1} />
      <rect x={CX - 5} y={CY - INNER_R + 8} width={10} height={(INNER_R - 8) * 2} rx={5}
        fill="#1e1e1e" stroke="rgba(120,100,50,0.35)" strokeWidth={1} />

      {/* Concentric detail rings on door face */}
      <circle cx={CX} cy={CY} r={70} fill="none" stroke="rgba(200,169,110,0.1)" strokeWidth={1} />
      <circle cx={CX} cy={CY} r={52} fill="none" stroke="rgba(200,169,110,0.08)" strokeWidth={1} />

      {/* Combination wheel — rotates on spin */}
      <motion.g animate={wheelCtrl} style={{ originX: `${CX}px`, originY: `${CY}px` }}>
        {/* Wheel body */}
        <circle cx={CX} cy={CY} r={WHEEL_R} fill="url(#wheelGrad)" />
        <circle cx={CX} cy={CY} r={WHEEL_R - 2} fill="none" stroke="rgba(255,230,150,0.2)" strokeWidth={1.5} />

        {/* Notch marks around wheel edge */}
        {Array.from({ length: 20 }, (_, i) => {
          const a = (i / 20) * Math.PI * 2;
          const r1 = WHEEL_R - 3;
          const r2 = WHEEL_R - 7;
          return (
            <line
              key={i}
              x1={CX + Math.cos(a) * r1} y1={CY + Math.sin(a) * r1}
              x2={CX + Math.cos(a) * r2} y2={CY + Math.sin(a) * r2}
              stroke="rgba(0,0,0,0.45)" strokeWidth={i % 5 === 0 ? 2 : 1}
            />
          );
        })}

        {/* Spokes */}
        {spokes.map((s, i) => (
          <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
            stroke="rgba(0,0,0,0.4)" strokeWidth={2} strokeLinecap="round" />
        ))}

        {/* Hub */}
        <circle cx={CX} cy={CY} r={10} fill="#c8a96e" />
        <circle cx={CX} cy={CY} r={7}  fill="#8a6020" />
        <circle cx={CX - 2} cy={CY - 2} r={2.5} fill="rgba(255,240,180,0.45)" />

        {/* Dial indicator notch at top */}
        <path d={`M ${CX - 5} ${CY - WHEEL_R + 1} L ${CX} ${CY - WHEEL_R + 9} L ${CX + 5} ${CY - WHEEL_R + 1} Z`}
          fill="rgba(0,0,0,0.7)" />
      </motion.g>

      {/* Static indicator tick above wheel */}
      <path d={`M ${CX - 4} ${CY - WHEEL_R - 8} L ${CX} ${CY - WHEEL_R - 1} L ${CX + 4} ${CY - WHEEL_R - 8} Z`}
        fill={GOLD} opacity={0.8} />

      {/* Handle bar on right side */}
      <rect x={CX + INNER_R - 22} y={CY - 18} width={28} height={36} rx={8}
        fill="#282828" stroke="rgba(200,169,110,0.3)" strokeWidth={1} />
      <rect x={CX + INNER_R - 16} y={CY - 12} width={16} height={24} rx={5}
        fill="url(#hingeGrad)" opacity={0.7} />

      {/* Hinge blocks on left side */}
      {[-28, 18].map((dy, i) => (
        <rect key={i} x={CX - DOOR_R - 4} y={CY + dy} width={12} height={22} rx={3}
          fill="#555" stroke="#333" strokeWidth={1} />
      ))}

      {/* Door face sheen */}
      <ellipse cx={CX - 22} cy={CY - 30} rx={28} ry={18}
        fill="rgba(255,255,255,0.04)" />
    </svg>
  );
}
