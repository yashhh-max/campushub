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
  const lastAxisRef = useRef<"x" | "y" | null>(null);
  const axisRunRef = useRef(0);
  const colorIndexRef = useRef(0);
  const lastSymbolRef = useRef("");
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedPosRef = useRef<{ x: number; y: number }>({ x: -1, y: -1 });
  const activeTilesRef = useRef<Array<{ x: number; y: number; el: HTMLDivElement }>>([]);

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
      // Prevent overlap with existing active cubes
      for (let i = 0; i < activeTilesRef.current.length; i++) {
        const item = activeTilesRef.current[i];
        if (Math.abs(x - item.x) < 14 && Math.abs(y - item.y) < 14) {
          return false;
        }
      }

      // Keep trail compact by evicting oldest tile when reaching max length
      if (activeTilesRef.current.length >= MAX_VISIBLE_TILES) {
        const oldest = activeTilesRef.current.shift();
        oldest?.el.remove();
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
      tile.style.borderRadius = "1.5px"; // Very small corner radius (0-2px)
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

      const entry = { x, y, el: tile };
      activeTilesRef.current.push(entry);

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
        activeTilesRef.current = activeTilesRef.current.filter((item) => item.el !== tile);
        if (activeTilesRef.current.length === 0) {
          lastPlacedPointRef.current = null;
          lastAxisRef.current = null;
          axisRunRef.current = 0;
        }
      };

      return true;
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
        lastAxisRef.current = null;
        axisRunRef.current = 0;
      }, 400);

      // If trail has reset, start at current cursor position
      if (!lastPlacedPointRef.current) {
        lastPlacedPointRef.current = { x: currentX, y: currentY };
        lastAxisRef.current = null;
        axisRunRef.current = 0;
        spawnTileAt(currentX, currentY);
        return;
      }

      let lastX = lastPlacedPointRef.current.x;
      let lastY = lastPlacedPointRef.current.y;

      let dx = currentX - lastX;
      let dy = currentY - lastY;
      let dist = Math.hypot(dx, dy);

      // Subtle perpendicular slope shift (clamped to [-2px, +2px]) keeps edge overlap >= 18px
      const MAX_SUBTLE_SHIFT = 2;

      // Place attached blocks whenever cursor travels ATTACHED_STEP
      if (dist >= ATTACHED_STEP) {
        while (dist >= ATTACHED_STEP) {
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);

          // Edge-connection decision:
          // Adjacent blocks must connect by a full edge (horizontal face or vertical face).
          // Diagonal motion uses short runs of 2 blocks along primary axis then steps,
          // guaranteeing [■][■] or [■][■][■] shapes and zero corner-only diagonal chains.
          let stepAxis: "x" | "y";
          if (absDx >= 1.6 * absDy) {
            stepAxis = "x";
          } else if (absDy >= 1.6 * absDx) {
            stepAxis = "y";
          } else {
            // Angled/diagonal trajectory:
            // Allow up to 2 steps on the current axis before stepping orthogonally
            if (axisRunRef.current >= 2) {
              stepAxis = lastAxisRef.current === "x" ? "y" : "x";
            } else if (absDx >= absDy) {
              stepAxis = "x";
            } else {
              stepAxis = "y";
            }
          }

          let nextX: number;
          let nextY: number;

          if (stepAxis === "x") {
            const sx = absDx > 0 ? Math.sign(dx) * ATTACHED_STEP : ATTACHED_STEP;
            const sy = absDx > 0 ? Math.max(-MAX_SUBTLE_SHIFT, Math.min(MAX_SUBTLE_SHIFT, (dy / absDx) * 2)) : 0;
            nextX = lastX + sx;
            nextY = lastY + sy;
          } else {
            const sy = absDy > 0 ? Math.sign(dy) * ATTACHED_STEP : ATTACHED_STEP;
            const sx = absDy > 0 ? Math.max(-MAX_SUBTLE_SHIFT, Math.min(MAX_SUBTLE_SHIFT, (dx / absDy) * 2)) : 0;
            nextX = lastX + sx;
            nextY = lastY + sy;
          }

          if (stepAxis === lastAxisRef.current) {
            axisRunRef.current += 1;
          } else {
            lastAxisRef.current = stepAxis;
            axisRunRef.current = 1;
          }

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
      lastAxisRef.current = null;
      axisRunRef.current = 0;
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
      activeTilesRef.current.forEach((t) => t.el.remove());
      activeTilesRef.current = [];
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
