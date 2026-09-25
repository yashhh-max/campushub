"use client";

import { useEffect, useRef } from "react";

// Designed color sequence directly matching the reference screenshot
const COLOR_SEQUENCE = [
  "#E83151", // Hot Pink
  "#3B49DF", // Royal Blue
  "#B892FF", // Lavender / Lilac
  "#D49B00", // Mustard Gold
  "#C2410C", // Burnt Terracotta
  "#4338CA", // Deep Indigo
  "#A78BFA", // Light Purple
  "#CA8A04", // Ochre Yellow
];

// Reference syntax symbols
const SYMBOLS = ["+", "=", "-", "(", ")", "<", ">", "{", "}", "/", ";", "#", "•"];

const TILE_WIDTH = 24;
const TILE_HEIGHT = 20;
const STEP_DISTANCE = 22; // Distance between consecutive tiles along the path
const MAX_VISIBLE_TILES = 12; // Compact short trail of 6–12 tiles
const TILE_LIFETIME_MS = 650; // Smooth 650ms fadeout

/**
 * CursorTrail
 * Renders a compact, connected chain of small rectangular flat-colored code tiles
 * along the cursor's path (e.g., [ + ][   ][ = ][   ][   ][ - ][ ( ][ • ]).
 * Matches the flat graphic/editorial GitHub Universe reference screenshot.
 */
export function CursorTrail() {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const colorIndexRef = useRef(0);

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
      // Evict oldest tile if trail exceeds max length
      if (container.children.length >= MAX_VISIBLE_TILES) {
        container.firstElementChild?.remove();
      }

      // Pick sequential color for designed rhythm
      const color = COLOR_SEQUENCE[colorIndexRef.current % COLOR_SEQUENCE.length];
      colorIndexRef.current += 1;

      // 45% blank solid color tiles, 55% symbol tiles (per reference)
      const isBlank = Math.random() < 0.45;
      const symbol = isBlank
        ? ""
        : SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];

      const tile = document.createElement("div");
      tile.textContent = symbol;

      // Flat graphic geometry matching reference
      tile.style.position = "fixed";
      tile.style.left = "0px";
      tile.style.top = "0px";
      tile.style.width = `${TILE_WIDTH}px`;
      tile.style.height = `${TILE_HEIGHT}px`;
      tile.style.backgroundColor = color;
      tile.style.color = "#111827"; // Dark flat glyph
      tile.style.borderRadius = "2px"; // Crisp subtle corners
      tile.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
      tile.style.fontSize = "12px";
      tile.style.fontWeight = "700";
      tile.style.display = "flex";
      tile.style.alignItems = "center";
      tile.style.justifyContent = "center";
      tile.style.pointerEvents = "none";
      tile.style.userSelect = "none";
      tile.style.zIndex = "99999";
      tile.style.boxShadow = "none";
      tile.style.willChange = "transform, opacity";

      container.appendChild(tile);

      const halfW = TILE_WIDTH / 2;
      const halfH = TILE_HEIGHT / 2;
      const startX = x - halfW;
      const startY = y - halfH;

      // Stays along the path, holds position, then fades out smoothly (no upward bubble drift)
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
            transform: `translate3d(${startX}px, ${startY}px, 0) rotate(${angleDeg}deg) scale(0.92)`,
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
        return;
      }

      const dx = currentX - lastPointRef.current.x;
      const dy = currentY - lastPointRef.current.y;
      const dist = Math.hypot(dx, dy);

      // Only spawn when cursor has moved STEP_DISTANCE along the path
      if (dist >= STEP_DISTANCE) {
        const steps = Math.floor(dist / STEP_DISTANCE);
        const pathAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        // Subtle tilt aligning gently with movement (-5deg to +5deg)
        const subtleAngle = Math.max(-5, Math.min(5, ((pathAngle + 180) % 60) - 30));

        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const px = lastPointRef.current.x + dx * t;
          const py = lastPointRef.current.y + dy * t;
          spawnTileAt(px, py, subtleAngle);
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
