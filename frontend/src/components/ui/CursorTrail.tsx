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

// Visual scale & spacing parameters
const TILE_SIZE = 20; // 20px square syntax block
const STEP_DISTANCE = 19; // 19px center-to-center distance for tightly attached 1px shared border
const MAX_VISIBLE_TILES = 10; // Compact trail length of 6–10 blocks
const TILE_LIFETIME_MS = 600; // Smooth 600ms fade lifetime

interface ActiveTile {
  id: number;
  x: number;
  y: number;
  el: HTMLDivElement;
}

/**
 * CursorTrail
 * Simple, natural path-sampled cursor trail of small square syntax blocks.
 * - 20px square cubes with thin dark border (1px) and very small corner radius (1.5px).
 * - Exactly ONE code symbol per cube, centered, flat solid colors.
 * - 0° rotation, no upward drift, no particle scattering, fades in place smoothly.
 * - Cursor path directly controls the geometry:
 *     - Horizontal movement -> straight horizontal chain [=][{][<][+][;][>]
 *     - Vertical movement   -> straight vertical chain
 *     - Turning movement    -> natural corner
 *     - Diagonal movement   -> natural stepped diagonal
 * - Zero artificial clustering, no grid puzzle, no forced perpendicular staggers.
 * - Background decorative layer (z-index: 5, pointer-events: none).
 */
export function CursorTrail() {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTilesRef = useRef<ActiveTile[]>([]);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const nextIdRef = useRef(1);
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

    const isCollidingWithActive = (x: number, y: number): boolean => {
      for (const t of activeTilesRef.current) {
        if (Math.abs(t.x - x) < 17 && Math.abs(t.y - y) < 17) {
          return true;
        }
      }
      return false;
    };

    const spawnTile = (x: number, y: number): void => {
      if (isCollidingWithActive(x, y)) {
        return;
      }

      // Evict oldest tile when reaching max compact trail length
      if (activeTilesRef.current.length >= MAX_VISIBLE_TILES) {
        const oldest = activeTilesRef.current.shift();
        if (oldest) {
          oldest.el.remove();
        }
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

      const left = Math.round(x - TILE_SIZE / 2);
      const top = Math.round(y - TILE_SIZE / 2);

      tile.style.position = "fixed";
      tile.style.left = `${left}px`;
      tile.style.top = `${top}px`;
      tile.style.width = `${TILE_SIZE}px`;
      tile.style.height = `${TILE_SIZE}px`;
      tile.style.backgroundColor = color;
      tile.style.color = "#0F172A"; // Dark crisp syntax glyph
      tile.style.border = "1px solid #0F172A"; // Thin dark border
      tile.style.borderRadius = "1.5px"; // Subtle 1.5px corner radius
      tile.style.boxSizing = "border-box";
      tile.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
      tile.style.fontSize = "12px";
      tile.style.fontWeight = "800";
      tile.style.display = "flex";
      tile.style.alignItems = "center";
      tile.style.justifyContent = "center";
      tile.style.pointerEvents = "none";
      tile.style.userSelect = "none";
      tile.style.zIndex = "5";
      tile.style.boxShadow = "none";
      tile.style.lineHeight = "1";
      tile.style.willChange = "opacity";

      container.appendChild(tile);

      const tileId = nextIdRef.current++;
      const tileRecord: ActiveTile = { id: tileId, x, y, el: tile };
      activeTilesRef.current.push(tileRecord);

      // Anchored in place, fades smoothly without upward drift or rotation
      const animation = tile.animate(
        [
          { opacity: 1 },
          { opacity: 1, offset: 0.45 },
          { opacity: 0, offset: 1.0 },
        ],
        {
          duration: TILE_LIFETIME_MS,
          easing: "ease-out",
          fill: "forwards",
        }
      );

      animation.onfinish = () => {
        tile.remove();
        activeTilesRef.current = activeTilesRef.current.filter((t) => t.id !== tileId);
      };
    };

    const handleMove = (e: MouseEvent | PointerEvent) => {
      if ("pointerType" in e && (e.pointerType === "touch" || e.pointerType === "pen")) return;

      const currentX = e.clientX;
      const currentY = e.clientY;

      // Reset idle timer (clears trail origin when cursor stops for 350ms)
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = setTimeout(() => {
        lastPosRef.current = null;
      }, 350);

      // Start trail at current position if no active origin
      if (!lastPosRef.current) {
        lastPosRef.current = { x: currentX, y: currentY };
        spawnTile(currentX, currentY);
        return;
      }

      let dx = currentX - lastPosRef.current.x;
      let dy = currentY - lastPosRef.current.y;
      let dist = Math.hypot(dx, dy);

      // Step along the exact cursor path at STEP_DISTANCE intervals
      while (dist >= STEP_DISTANCE) {
        const stepRatio: number = STEP_DISTANCE / dist;
        const nextX: number = lastPosRef.current.x + dx * stepRatio;
        const nextY: number = lastPosRef.current.y + dy * stepRatio;

        spawnTile(nextX, nextY);
        lastPosRef.current = { x: nextX, y: nextY };

        dx = currentX - lastPosRef.current.x;
        dy = currentY - lastPosRef.current.y;
        dist = Math.hypot(dx, dy);
      }
    };

    const handlePointerLeave = () => {
      lastPosRef.current = null;
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
      className="fixed inset-0 pointer-events-none z-[5] overflow-hidden select-none"
      aria-hidden="true"
    />
  );
}
