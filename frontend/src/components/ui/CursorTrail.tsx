"use client";

import { useEffect, useRef } from "react";

// Curated solid flat color sequence
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

// 20px square syntax block
const CUBE_SIZE = 20;

// Only create a new cube when the cursor has moved at least one cube width from the last cube
const MIN_DISTANCE = 20;

// Keep approximately 6–10 visible cubes
const MAX_VISIBLE_CUBES = 8;

// Smooth fade lifetime in milliseconds
const FADE_LIFETIME_MS = 600;

/**
 * CursorTrail
 * Pure cursor-driven trail of small square syntax blocks.
 * - Every block: 20px × 20px square, exactly one syntax symbol, colorful solid background, thin dark border.
 * - Real pixel coordinates: no grid snapping, no lattice, no integer cell division.
 * - Mouse movement directly determines every cube position:
 *     - Horizontal movement -> horizontal trail [=][{][<][+][;][>]
 *     - Vertical movement   -> vertical trail [=][*][#][}][>]
 *     - Turns / curves      -> natural trail matching mouse trajectory
 * - Zero artificial pattern generation: no synthetic intermediate steps, no clusters, no forced stagger.
 * - Distance-based sampling: creates a cube only when cursor moves >= MIN_DISTANCE from last cube.
 * - Fades in place smoothly; no upward particle drift or scattering.
 * - Background layer: z-index: 5, pointer-events: none, renders behind buttons/photos/cards.
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
      // Evict oldest cube when reaching max trail length
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

      // Stays in place, fades smoothly without upward drift or rotation
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

      // Clear trail origin when mouse rests for 350ms
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = setTimeout(() => {
        lastPosRef.current = null;
      }, 350);

      // First movement event: initialize origin and place first cube
      if (!lastPosRef.current) {
        lastPosRef.current = { x: currentX, y: currentY };
        spawnCube(currentX, currentY);
        return;
      }

      // Real Euclidean distance from last spawned cube position
      const distance = Math.hypot(
        currentX - lastPosRef.current.x,
        currentY - lastPosRef.current.y
      );

      // Only create a new cube when the cursor has moved at least one cube width from the last cube
      if (distance >= MIN_DISTANCE) {
        spawnCube(currentX, currentY);
        lastPosRef.current = { x: currentX, y: currentY };
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
