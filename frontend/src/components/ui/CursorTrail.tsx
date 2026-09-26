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
  const lastGridRef = useRef<{ gx: number; gy: number } | null>(null);
  const currentAxisRef = useRef<"x" | "y" | null>(null);
  const runLengthRef = useRef(0);
  const staggerSideRef = useRef(1);
  const colorIndexRef = useRef(0);
  const lastSymbolRef = useRef("");
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedPosRef = useRef<{ x: number; y: number }>({ x: -1, y: -1 });
  const occupiedCellsRef = useRef<Map<string, { gx: number; gy: number; el: HTMLDivElement }>>(new Map());

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

    const spawnTileAtGrid = (gx: number, gy: number): boolean => {
      const key = `${gx},${gy}`;
      if (occupiedCellsRef.current.has(key)) {
        return false;
      }

      // Evict oldest tile when reaching max compact trail length
      if (occupiedCellsRef.current.size >= MAX_VISIBLE_TILES) {
        const oldestKey = occupiedCellsRef.current.keys().next().value;
        if (oldestKey) {
          const oldest = occupiedCellsRef.current.get(oldestKey);
          oldest?.el.remove();
          occupiedCellsRef.current.delete(oldestKey);
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

      tile.style.position = "fixed";
      tile.style.left = "0px";
      tile.style.top = "0px";
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
      tile.style.zIndex = "99999";
      tile.style.boxShadow = "none";
      tile.style.lineHeight = "1";
      tile.style.willChange = "opacity";

      container.appendChild(tile);

      occupiedCellsRef.current.set(key, { gx, gy, el: tile });

      // Physical center coordinates on grid
      const pixelX = gx * ATTACHED_STEP;
      const pixelY = gy * ATTACHED_STEP;
      const startX = pixelX - TILE_SIZE / 2;
      const startY = pixelY - TILE_SIZE / 2;

      // Anchored in place, fades smoothly without upward drift or rotation
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
        occupiedCellsRef.current.delete(key);
        if (occupiedCellsRef.current.size === 0) {
          lastGridRef.current = null;
          currentAxisRef.current = null;
          runLengthRef.current = 0;
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
        lastGridRef.current = null;
        currentAxisRef.current = null;
        runLengthRef.current = 0;
      }, 400);

      const targetGx = Math.round(currentX / ATTACHED_STEP);
      const targetGy = Math.round(currentY / ATTACHED_STEP);

      // Start trail at cursor target if no active origin
      if (!lastGridRef.current) {
        lastGridRef.current = { gx: targetGx, gy: targetGy };
        currentAxisRef.current = null;
        runLengthRef.current = 0;
        spawnTileAtGrid(targetGx, targetGy);
        return;
      }

      let dgx = targetGx - lastGridRef.current.gx;
      let dgy = targetGy - lastGridRef.current.gy;

      // Advance along grid to follow cursor direction with stepped cluster geometry
      while (Math.abs(dgx) > 0 || Math.abs(dgy) > 0) {
        const absX = Math.abs(dgx);
        const absY = Math.abs(dgy);

        // Decide preferred axis:
        // Capped linear runs prevent collapsing into single 1D column or ribbon.
        let preferredAxis: "x" | "y";
        if (absX > 0 && absY > 0) {
          // Diagonal motion: alternate after 2 blocks on the same axis ([■][■] then [■][■])
          if (runLengthRef.current >= 2) {
            preferredAxis = currentAxisRef.current === "x" ? "y" : "x";
          } else if (absX >= absY) {
            preferredAxis = "x";
          } else {
            preferredAxis = "y";
          }
        } else if (absX > 0) {
          // Horizontal motion: after 3 blocks, take a perpendicular cluster step
          if (runLengthRef.current >= 3) {
            preferredAxis = "y";
          } else {
            preferredAxis = "x";
          }
        } else {
          // Vertical motion: after 2 blocks, take a perpendicular cluster step
          if (runLengthRef.current >= 2) {
            preferredAxis = "x";
          } else {
            preferredAxis = "y";
          }
        }

        // Try preferred axis first, fallback to alternate orthogonal axis if cell is occupied
        const axesToTry: Array<"x" | "y"> = [
          preferredAxis,
          preferredAxis === "x" ? "y" : "x",
        ];
        const currentGrid = lastGridRef.current;
        if (!currentGrid) break;

        let stepped = false;

        for (const stepAxis of axesToTry) {
          let stepDir: number;
          if (stepAxis === "x") {
            stepDir = absX > 0 ? (dgx > 0 ? 1 : -1) : staggerSideRef.current;
          } else {
            stepDir = absY > 0 ? (dgy > 0 ? 1 : -1) : staggerSideRef.current;
          }

          const candidateGx: number = currentGrid.gx + (stepAxis === "x" ? stepDir : 0);
          const candidateGy: number = currentGrid.gy + (stepAxis === "y" ? stepDir : 0);
          const key = `${candidateGx},${candidateGy}`;

          if (!occupiedCellsRef.current.has(key)) {
            // If taking a perpendicular stagger step, toggle side for next time
            if (absX === 0 && stepAxis === "x") {
              staggerSideRef.current = -staggerSideRef.current;
            } else if (absY === 0 && stepAxis === "y") {
              staggerSideRef.current = -staggerSideRef.current;
            }

            if (stepAxis === currentAxisRef.current) {
              runLengthRef.current += 1;
            } else {
              currentAxisRef.current = stepAxis;
              runLengthRef.current = 1;
            }

            spawnTileAtGrid(candidateGx, candidateGy);
            lastGridRef.current = { gx: candidateGx, gy: candidateGy };
            stepped = true;
            break;
          }
        }

        if (!stepped) {
          break; // No adjacent free cell available
        }

        dgx = targetGx - lastGridRef.current.gx;
        dgy = targetGy - lastGridRef.current.gy;
      }
    };

    const handlePointerLeave = () => {
      lastGridRef.current = null;
      currentAxisRef.current = null;
      runLengthRef.current = 0;
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
      occupiedCellsRef.current.forEach((t) => t.el.remove());
      occupiedCellsRef.current.clear();
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
