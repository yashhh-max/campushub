"use client";

import { useEffect, useRef } from "react";

// Designed color sequence for rhythmic visual flow matching reference
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

// Single-character code/syntax elements (strictly one symbol per cube)
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

// Visual scale tuned for decorative syntax blocks (compact, non-button appearance)
const TILE_SIZE = 20; // 20px x 20px square cubes
const TOUCH_STEP = 19.5; // Center-to-center distance for edge-to-edge touching
const NATURAL_GAP = 5; // Subtle 4–6px natural separation between code block runs
const MAX_VISIBLE_TILES = 10; // Compact short trail of 6–10 blocks
const TILE_LIFETIME_MS = 650; // Smooth 650ms lifetime

interface Point {
  x: number;
  y: number;
}

interface ActiveCube {
  x: number;
  y: number;
  element: HTMLDivElement;
}

/**
 * CursorTrail
 * Renders a compact, designer-crafted strip of colorful square programming blocks along the cursor path.
 * - Decorative scale (20x20px), crisp 1.5px dark border, 2px radius.
 * - Single syntax symbol per cube, zero blank tiles.
 * - Cubes touch edge-to-edge in continuous sections with subtle 5px natural breaks.
 * - No stacking or overlapping badges.
 * - Extremely subtle -0.9° to +0.9° rotation to avoid mechanical rigidity.
 * - Anchors in place and fades out smoothly without upward drift or scattering.
 */
export function CursorTrail() {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeCubesRef = useRef<ActiveCube[]>([]);
  const pathPointsRef = useRef<Point[]>([]);
  const lastPlacedPointRef = useRef<Point | null>(null);

  const colorIndexRef = useRef(0);
  const tileIndexRef = useRef(0);
  const lastSymbolRef = useRef("");
  const continuousRunCountRef = useRef(0);
  const nextTargetRunRef = useRef(3);
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

    const spawnTileAt = (x: number, y: number): ActiveCube => {
      // Keep trail compact by evicting oldest tile when reaching max length
      if (activeCubesRef.current.length >= MAX_VISIBLE_TILES) {
        const oldest = activeCubesRef.current.shift();
        if (oldest) {
          oldest.element.remove();
        }
      }

      // Pick sequential vibrant color
      const color = COLOR_SEQUENCE[colorIndexRef.current % COLOR_SEQUENCE.length];
      colorIndexRef.current += 1;

      // Pick exactly ONE symbol (no consecutive duplicates, zero blank blocks)
      let symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      if (symbol === lastSymbolRef.current) {
        symbol = SYMBOLS[(SYMBOLS.indexOf(symbol) + 1) % SYMBOLS.length];
      }
      lastSymbolRef.current = symbol;

      // Subtle rotation (-0.9deg to +0.9deg) preventing mechanical rigidity
      const rotIndex = (tileIndexRef.current * 7) % 5 - 2; // -2, -1, 0, 1, 2
      const rotationDeg = rotIndex * 0.45; // -0.9, -0.45, 0, +0.45, +0.9 deg
      tileIndexRef.current += 1;

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
      tile.style.border = "1.5px solid #0F172A"; // Crisp physical cube boundary
      tile.style.borderRadius = "2px"; // Subtle 2px corner radius
      tile.style.boxSizing = "border-box";
      tile.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
      tile.style.fontSize = "11px";
      tile.style.fontWeight = "800";
      tile.style.display = "flex";
      tile.style.alignItems = "center";
      tile.style.justifyContent = "center";
      tile.style.pointerEvents = "none";
      tile.style.userSelect = "none";
      tile.style.zIndex = "99999";
      tile.style.boxShadow = "none";
      tile.style.lineHeight = "1";
      tile.style.willChange = "transform, opacity";

      container.appendChild(tile);

      const halfSize = TILE_SIZE / 2;
      const startX = x - halfSize;
      const startY = y - halfSize;

      // Anchored along path, holds position, then fades out smoothly in place (zero upward drift)
      const animation = tile.animate(
        [
          {
            opacity: 1,
            transform: `translate3d(${startX}px, ${startY}px, 0) rotate(${rotationDeg}deg) scale(1)`,
          },
          {
            opacity: 1,
            offset: 0.45,
            transform: `translate3d(${startX}px, ${startY}px, 0) rotate(${rotationDeg}deg) scale(1)`,
          },
          {
            opacity: 0,
            offset: 1.0,
            transform: `translate3d(${startX}px, ${startY}px, 0) rotate(${rotationDeg}deg) scale(0.96)`,
          },
        ],
        {
          duration: TILE_LIFETIME_MS,
          easing: "ease-out",
          fill: "forwards",
        }
      );

      const cubeRecord: ActiveCube = { x, y, element: tile };
      activeCubesRef.current.push(cubeRecord);

      animation.onfinish = () => {
        const index = activeCubesRef.current.indexOf(cubeRecord);
        if (index !== -1) {
          activeCubesRef.current.splice(index, 1);
        }
        tile.remove();
        if (activeCubesRef.current.length === 0) {
          lastPlacedPointRef.current = null;
          pathPointsRef.current = [];
        }
      };

      return cubeRecord;
    };

    /**
     * Checks if a candidate position overlaps ANY older active cube in the trail.
     * Excludes the immediate origin cube whose separation is enforced by step distance.
     * Two 20x20 cubes overlap if both horizontal and vertical distances are strictly < 18.5px.
     */
    const doesOverlapOlderCubes = (candX: number, candY: number, origin: Point): boolean => {
      for (let i = 0; i < activeCubesRef.current.length; i++) {
        const cube = activeCubesRef.current[i];
        if (Math.abs(cube.x - origin.x) < 1 && Math.abs(cube.y - origin.y) < 1) {
          continue;
        }
        const dx = Math.abs(candX - cube.x);
        const dy = Math.abs(candY - cube.y);
        if (dx < 18.5 && dy < 18.5) {
          return true;
        }
      }
      return false;
    };

    /**
     * Walks along the polyline path to find the next candidate point that:
     * 1. Satisfies the minimum required step distance along the direction vector.
     * 2. Completely avoids overlapping any active visible cube.
     */
    const findNextCandidate = (
      points: Point[],
      origin: Point,
      isNaturalGap: boolean
    ): { point: Point; segmentIndex: number } | null => {
      if (points.length < 2) return null;

      let accumulatedArc = 0;

      for (let i = 1; i < points.length; i++) {
        const pA = points[i - 1];
        const pB = points[i];
        const segLen = Math.hypot(pB.x - pA.x, pB.y - pA.y);

        if (segLen === 0) continue;

        const stepCount = Math.max(1, Math.ceil(segLen));
        for (let s = 1; s <= stepCount; s++) {
          const t = Math.min(1, s / stepCount);
          const currentArc = accumulatedArc + segLen * t;

          const candX = pA.x + (pB.x - pA.x) * t;
          const candY = pA.y + (pB.y - pA.y) * t;

          // Direction vector from origin
          const chordX = candX - origin.x;
          const chordY = candY - origin.y;
          const chordDist = Math.hypot(chordX, chordY);

          if (chordDist === 0) continue;

          const ux = chordX / chordDist;
          const uy = chordY / chordDist;
          const maxAxis = Math.max(Math.abs(ux), Math.abs(uy));
          // Minimum step for touching edge along dominant axis
          const stepTouch = maxAxis > 0.001 ? TOUCH_STEP / maxAxis : TOUCH_STEP;
          const requiredDist = isNaturalGap ? stepTouch + NATURAL_GAP : stepTouch;

          if (currentArc >= requiredDist) {
            // Strict non-overlap collision test against older cubes
            if (!doesOverlapOlderCubes(candX, candY, origin)) {
              return {
                point: { x: candX, y: candY },
                segmentIndex: i,
              };
            }
          }
        }

        accumulatedArc += segLen;
      }

      return null;
    };

    const handlePointerMove = (e: PointerEvent | MouseEvent) => {
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

      // Reset idle timer (clears path tracking when stationary for 500ms)
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = setTimeout(() => {
        lastPlacedPointRef.current = null;
        pathPointsRef.current = [];
        continuousRunCountRef.current = 0;
      }, 500);

      // If trail has reset, start at current cursor position
      if (!lastPlacedPointRef.current) {
        lastPlacedPointRef.current = { x: currentX, y: currentY };
        pathPointsRef.current = [{ x: currentX, y: currentY }];
        spawnTileAt(currentX, currentY);

        continuousRunCountRef.current = 1;
        nextTargetRunRef.current = 3;
        return;
      }

      // Append new cursor point to polyline path
      pathPointsRef.current.push({ x: currentX, y: currentY });

      // Process polyline to place non-overlapping cubes along the path
      let safetyCounter = 0;
      while (pathPointsRef.current.length >= 2 && safetyCounter < 10) {
        safetyCounter++;

        const origin = lastPlacedPointRef.current;
        if (!origin) break;

        const needsNaturalGap = continuousRunCountRef.current >= nextTargetRunRef.current;
        const candidate = findNextCandidate(
          pathPointsRef.current,
          origin,
          needsNaturalGap
        );

        if (!candidate) {
          // Path distance not yet reached or waiting for collision clearance
          break;
        }

        const { point, segmentIndex } = candidate;

        // Place non-overlapping cube
        spawnTileAt(point.x, point.y);
        lastPlacedPointRef.current = point;

        // Update natural run count (subtle 5px break after a run of 3–4 cubes)
        if (needsNaturalGap) {
          continuousRunCountRef.current = 1;
          nextTargetRunRef.current = nextTargetRunRef.current === 3 ? 4 : 3;
        } else {
          continuousRunCountRef.current += 1;
        }

        // Advance polyline path starting from the newly placed point
        pathPointsRef.current = [
          point,
          ...pathPointsRef.current.slice(segmentIndex),
        ];
      }
    };

    const handlePointerLeave = () => {
      lastPlacedPointRef.current = null;
      pathPointsRef.current = [];
      continuousRunCountRef.current = 0;
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
      if (container) {
        container.innerHTML = "";
      }
      activeCubesRef.current = [];
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
