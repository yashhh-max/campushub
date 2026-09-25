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
  "_",
] as const;

// Visual scale & attachment parameters
const TILE_SIZE = 20; // 20px square syntax block
const ATTACHED_STEP = 19; // 19px center-to-center distance for tightly attached 1px shared border
const MAX_VISIBLE_TILES = 10; // Compact trail length of 6–10 blocks
const TILE_LIFETIME_MS = 600; // Smooth 600ms fade lifetime

/**
 * CursorTrail
 * Renders a compact, designer-crafted sequence of attached square syntax blocks following the cursor.
 * - 20px square cubes with thin dark border (1px) and very small corner radius (1.5px).
 * - Exactly ONE symbol per cube, centered, flat solid colors.
 * - Tightly attached adjacent edges ([=][{][<][+][-][/]) without artificial gaps or rigid groupings.
 * - 0° rotation: clean, square, non-button appearance.
 * - Fades in place smoothly with zero upward drift or particle scattering.
 */
export function CursorTrail() {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPlacedPointRef = useRef<{ x: number; y: number } | null>(null);
  const colorIndexRef = useRef(0);
  const lastSymbolRef = useRef("");
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedPosRef = useRef<{ x: number; y: number }>({ x: -1, y: -1 });

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

    const spawnTileAt = (x: number, y: number) => {
      // Keep trail compact by evicting oldest tile when reaching max length
      if (container.children.length >= MAX_VISIBLE_TILES) {
        container.firstElementChild?.remove();
      }

      // Pick sequential solid color
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

      tile.style.position = "fixed";
      tile.style.left = "0px";
      tile.style.top = "0px";
      tile.style.width = `${TILE_SIZE}px`;
      tile.style.height = `${TILE_SIZE}px`;
      tile.style.backgroundColor = color;
      tile.style.color = "#0F172A"; // Dark crisp syntax glyph
      tile.style.border = "1px solid #0F172A"; // Thin dark border
      tile.style.borderRadius = "1.5px"; // Very small corner radius
      tile.style.boxSizing = "border-box";
      tile.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
      tile.style.fontSize = "12px";
      tile.style.fontWeight = "800";
      tile.style.display = "flex";
      tile.style.alignItems = "center";
      tile.style.justifyContent = "center";
      tile.style.pointerEvents = "none";
      tile.style.userSelect = "none";
      tile.style.zIndex = "99999";
      tile.style.boxShadow = "none";
      tile.style.lineHeight = "1";
      tile.style.willChange = "opacity";

      container.appendChild(tile);

      const halfSize = TILE_SIZE / 2;
      const startX = x - halfSize;
      const startY = y - halfSize;

      // Anchored along path, holds position, then fades out smoothly in place (zero upward drift, 0deg rotation)
      const animation = tile.animate(
        [
          {
            opacity: 1,
            transform: `translate3d(${startX}px, ${startY}px, 0)`,
          },
          {
            opacity: 1,
            offset: 0.45,
            transform: `translate3d(${startX}px, ${startY}px, 0)`,
          },
          {
            opacity: 0,
            offset: 1.0,
            transform: `translate3d(${startX}px, ${startY}px, 0)`,
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
        if (container.children.length === 0) {
          lastPlacedPointRef.current = null;
        }
      };
    };

    const handleMove = (e: MouseEvent | PointerEvent) => {
      if ("pointerType" in e && (e.pointerType === "touch" || e.pointerType === "pen")) return;

      const currentX = e.clientX;
      const currentY = e.clientY;

      // Deduplicate identical coordinate events
      if (
        currentX === lastProcessedPosRef.current.x &&
        currentY === lastProcessedPosRef.current.y
      ) {
        return;
      }
      lastProcessedPosRef.current = { x: currentX, y: currentY };

      // Reset idle timer (clears trail origin when cursor stops for 400ms)
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = setTimeout(() => {
        lastPlacedPointRef.current = null;
      }, 400);

      // If trail has reset, start at current cursor position
      if (!lastPlacedPointRef.current) {
        lastPlacedPointRef.current = { x: currentX, y: currentY };
        spawnTileAt(currentX, currentY);
        return;
      }

      let lastX = lastPlacedPointRef.current.x;
      let lastY = lastPlacedPointRef.current.y;

      let dx = currentX - lastX;
      let dy = currentY - lastY;
      let dist = Math.hypot(dx, dy);

      // Dominant axis step: 19px along dominant axis ensures adjacent 20px cubes touch edge-to-edge
      if (dist >= ATTACHED_STEP) {
        while (dist >= ATTACHED_STEP) {
          const ux = dx / dist;
          const uy = dy / dist;
          const maxAxis = Math.max(Math.abs(ux), Math.abs(uy));
          const step = maxAxis > 0.001 ? ATTACHED_STEP / maxAxis : ATTACHED_STEP;

          if (dist < step) break;

          const nextX = lastX + ux * step;
          const nextY = lastY + uy * step;

          spawnTileAt(nextX, nextY);

          lastX = nextX;
          lastY = nextY;

          dx = currentX - lastX;
          dy = currentY - lastY;
          dist = Math.hypot(dx, dy);
        }

        lastPlacedPointRef.current = { x: lastX, y: lastY };
      }
    };

    const handlePointerLeave = () => {
      lastPlacedPointRef.current = null;
    };

    window.addEventListener("pointermove", handleMove, { passive: true });
    window.addEventListener("mousemove", handleMove, { passive: true });
    document.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("mousemove", handleMove);
      document.removeEventListener("pointerleave", handlePointerLeave);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
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
