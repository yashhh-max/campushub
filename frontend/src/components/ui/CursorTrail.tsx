"use client";

import { useEffect, useRef } from "react";

// Curated solid flat color sequence matching reference
const COLOR_SEQUENCE = [
  "#E83151", // Hot Pink
  "#3B49DF", // Royal Blue
  "#B892FF", // Lavender / Lilac
  "#D49B00", // Mustard Gold
  "#C2410C", // Burnt Terracotta
  "#4338CA", // Deep Indigo
  "#A78BFA", // Light Purple
  "#CA8A04", // Ochre Yellow
  "#10B981", // Emerald Green
  "#EC4899", // Vibrant Pink
];

// Single-character code/syntax symbols (strictly one per cube)
const SYMBOLS = [
  "+",
  "-",
  "=",
  "<",
  ">",
  "{",
  "}",
  "(",
  ")",
  "[",
  "]",
  "/",
  ";",
  "#",
  "*",
] as const;

// 20px square syntax block
const CUBE_SIZE = 20;

// Controlled 18px trail spacing between consecutive cubes (intentional 2px overlap for tightly attached appearance)
const STEP_DISTANCE = 18;

// Compact trail length of 8–12 visible cubes
const MAX_VISIBLE_CUBES = 10;

// Smooth fade lifetime in milliseconds
const FADE_LIFETIME_MS = 600;

/**
 * CursorTrail
 * Compact, connected code-block cursor trail.
 * - Every block: 20px × 20px square, exactly one syntax symbol, solid color, 1px dark border, 1.5px radius, 0° rotation.
 * - Path-sampled cursor history at controlled 18px spacing: ensures a continuous, unbroken chain of attached blocks.
 * - When moving horizontally: [=][{][<][+][;][>]
 * - When turning: natural corner following mouse path.
 * - When moving diagonally: natural connected diagonal.
 * - Zero grid generator, zero integer lattice, zero forced clusters, zero perpendicular stagger.
 * - Position determined purely by cursor movement; no random positioning or particle scattering.
 * - Decorative background layer (z-index: 5, pointer-events: none, renders behind buttons/photos/cards).
 */
export function CursorTrail() {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const activeCubesRef = useRef<HTMLDivElement[]>([]);
  const colorIndexRef = useRef(0);
  const lastSymbolRef = useRef("");
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Accessibility & touch device capability checks
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const touchOnlyQuery = window.matchMedia("(hover: none) and (pointer: coarse)");

    if (motionQuery.matches || touchOnlyQuery.matches) {
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const spawnCube = (x: number, y: number) => {
      // Evict oldest cube when reaching max compact trail length
      if (activeCubesRef.current.length >= MAX_VISIBLE_CUBES) {
        const oldest = activeCubesRef.current.shift();
        if (oldest) {
          oldest.remove();
        }
      }

      // Pick sequential solid color
      const color = COLOR_SEQUENCE[colorIndexRef.current % COLOR_SEQUENCE.length];
      colorIndexRef.current += 1;

      // Pick exactly ONE symbol (no consecutive duplicate symbols, no blank blocks)
      let symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      if (symbol === lastSymbolRef.current) {
        symbol = SYMBOLS[(SYMBOLS.indexOf(symbol) + 1) % SYMBOLS.length];
      }
      lastSymbolRef.current = symbol;

      // Create 20px x 20px square cube element
      const cube = document.createElement("div");
      cube.textContent = symbol;

      const left = Math.round(x - CUBE_SIZE / 2);
      const top = Math.round(y - CUBE_SIZE / 2);

      cube.style.position = "fixed";
      cube.style.left = `${left}px`;
      cube.style.top = `${top}px`;
      cube.style.width = `${CUBE_SIZE}px`;
      cube.style.height = `${CUBE_SIZE}px`;
      cube.style.backgroundColor = color;
      cube.style.color = "#0F172A"; // Dark crisp syntax glyph
      cube.style.border = "1px solid #0F172A"; // Thin dark border
      cube.style.borderRadius = "1.5px"; // 0-2px border radius
      cube.style.boxSizing = "border-box";
      cube.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
      cube.style.fontSize = "12px";
      cube.style.fontWeight = "800";
      cube.style.display = "flex";
      cube.style.alignItems = "center";
      cube.style.justifyContent = "center";
      cube.style.pointerEvents = "none";
      cube.style.userSelect = "none";
      cube.style.zIndex = "5"; // Behind page content / buttons / photos
      cube.style.lineHeight = "1";
      cube.style.willChange = "opacity";

      container.appendChild(cube);
      activeCubesRef.current.push(cube);

      // Anchored in place, fades smoothly without upward drift or rotation
      const anim = cube.animate(
        [
          { opacity: 1 },
          { opacity: 1, offset: 0.45 },
          { opacity: 0, offset: 1.0 },
        ],
        {
          duration: FADE_LIFETIME_MS,
          easing: "ease-out",
          fill: "forwards",
        }
      );

      anim.onfinish = () => {
        cube.remove();
        activeCubesRef.current = activeCubesRef.current.filter((c) => c !== cube);
      };
    };

    const handlePointerMove = (e: MouseEvent | PointerEvent) => {
      if ("pointerType" in e && (e.pointerType === "touch" || e.pointerType === "pen")) return;

      const currentX = e.clientX;
      const currentY = e.clientY;

      // Clear trail origin when mouse rests for 400ms
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = setTimeout(() => {
        lastPosRef.current = null;
      }, 400);

      // First movement event: initialize origin and place first cube
      if (!lastPosRef.current) {
        lastPosRef.current = { x: currentX, y: currentY };
        spawnCube(currentX, currentY);
        return;
      }

      let dx = currentX - lastPosRef.current.x;
      let dy = currentY - lastPosRef.current.y;
      let dist = Math.hypot(dx, dy);

      // Resample along cursor path at controlled STEP_DISTANCE intervals (18px)
      while (dist >= STEP_DISTANCE) {
        const ratio: number = STEP_DISTANCE / dist;
        const nextX: number = lastPosRef.current.x + dx * ratio;
        const nextY: number = lastPosRef.current.y + dy * ratio;

        spawnCube(nextX, nextY);
        lastPosRef.current = { x: nextX, y: nextY };

        dx = currentX - lastPosRef.current.x;
        dy = currentY - lastPosRef.current.y;
        dist = Math.hypot(dx, dy);
      }
    };

    const handlePointerLeave = () => {
      lastPosRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    document.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("mousemove", handlePointerMove);
      document.removeEventListener("pointerleave", handlePointerLeave);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      activeCubesRef.current.forEach((c) => c.remove());
      activeCubesRef.current = [];
      if (container) {
        container.innerHTML = "";
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-[5] overflow-hidden select-none"
      aria-hidden="true"
    />
  );
}
