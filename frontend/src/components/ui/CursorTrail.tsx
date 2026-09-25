"use client";

import { useEffect, useRef } from "react";

// Designed color sequence for rhythmic visual flow
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

// Single-character code/syntax elements (strictly one symbol per block)
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
  "_",
] as const;

// Subtle stepped baseline offsets matching hand-drawn reference geometry
const STAGGER_OFFSETS = [0, 2, -1, 1, -2, 2, 0, -1];

const TILE_SIZE = 24; // Square cubes: 24px x 24px
const STEP_DISTANCE = 22; // Step distance matching tile size for tight 0–2px connected spacing
const MAX_VISIBLE_TILES = 9; // Compact short trail of 6–10 connected blocks
const TILE_LIFETIME_MS = 600; // Smooth 600ms lifetime

/**
 * CursorTrail
 * Renders a tightly connected chain of small square code-cube tiles along the cursor path:
 * ┌───┐┌───┐┌───┐┌───┐┌───┐
 * │ + ││ { ││ = ││ < ││ ; │
 * └───┘└───┘└───┘└───┘└───┘
 * Features natural stepped/staggered geometry, crisp borders, and exactly one symbol per cube.
 */
export function CursorTrail() {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const colorIndexRef = useRef(0);
  const tileIndexRef = useRef(0);
  const lastSymbolRef = useRef("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Accessibility & device pointer capability checks
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");

    if (motionQuery.matches || !pointerQuery.matches) {
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const spawnTileAt = (x: number, y: number, angleDeg: number) => {
      // Evict oldest tile if trail exceeds max length to maintain compact chain of 6-10
      if (container.children.length >= MAX_VISIBLE_TILES) {
        container.firstElementChild?.remove();
      }

      // Pick sequential color for designed rhythm
      const color = COLOR_SEQUENCE[colorIndexRef.current % COLOR_SEQUENCE.length];
      colorIndexRef.current += 1;

      // Pick exactly ONE symbol (ensuring no consecutive duplicates and zero blank blocks)
      let symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      if (symbol === lastSymbolRef.current) {
        symbol = SYMBOLS[(SYMBOLS.indexOf(symbol) + 1) % SYMBOLS.length];
      }
      lastSymbolRef.current = symbol;

      // Create square cube tile
      const tile = document.createElement("div");
      tile.textContent = symbol;

      // Crisp cube geometry matching hand-drawn reference
      tile.style.position = "fixed";
      tile.style.left = "0px";
      tile.style.top = "0px";
      tile.style.width = `${TILE_SIZE}px`;
      tile.style.height = `${TILE_SIZE}px`;
      tile.style.backgroundColor = color;
      tile.style.color = "#0F172A"; // Dark crisp glyph
      tile.style.border = "1.5px solid #0F172A"; // Crisp physical cube boundary
      tile.style.borderRadius = "2px"; // Subtle 2px corner radius
      tile.style.boxSizing = "border-box";
      tile.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
      tile.style.fontSize = "13px";
      tile.style.fontWeight = "800";
      tile.style.display = "flex";
      tile.style.alignItems = "center";
      tile.style.justifyContent = "center";
      tile.style.pointerEvents = "none";
      tile.style.userSelect = "none";
      tile.style.zIndex = "99999";
      tile.style.boxShadow = "none";
      tile.style.willChange = "transform, opacity";

      container.appendChild(tile);

      const halfSize = TILE_SIZE / 2;
      const startX = x - halfSize;
      const startY = y - halfSize;

      // Anchored along path, holds position, then fades out smoothly (no upward drift)
      const animation = tile.animate(
        [
          {
            opacity: 1,
            transform: `translate3d(${startX}px, ${startY}px, 0) rotate(${angleDeg}deg) scale(1)`,
          },
          {
            opacity: 1,
            offset: 0.45,
            transform: `translate3d(${startX}px, ${startY}px, 0) rotate(${angleDeg}deg) scale(1)`,
          },
          {
            opacity: 0,
            offset: 1.0,
            transform: `translate3d(${startX}px, ${startY}px, 0) rotate(${angleDeg}deg) scale(0.95)`,
          },
        ],
        {
          duration: TILE_LIFETIME_MS,
          easing: "ease-out",
          fill: "forwards",
        }
      );

      animation.onfinish = () => {
        tile.remove();
      };
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch" || e.pointerType === "pen") return;

      const currentX = e.clientX;
      const currentY = e.clientY;

      if (!lastPointRef.current) {
        lastPointRef.current = { x: currentX, y: currentY };
        spawnTileAt(currentX, currentY, 0);
        tileIndexRef.current += 1;
        return;
      }

      const dx = currentX - lastPointRef.current.x;
      const dy = currentY - lastPointRef.current.y;
      const dist = Math.hypot(dx, dy);

      // Place a new connected cube whenever cursor travels STEP_DISTANCE
      if (dist >= STEP_DISTANCE) {
        const steps = Math.floor(dist / STEP_DISTANCE);

        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const rawX = lastPointRef.current.x + dx * t;
          const rawY = lastPointRef.current.y + dy * t;

          // Natural subtle stepped baseline offset from reference drawing
          const staggerY = STAGGER_OFFSETS[tileIndexRef.current % STAGGER_OFFSETS.length];
          // Extremely subtle tilt (-1.5deg to +1.5deg) keeping the chain geometric
          const subtleAngle = (tileIndexRef.current % 2 === 0 ? 1 : -1) * (0.6 + Math.abs(staggerY) * 0.4);

          spawnTileAt(rawX, rawY + staggerY, subtleAngle);
          tileIndexRef.current += 1;
        }

        lastPointRef.current = {
          x: lastPointRef.current.x + dx * (steps * STEP_DISTANCE / dist),
          y: lastPointRef.current.y + dy * (steps * STEP_DISTANCE / dist),
        };
      }
    };

    const handlePointerLeave = () => {
      lastPointRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerleave", handlePointerLeave);
      if (container) {
        container.innerHTML = "";
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-50 overflow-hidden select-none"
      aria-hidden="true"
    />
  );
}
