"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** One flying particle: travel offset, size, spin, colour, and timing. */
interface Particle {
  dx: number;
  dy: number;
  size: number;
  rotate: number;
  color: string;
  duration: number;
}

/** One active burst: a unique id, the click point, and its particles. */
interface Burst {
  id: number;
  x: number;
  y: number;
  particles: Particle[];
}

/** Particles per burst. */
const PARTICLE_COUNT = 16;
/** Flat palette particles draw from (neobrutalism pop colours). */
const COLORS = ["bg-primary", "bg-foreground", "bg-destructive", "bg-chart-3"];

/** Build a fresh, randomized particle ring for one burst. */
function makeParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    // Even spread + jitter so it reads as a scatter, not a clock face.
    const angle =
      (i / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.7;
    const distance = 16 + Math.random() * 30;
    return {
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      size: 3 + Math.random() * 5,
      rotate: (Math.random() - 0.5) * 220,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      duration: 0.45 + Math.random() * 0.35,
    };
  });
}

/**
 * Global pointer-click feedback: a particle burst — small neobrutalism squares
 * scatter from the click point, spinning and fading as they fly. Driven by
 * `motion`, rendered into a fixed, pointer-events-none overlay so it never
 * blocks interaction. Each burst removes itself when its particles finish.
 *
 * No-ops when the user's reduced-motion setting is on. Mount once, at the root.
 */
export function ClickBurst() {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let nextId = 0;
    function handlePointerDown(e: PointerEvent) {
      // Primary button only; respect the user's reduced-motion preference.
      if (
        e.button !== 0 ||
        document.documentElement.hasAttribute("data-reduced-motion")
      ) {
        return;
      }
      const id = nextId++;
      const particles = makeParticles();
      setBursts((prev) => [
        ...prev,
        { id, x: e.clientX, y: e.clientY, particles },
      ]);
      // Drop the burst once its longest-lived particle has finished.
      const ttl = Math.max(...particles.map((p) => p.duration)) * 1000 + 60;
      window.setTimeout(
        () => setBursts((prev) => prev.filter((b) => b.id !== id)),
        ttl,
      );
    }
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {bursts.map((burst) => (
        <span
          key={burst.id}
          className="absolute"
          style={{ left: burst.x, top: burst.y }}
        >
          {burst.particles.map((p, i) => (
            <motion.span
              key={i}
              className={`absolute block ${p.color}`}
              style={{
                width: p.size,
                height: p.size,
                left: -p.size / 2,
                top: -p.size / 2,
              }}
              initial={{ x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 }}
              animate={{
                x: p.dx,
                y: p.dy,
                scale: 0.2,
                opacity: 0,
                rotate: p.rotate,
              }}
              transition={{ duration: p.duration, ease: [0.2, 0, 0, 1] }}
            />
          ))}
        </span>
      ))}
    </div>,
    document.body,
  );
}
