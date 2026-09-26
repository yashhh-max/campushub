"use client";

import { useEffect, useRef } from "react";

// Curated solid flat color sequence matching reference
const COLOR_SEQUENCE = [
  "#E83151", // Hot Coral / Red
  "#3B49DF", // Royal Blue
  "#B892FF", // Lavender / Lilac
  "#D49B00", // Mustard Gold
  "#C2410C", // Terracotta Orange
  "#4338CA", // Deep Indigo
  "#A78BFA", // Light Purple
  "#CA8A04", // Ochre Yellow
  "#10B981", // Emerald Green
  "#EC4899", // Vibrant Pink
  "#0284C7", // Sky Blue
  "#F59E0B", // Amber
];

// Single-character code/syntax symbols (strictly one character per cube)
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

// 20px x 20px square syntax block
const CUBE_SIZE = 20;

// Controlled 18px trail spacing between consecutive cubes (2px overlap ensuring zero visual gaps)
const STEP_DISTANCE = 18;

// Compact trail length of 8–12 visible cubes
const MAX_VISIBLE_CUBES = 11;

// Fade duration in milliseconds
const FADE_LIFETIME_MS = 600;

/**
 * CursorTrail
 * Dense, continuous code-block cursor trail.
 * - Every block: 20px × 20px square, exactly ONE syntax symbol, flat color, 1px dark border, 1px radius, 0° rotation.
 * - Dense path sampling at 18px intervals along actual cursor movement:
 *   [=][{][<][+][;][>][(][}]
 * - Absolutely zero gaps between adjacent cubes: blocks touch and share 1-2px border overlap.
 * - Continuous path interpolation: large pointer jumps (e.g. 50-100px) are interpolated along P0 -> P1 without skipping.
 * - No artificial random offset, no scatter, no grid lattice, no breathing gaps or modulo spacing.
 * - Anchored in place, smooth fade-out without upward drift or movement.
 * - Background layer (z-index: 5, pointer-events: none, sits behind foreground buttons, photos, cards, and text).
 */
export function CursorTrail() {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const activeCubesRef = useRef<HTMLDivElement[]>([]);
  const colorIndexRef = useRef(0);
  const lastSymbolRef = useRef("");

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
      // Evict oldest cube when reaching max compact trail length to maintain short continuous snake
      if (activeCubesRef.current.length >= MAX_VISIBLE_CUBES) {
        const oldest = activeCubesRef.current.shift();
        if (oldest) {
          oldest.remove();
        }
      }

      // Pick sequential solid color from palette
      const color = COLOR_SEQUENCE[colorIndexRef.current % COLOR_SEQUENCE.length];
      colorIndexRef.current += 1;

      // Pick exactly ONE symbol (no consecutive duplicates, zero blank blocks)
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
      cube.style.borderRadius = "1px"; // Subtle square corners (0–2px)
      cube.style.boxSizing = "border-box";
      cube.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';
      cube.style.fontSize = "11.5px";
      cube.style.fontWeight = "700";
      cube.style.display = "flex";
      cube.style.alignItems = "center";
      cube.style.justifyContent = "center";
      cube.style.pointerEvents = "none";
      cube.style.userSelect = "none";
      cube.style.zIndex = "5"; // Behind page content / buttons / photos
      cube.style.lineHeight = "1";
      cube.style.padding = "0";
      cube.style.margin = "0";
      cube.style.willChange = "opacity";

      container.appendChild(cube);
      activeCubesRef.current.push(cube);

      // Stays fixed in place, fades smoothly without upward drift or rotation
      const anim = cube.animate(
        [
          { opacity: 1 },
          { opacity: 1, offset: 0.5 },
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
        const idx = activeCubesRef.current.indexOf(cube);
        if (idx !== -1) {
          activeCubesRef.current.splice(idx, 1);
        }
      };
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch" || e.pointerType === "pen") return;

      const currentX = e.clientX;
      const currentY = e.clientY;

      // If trail had completely vanished or first movement, initialize origin cleanly
      if (!lastPosRef.current || activeCubesRef.current.length === 0) {
        lastPosRef.current = { x: currentX, y: currentY };
        spawnCube(currentX, currentY);
        return;
      }

      let dx = currentX - lastPosRef.current.x;
      let dy = currentY - lastPosRef.current.y;
      let dist = Math.hypot(dx, dy);

      // Discard massive window jumps (e.g. alt-tab or multi-monitor teleport > 250px)
      if (dist > 250) {
        lastPosRef.current = { x: currentX, y: currentY };
        spawnCube(currentX, currentY);
        return;
      }

      // Dense path interpolation along P0 -> P1 at exact STEP_DISTANCE intervals (18px)
      // Eliminates gaps during fast cursor movements
      while (dist >= STEP_DISTANCE) {
        const ratio: number = STEP_DISTANCE / dist;
        const nextX: number = lastPosRef.current.x + dx * ratio;
        const nextY: number = lastPosRef.current.y + dy * ratio;

        spawnCube(nextX, nextY);
        lastPosRef.current = { x: nextX, y: nextY };

        dx = currentX - nextX;
        dy = currentY - nextY;
        dist = Math.hypot(dx, dy);
      }
    };

    const handlePointerLeave = () => {
      lastPosRef.current = null;
    };

    // Attach single pointermove listener on window
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.documentElement.removeEventListener("pointerleave", handlePointerLeave);
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

