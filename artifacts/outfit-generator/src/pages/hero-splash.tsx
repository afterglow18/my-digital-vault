/**
 * HeroSplash — Phase 1 of the splash sequence.
 *
 * Full-screen hero image with a dark gradient over the lower portion,
 * "Welcome to" + app name near the bottom.
 * Auto-advances after 2.5 s with no user interaction required.
 */
import { useEffect } from "react";
import { motion } from "framer-motion";

interface Props {
  onContinue: () => void;
  onFavorites: () => void;
}

export default function HeroSplash({ onContinue, onFavorites }: Props) {
  useEffect(() => {
    const t = setTimeout(onContinue, 2500);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.55 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "#1a1a1a",
        overflow: "hidden",
      }}
    >
      {/* Full-screen hero image */}
      <img
        src="/vault-door.png"
        alt="My Digital Filing Cabinet"
        draggable={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center top",
          userSelect: "none",
          pointerEvents: "none",
        }}
      />

      {/* Dark gradient over lower portion for text readability */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 30%, rgba(0,0,0,0.15) 55%, transparent 72%)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      {/* Bottom branding */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: "calc(env(safe-area-inset-bottom) + 80px)",
          paddingLeft: 28,
          paddingRight: 28,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          zIndex: 2,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "rgba(220,225,240,0.75)",
            textShadow: "0 1px 6px rgba(0,0,0,0.7)",
          }}
        >
          Welcome to
        </div>
        <div
          style={{
            fontFamily: "'Great Vibes', cursive",
            fontWeight: 400,
            fontSize: "clamp(36px, 10vw, 52px)",
            color: "#f0f0f0",
            textShadow: "0 2px 14px rgba(0,0,0,0.9), 0 0 32px rgba(200,200,200,0.18)",
            lineHeight: 1.2,
            textAlign: "center",
          }}
        >
          My Digital<br />Filing Cabinet
        </div>
      </motion.div>

      {/* The safe/file icon is part of the hero artwork and is also the
          app's favorites shortcut. Keep that visible affordance tappable
          while the splash is up instead of making users tap through it. */}
      <button
        type="button"
        onClick={onFavorites}
        aria-label="View favorites"
        data-testid="hero-favorites-button"
        style={{
          position: "absolute",
          left: "7%",
          bottom: 0,
          width: "26%",
          height: "16%",
          zIndex: 4,
          padding: 0,
          border: "none",
          background: "transparent",
          cursor: "pointer",
        }}
      />
    </motion.div>
  );
}
