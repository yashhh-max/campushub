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

// Compact trail length of 8–12 visible cubes
const MAX_VISIBLE_CUBES = 10;

// Fade duration in milliseconds
const FADE_LIFETIME_MS = 600;

interface ActiveCubeRecord {
  x: number;
  y: number;
  el: HTMLDivElement;
}

/**
 * CursorTrail
 * Local Edge-Attachment Chain Model:
 * - Every block: 20px × 20px square, exactly ONE syntax symbol, flat color, 1px dark border, 1px radius, 0° rotation.
 * - Local edge attachment: each new cube attaches to one of the 4 edge neighbors of the previous cube:
 *     RIGHT: (prevX + 20, prevY)
 *     LEFT:  (prevX - 20, prevY)
 *     DOWN:  (prevX, prevY + 20)
 *     UP:    (prevX, prevY - 20)
 * - Each new cube shares a FULL EDGE with the previous cube (no corner-only contact, no overlap, no gap).
 * - Cursor direction selects the neighbor:
 *     abs(dx) >= abs(dy) -> horizontal step (LEFT/RIGHT by sign of dx)
 *     abs(dy) > abs(dx)  -> vertical step (UP/DOWN by sign of dy)
 * - Zero global grid, zero grid snapping, zero run caps, zero forced cluster/puzzle generation.
 * - Zero random offsets, zero upward drift, zero particle scattering.
 * - Background layer (z-index: 5, pointer-events: none, renders behind buttons, photos, cards, and text).
 */
export function CursorTrail() {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastCubeRef = useRef<{ x: number; y: number } | null>(null);
  const activeCubesRef = useRef<ActiveCubeRecord[]>([]);
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

    // Check if an active cube already occupies the exact coordinate (prevents duplicate stacking when reversing)
    const isOccupied = (x: number, y: number): boolean => {
      for (let i = 0; i < activeCubesRef.current.length; i++) {
        const c = activeCubesRef.current[i];
        if (Math.abs(x - c.x) < 8 && Math.abs(y - c.y) < 8) {
          return true;
        }
      }
      return false;
    };

    const spawnCube = (x: number, y: number): boolean => {
      if (isOccupied(x, y)) {
        return false;
      }

      // Evict oldest cube when reaching max compact trail length to maintain short continuous snake
      if (activeCubesRef.current.length >= MAX_VISIBLE_CUBES) {
        const oldest = activeCubesRef.current.shift();
        if (oldest) {
          oldest.el.remove();
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
      activeCubesRef.current.push({ x, y, el: cube });

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
        const idx = activeCubesRef.current.findIndex((c) => c.el === cube);
        if (idx !== -1) {
          activeCubesRef.current.splice(idx, 1);
        }
      };

      return true;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch" || e.pointerType === "pen") return;

      const currentX = e.clientX;
      const currentY = e.clientY;

      // If trail had completely vanished or first movement, initialize origin cleanly
      if (!lastCubeRef.current || activeCubesRef.current.length === 0) {
        lastCubeRef.current = { x: currentX, y: currentY };
        spawnCube(currentX, currentY);
        return;
      }

      let dx = currentX - lastCubeRef.current.x;
      let dy = currentY - lastCubeRef.current.y;
      const dist = Math.hypot(dx, dy);

      // Discard massive window jumps (e.g. alt-tab or multi-monitor teleport > 250px)
      if (dist > 250) {
        lastCubeRef.current = { x: currentX, y: currentY };
        spawnCube(currentX, currentY);
        return;
      }

      // Local edge attachment:
      // When cursor moves away from last placed cube, step to one of the 4 edge neighbors
      // (RIGHT: +20, LEFT: -20, DOWN: +20, UP: -20) according to dominant vector direction
      let iterations = 0;
      while (
        (Math.abs(dx) >= CUBE_SIZE || Math.abs(dy) >= CUBE_SIZE) &&
        iterations < 20
      ) {
        iterations++;
        let nextX: number = lastCubeRef.current.x;
        let nextY: number = lastCubeRef.current.y;

        if (Math.abs(dx) >= Math.abs(dy)) {
          // Primarily horizontal cursor movement
          nextX += (dx > 0 ? 1 : -1) * CUBE_SIZE;
        } else {
          // Primarily vertical cursor movement
          nextY += (dy > 0 ? 1 : -1) * CUBE_SIZE;
        }

        spawnCube(nextX, nextY);
        lastCubeRef.current = { x: nextX, y: nextY };

        dx = currentX - nextX;
        dy = currentY - nextY;
      }
    };

    const handlePointerLeave = () => {
      lastCubeRef.current = null;
    };

    // Attach single pointermove listener on window
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.documentElement.removeEventListener("pointerleave", handlePointerLeave);
      activeCubesRef.current.forEach((c) => c.el.remove());
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

