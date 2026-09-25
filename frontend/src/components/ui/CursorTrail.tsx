"use client";

import { useEffect, useRef } from "react";

const SYMBOLS = [
  "{",
  "}",
  "<",
  ">",
  "(",
  ")",
  "[",
  "]",
  "/",
  ";",
  "#",
  "*",
  "+",
  "=",
  "_",
] as const;

const COLOR_PALETTES = [
  { bg: "#818CF8", text: "#1E1B4B" }, // purple / indigo
  { bg: "#A78BFA", text: "#312E81" }, // violet
  { bg: "#F472B6", text: "#881337" }, // pink
  { bg: "#34D399", text: "#064E3B" }, // green
  { bg: "#A3E635", text: "#365314" }, // lime
  { bg: "#FBBF24", text: "#78350F" }, // yellow
  { bg: "#FB923C", text: "#7C2D12" }, // orange
  { bg: "#38BDF8", text: "#0C4A6E" }, // blue
];

const MAX_TILES = 25;
const THROTTLE_MS = 75; // 1 tile every ~75ms

/**
 * CursorTrail
 * Displays a lightweight, non-blocking stream of floating syntax/code tiles
 * (<, >, {, }, /, ;, #, etc.) that trail the user's cursor.
 * Inspired directly by the GitHub Universe developer cursor effect.
 */
export function CursorTrail() {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSpawnTime = useRef(0);
  const lastPosition = useRef({ x: -100, y: -100 });

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Accessibility & capability checks
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");

    if (motionQuery.matches || !pointerQuery.matches) {
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const handlePointerMove = (e: PointerEvent) => {
      // Ignore simulated or touch pointer events
      if (e.pointerType === "touch" || e.pointerType === "pen") return;

      const now = performance.now();
      if (now - lastSpawnTime.current < THROTTLE_MS) return;

      // Only spawn if mouse has physically moved a few pixels
      const dx = e.clientX - lastPosition.current.x;
      const dy = e.clientY - lastPosition.current.y;
      if (Math.hypot(dx, dy) < 8) return;

      lastSpawnTime.current = now;
      lastPosition.current = { x: e.clientX, y: e.clientY };

      // Limit active DOM elements to prevent overload
      if (container.children.length >= MAX_TILES) {
        container.firstElementChild?.remove();
      }

      // 2. Select random symbol & color
      const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      const palette = COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)];

      // 3. Small randomized origin offset (-10px to +10px)
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = (Math.random() - 0.5) * 20;
      const startX = e.clientX + offsetX;
      const startY = e.clientY + offsetY;

      // 4. Subtle drift vector & rotation
      const driftX = (Math.random() - 0.5) * 26; // -13px to +13px
      const driftY = -16 - Math.random() * 22; // -16px to -38px upward drift
      const startRot = (Math.random() - 0.5) * 16; // -8deg to +8deg
      const endRot = startRot + (Math.random() - 0.5) * 20; // -15deg to +15deg

      // 5. Create small syntax tile element
      const tile = document.createElement("div");
      tile.textContent = symbol;
      tile.style.position = "fixed";
      tile.style.left = "0px";
      tile.style.top = "0px";
      tile.style.width = "20px";
      tile.style.height = "20px";
      tile.style.borderRadius = "5px";
      tile.style.backgroundColor = palette.bg;
      tile.style.color = palette.text;
      tile.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
      tile.style.fontSize = "11px";
      tile.style.fontWeight = "700";
      tile.style.display = "flex";
      tile.style.alignItems = "center";
      tile.style.justifyContent = "center";
      tile.style.pointerEvents = "none";
      tile.style.userSelect = "none";
      tile.style.zIndex = "9999";
      tile.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.14)";
      tile.style.willChange = "transform, opacity";

      container.appendChild(tile);

      // 6. Smooth GPU-accelerated keyframe animation
      const animation = tile.animate(
        [
          {
            opacity: 0,
            transform: `translate3d(${startX - 10}px, ${startY - 10}px, 0) scale(0.8) rotate(${startRot}deg)`,
          },
          {
            opacity: 1,
            offset: 0.15,
            transform: `translate3d(${startX - 10 + driftX * 0.15}px, ${startY - 10 + driftY * 0.15}px, 0) scale(1) rotate(${startRot}deg)`,
          },
          {
            opacity: 0.85,
            offset: 0.65,
            transform: `translate3d(${startX - 10 + driftX * 0.65}px, ${startY - 10 + driftY * 0.65}px, 0) scale(0.95) rotate(${(startRot + endRot) / 2}deg)`,
          },
          {
            opacity: 0,
            transform: `translate3d(${startX - 10 + driftX}px, ${startY - 10 + driftY}px, 0) scale(0.7) rotate(${endRot}deg)`,
          },
        ],
        {
          duration: 800,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "forwards",
        }
      );

      animation.onfinish = () => {
        tile.remove();
      };
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
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
