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

const TILE_SIZE = 24; // Square cubes: 24px x 24px
const SECTION_GAP = 14; // Small intentional gap (10–20px) between connected groups
const MAX_VISIBLE_TILES = 9; // Compact short trail of 6–10 connected blocks
const TILE_LIFETIME_MS = 600; // Smooth 600ms lifetime
const GROUP_PATTERN = [2, 4, 3, 2, 3]; // Group sizes matching reference drawing

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
 * Renders a connected chain of small square code cubes following the cursor trajectory.
 * Rules enforced:
 * 1. 24x24px square cubes, exactly one syntax symbol per cube, zero blank tiles.
 * 2. Cubes NEVER overlap or stack on top of each other.
 * 3. Controlled edge-to-edge touching within section groups.
 * 4. Occasional small intentional section gap (14px) between groups matching reference drawing.
 * 5. Position derived purely from the recent cursor path (horizontal is flat, diagonal stair-steps, curves bend naturally, corners turn cleanly).
 * 6. Zero upward drift, zero particle explosion, fades smoothly in place.
 */
export function CursorTrail() {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeCubesRef = useRef<ActiveCube[]>([]);
  const pathPointsRef = useRef<Point[]>([]);
  const lastPlacedPointRef = useRef<Point | null>(null);

  const colorIndexRef = useRef(0);
  const lastSymbolRef = useRef("");
  const groupCountRef = useRef(0);
  const groupPatternIndexRef = useRef(0);
  const nextNeedsGapRef = useRef(false);
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
      // Evict oldest tile if trail exceeds max length to maintain a compact chain of 6-10
      if (activeCubesRef.current.length >= MAX_VISIBLE_TILES) {
        const oldest = activeCubesRef.current.shift();
        if (oldest) {
          oldest.element.remove();
        }
      }

      // Pick sequential color
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

      // Anchored along path, holds position, then fades out smoothly in place (zero upward drift)
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
     * Two 24x24 cubes overlap if both horizontal and vertical distances are strictly < 22px.
     */
    const doesOverlapOlderCubes = (candX: number, candY: number, origin: Point): boolean => {
      for (let i = 0; i < activeCubesRef.current.length; i++) {
        const cube = activeCubesRef.current[i];
        if (Math.abs(cube.x - origin.x) < 1 && Math.abs(cube.y - origin.y) < 1) {
          continue;
        }
        const dx = Math.abs(candX - cube.x);
        const dy = Math.abs(candY - cube.y);
        if (dx < 22 && dy < 22) {
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
      isGap: boolean
    ): { point: Point; segmentIndex: number } | null => {
      if (points.length < 2) return null;

      let accumulatedArc = 0;

      for (let i = 1; i < points.length; i++) {
        const pA = points[i - 1];
        const pB = points[i];
        const segLen = Math.hypot(pB.x - pA.x, pB.y - pA.y);

        if (segLen === 0) continue;

        // Sample in 1px steps along the segment for precision
        const stepCount = Math.max(1, Math.ceil(segLen));
        for (let s = 1; s <= stepCount; s++) {
          const t = Math.min(1, s / stepCount);
          const currentArc = accumulatedArc + segLen * t;

          const candX = pA.x + (pB.x - pA.x) * t;
          const candY = pA.y + (pB.y - pA.y) * t;

          // Direction from origin
          const chordX = candX - origin.x;
          const chordY = candY - origin.y;
          const chordDist = Math.hypot(chordX, chordY);

          if (chordDist === 0) continue;

          const ux = chordX / chordDist;
          const uy = chordY / chordDist;
          const maxAxis = Math.max(Math.abs(ux), Math.abs(uy));
          // Minimum step for touching edge (23px along dominant axis)
          const touchStep = maxAxis > 0.001 ? 23 / maxAxis : 23;
          const requiredDist = isGap ? touchStep + SECTION_GAP : touchStep;

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

      // Deduplicate if both pointermove and mousemove fire on the same pixel
      if (
        currentX === lastProcessedPosRef.current.x &&
        currentY === lastProcessedPosRef.current.y
      ) {
        return;
      }
      lastProcessedPosRef.current = { x: currentX, y: currentY };

      // Reset idle timer
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = setTimeout(() => {
        // Cursor stationary for 500ms; reset path state for fresh start on next move
        lastPlacedPointRef.current = null;
        pathPointsRef.current = [];
      }, 500);

      // If trail has reset, start at current cursor position
      if (!lastPlacedPointRef.current) {
        lastPlacedPointRef.current = { x: currentX, y: currentY };
        pathPointsRef.current = [{ x: currentX, y: currentY }];
        spawnTileAt(currentX, currentY);

        groupCountRef.current = 1;
        const currentTarget = GROUP_PATTERN[groupPatternIndexRef.current % GROUP_PATTERN.length];
        nextNeedsGapRef.current = groupCountRef.current >= currentTarget;
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

        const candidate = findNextCandidate(
          pathPointsRef.current,
          origin,
          nextNeedsGapRef.current
        );

        if (!candidate) {
          // Path distance not yet reached or waiting for collision clearance
          break;
        }

        const { point, segmentIndex } = candidate;

        // Place non-overlapping cube
        spawnTileAt(point.x, point.y);
        lastPlacedPointRef.current = point;

        // Update grouping logic
        groupCountRef.current += 1;
        const currentTarget = GROUP_PATTERN[groupPatternIndexRef.current % GROUP_PATTERN.length];

        if (groupCountRef.current >= currentTarget) {
          nextNeedsGapRef.current = true;
          groupCountRef.current = 0;
          groupPatternIndexRef.current += 1;
        } else {
          nextNeedsGapRef.current = false;
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
