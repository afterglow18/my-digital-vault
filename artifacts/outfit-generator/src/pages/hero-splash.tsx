/**
 * HeroSplash — full-screen hero image shown once on first launch.
 * Tap anywhere (or the button) to proceed to the welcome screen.
 */
import { motion } from "framer-motion";

interface Props {
  onContinue: () => void;
}

export default function HeroSplash({ onContinue }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      onClick={onContinue}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        background: "#1a0a10",
      }}
    >
      {/* Full-screen hero image */}
      <img
        src="/hero-splash.jpg"
        alt="My Digital Vanity"
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

      {/* Gradient overlay at bottom so text is legible */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, transparent 50%, rgba(20,4,12,0.85) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Branding + CTA */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          paddingBottom: "max(48px, env(safe-area-inset-bottom, 48px))",
          paddingLeft: 24,
          paddingRight: 24,
          width: "100%",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-display, serif)",
            fontWeight: 900,
            fontSize: 13,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#E8B0B8",
          }}
        >
          My Digital Vanity
        </p>

        <h1
          style={{
            fontFamily: "var(--font-display, serif)",
            fontWeight: 900,
            fontSize: 36,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            textTransform: "uppercase",
            color: "#fff",
            textAlign: "center",
            textShadow: "0 2px 12px rgba(0,0,0,0.6)",
          }}
        >
          Your Beauty,<br />Organised.
        </h1>

        <button
          onClick={(e) => { e.stopPropagation(); onContinue(); }}
          style={{
            marginTop: 8,
            width: "100%",
            maxWidth: 320,
            padding: "16px 0",
            borderRadius: 100,
            border: "none",
            background: "linear-gradient(135deg, #E8B0B8 0%, #D0909A 100%)",
            color: "#fff",
            fontFamily: "var(--font-display, serif)",
            fontWeight: 900,
            fontSize: 15,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            boxShadow: "0 4px 20px rgba(208,144,154,0.5)",
            cursor: "pointer",
          }}
        >
          Enter My Vanity
        </button>
      </div>
    </motion.div>
  );
}
