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

const TILE_SIZE = 24; // Square cubes: 24px x 24px
const STEP_DISTANCE = 23; // Fixed sampling distance along the cursor trajectory for 0–1px connected spacing
const MAX_VISIBLE_TILES = 9; // Compact short trail of 6–10 connected blocks
const TILE_LIFETIME_MS = 600; // Smooth 600ms lifetime

/**
 * CursorTrail
 * Renders a tightly connected chain of square code cubes along the user's real cursor trajectory.
 * The position of every cube comes entirely from sampling the cursor path at a fixed distance (no hardcoded staggers).
 * Horizontal: [+][{][=][<][;][>]
 * Diagonal: stair-stepping along path
 * Curves / Corners: bends faithfully with the mouse trajectory
 */
export function CursorTrail() {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const colorIndexRef = useRef(0);
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

    const spawnTileAt = (x: number, y: number) => {
      // Evict oldest tile if trail exceeds max length to maintain a compact chain of 6-10
      if (container.children.length >= MAX_VISIBLE_TILES) {
        container.firstElementChild?.remove();
      }

      // Pick sequential color for designed rhythm
      const color = COLOR_SEQUENCE[colorIndexRef.current % COLOR_SEQUENCE.length];
      colorIndexRef.current += 1;

      // Pick exactly ONE symbol (no consecutive duplicates, zero blank blocks)
      let symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      if (symbol === lastSymbolRef.current) {
        symbol = SYMBOLS[(SYMBOLS.indexOf(symbol) + 1) % SYMBOLS.length];
      }
      lastSymbolRef.current = symbol;

      // Create square cube tile
      const tile = document.createElement("div");
      tile.textContent = symbol;

      // Crisp cube geometry
      tile.style.position = "fixed";
      tile.style.left = "0px";
      tile.style.top = "0px";
      tile.style.width = `${TILE_SIZE}px`;
      tile.style.height = `${TILE_SIZE}px`;
      tile.style.backgroundColor = color;
      tile.style.color = "#0F172A"; // Dark crisp glyph
      tile.style.border = "1.5px solid #0F172A"; // Crisp physical cube boundary
      tile.style.borderRadius = "2px"; // Subtle corner radius
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

      // Anchored along path, holds position, then fades out smoothly (zero upward drift)
      const animation = tile.animate(
        [
          {
            opacity: 1,
            transform: `translate3d(${startX}px, ${startY}px, 0) scale(1)`,
          },
          {
            opacity: 1,
            offset: 0.45,
            transform: `translate3d(${startX}px, ${startY}px, 0) scale(1)`,
          },
          {
            opacity: 0,
            offset: 1.0,
            transform: `translate3d(${startX}px, ${startY}px, 0) scale(0.95)`,
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
        spawnTileAt(currentX, currentY);
        return;
      }

      let lastX = lastPointRef.current.x;
      let lastY = lastPointRef.current.y;

      let dx = currentX - lastX;
      let dy = currentY - lastY;
      let dist = Math.hypot(dx, dy);

      // Sample points along the actual path at fixed STEP_DISTANCE intervals
      if (dist >= STEP_DISTANCE) {
        while (dist >= STEP_DISTANCE) {
          const ux = dx / dist;
          const uy = dy / dist;

          const nextX: number = lastX + ux * STEP_DISTANCE;
          const nextY: number = lastY + uy * STEP_DISTANCE;

          spawnTileAt(nextX, nextY);

          lastX = nextX;
          lastY = nextY;

          dx = currentX - lastX;
          dy = currentY - lastY;
          dist = Math.hypot(dx, dy);
        }

        lastPointRef.current = { x: lastX, y: lastY };
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
