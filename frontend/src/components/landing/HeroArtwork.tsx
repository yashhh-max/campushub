"use client";

import React, { useRef, useEffect, useCallback } from "react";

export interface HeroArtworkProps {
  /** Target cursor coordinates normalized to [-1, 1] provided by hero pointer tracking */
  cursorRef: React.RefObject<{ x: number; y: number }>;
  /** Whether the pointer is currently hovering within the active hero tracking area */
  isHoveredRef: React.RefObject<boolean>;
  className?: string;
}

interface SyntaxTileConfig {
  char: string;
  bgColor: string;
  textColor: string;
  left?: string;
  right?: string;
  top?: string;
  bottom?: string;
  baseRot: number;
  depth: number;
}

const SYNTAX_TILES: SyntaxTileConfig[] = [
  { char: "{", bgColor: "#818CF8", textColor: "#1E1B4B", left: "4%", top: "14%", baseRot: -8, depth: 0.27 },
  { char: ">", bgColor: "#34D399", textColor: "#064E3B", left: "15%", top: "4%", baseRot: 6, depth: 0.32 },
  { char: "<", bgColor: "#38BDF8", textColor: "#0C4A6E", left: "26%", top: "20%", baseRot: -5, depth: 0.25 },
  { char: "/", bgColor: "#FB7185", textColor: "#881337", left: "38%", top: "6%", baseRot: 10, depth: 0.34 },
  { char: "}", bgColor: "#FBBF24", textColor: "#78350F", left: "50%", top: "16%", baseRot: -7, depth: 0.30 },
  { char: ";", bgColor: "#C084FC", textColor: "#581C87", left: "63%", top: "5%", baseRot: 8, depth: 0.29 },
  { char: "#", bgColor: "#FB923C", textColor: "#7C2D12", left: "76%", top: "18%", baseRot: -10, depth: 0.33 },
  { char: "*", bgColor: "#E879F9", textColor: "#701A75", right: "2%", top: "34%", baseRot: 12, depth: 0.35 },
  { char: "+", bgColor: "#4ADE80", textColor: "#064E3B", left: "10%", bottom: "14%", baseRot: -6, depth: 0.28 },
  { char: "(", bgColor: "#A78BFA", textColor: "#312E81", right: "6%", bottom: "10%", baseRot: 7, depth: 0.31 },
];

/**
 * HeroArtwork
 * Dedicated, single-composed interactive hero illustration inspired directly by GitHub Universe.
 * Features:
 * - A collegiate mascot ("Hubby") with head tilting and gaze tracking cursor position
 * - Oversized, colorful graphic silhouettes cascading behind the mascot with multi-layer depth
 * - Floating rounded rectangular code/syntax tiles (<, >, {, }, /, ;, #, *, +, () with organic inertia
 * - Zero React state updates on pointermove (pure refs + requestAnimationFrame + translate3d)
 * - Automatic resting reset on pointerleave and graceful handling of prefers-reduced-motion / touch
 */
export function HeroArtwork({ cursorRef, isHoveredRef, className = "" }: HeroArtworkProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Layer element references
  const shape6Ref = useRef<HTMLDivElement>(null);
  const shape5Ref = useRef<HTMLDivElement>(null);
  const shape4Ref = useRef<HTMLDivElement>(null);
  const shape3Ref = useRef<HTMLDivElement>(null);
  const shape2Ref = useRef<HTMLDivElement>(null);
  const shape1Ref = useRef<HTMLDivElement>(null);

  const characterRef = useRef<HTMLDivElement>(null);
  const leftPupilRef = useRef<SVGCircleElement>(null);
  const rightPupilRef = useRef<SVGCircleElement>(null);
  const tasselRef = useRef<SVGLineElement>(null);

  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sparkRefs = useRef<(SVGSVGElement | null)[]>([]);

  // Internal smooth coordinates
  const currentX = useRef(0);
  const currentY = useRef(0);
  const rafId = useRef<number | null>(null);
  const isSupported = useRef(true);

  const updateTransforms = useCallback(() => {
    const cx = currentX.current;
    const cy = currentY.current;

    // 1. Shapes cascading fan (depths 0.08 -> 0.22)
    if (shape6Ref.current) {
      shape6Ref.current.style.transform = `translate3d(${(cx * 7).toFixed(2)}px, ${(cy * 5).toFixed(2)}px, 0) rotate(${(cx * -2.2).toFixed(2)}deg)`;
    }
    if (shape5Ref.current) {
      shape5Ref.current.style.transform = `translate3d(${(cx * 10).toFixed(2)}px, ${(cy * 7).toFixed(2)}px, 0) rotate(${(cx * -1.8).toFixed(2)}deg)`;
    }
    if (shape4Ref.current) {
      shape4Ref.current.style.transform = `translate3d(${(cx * 13).toFixed(2)}px, ${(cy * 9).toFixed(2)}px, 0) rotate(${(cx * -1.2).toFixed(2)}deg)`;
    }
    if (shape3Ref.current) {
      shape3Ref.current.style.transform = `translate3d(${(cx * 16).toFixed(2)}px, ${(cy * 11).toFixed(2)}px, 0) rotate(${(cx * 0.5).toFixed(2)}deg)`;
    }
    if (shape2Ref.current) {
      shape2Ref.current.style.transform = `translate3d(${(cx * 19).toFixed(2)}px, ${(cy * 13).toFixed(2)}px, 0) rotate(${(cx * 2.0).toFixed(2)}deg)`;
    }
    if (shape1Ref.current) {
      shape1Ref.current.style.transform = `translate3d(${(cx * 22).toFixed(2)}px, ${(cy * 15).toFixed(2)}px, 0) rotate(${(cx * 3.2).toFixed(2)}deg)`;
    }

    // 2. Character head movement & tilt (depth ~0.26)
    if (characterRef.current) {
      const charX = cx * 25;
      const charY = cy * 18;
      const rot = cx * 4.8;
      const scale = 1 + (Math.abs(cx) + Math.abs(cy)) * 0.015;
      characterRef.current.style.transform = `translate3d(${charX.toFixed(2)}px, ${charY.toFixed(2)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
    }

    // 3. Eye gaze / pupil tracking (pupils look towards cursor)
    const pupilX = cx * 7.5;
    const pupilY = cy * 5.5;
    if (leftPupilRef.current) {
      leftPupilRef.current.style.transform = `translate3d(${pupilX.toFixed(2)}px, ${pupilY.toFixed(2)}px, 0)`;
    }
    if (rightPupilRef.current) {
      rightPupilRef.current.style.transform = `translate3d(${pupilX.toFixed(2)}px, ${pupilY.toFixed(2)}px, 0)`;
    }

    // 4. Cap tassel sway
    if (tasselRef.current) {
      tasselRef.current.style.transform = `rotate(${(cx * -14).toFixed(2)}deg)`;
    }

    // 5. Floating syntax / code tiles
    SYNTAX_TILES.forEach((tile, index) => {
      const el = tileRefs.current[index];
      if (el) {
        const moveX = cx * 42 * tile.depth;
        const moveY = cy * 34 * tile.depth;
        const rot = tile.baseRot + cx * 10 * tile.depth;
        el.style.transform = `translate3d(${moveX.toFixed(2)}px, ${moveY.toFixed(2)}px, 0) rotate(${rot.toFixed(2)}deg)`;
      }
    });

    // 6. Foreground sparkle highlights
    sparkRefs.current.forEach((spark, i) => {
      if (spark) {
        const factor = i === 0 ? 0.35 : 0.38;
        const sx = cx * 45 * factor;
        const sy = cy * 36 * factor;
        const sRot = cx * 18 * factor;
        spark.style.transform = `translate3d(${sx.toFixed(2)}px, ${sy.toFixed(2)}px, 0) rotate(${sRot.toFixed(2)}deg)`;
      }
    });
  }, []);

  const loop = useCallback(() => {
    const target = cursorRef.current || { x: 0, y: 0 };
    const dx = target.x - currentX.current;
    const dy = target.y - currentY.current;

    // Smooth inertia lerp factor
    currentX.current += dx * 0.08;
    currentY.current += dy * 0.08;

    updateTransforms();

    const isHovered = isHoveredRef.current;
    const isSettled =
      !isHovered &&
      Math.abs(dx) < 0.0006 &&
      Math.abs(dy) < 0.0006 &&
      Math.abs(currentX.current) < 0.0006 &&
      Math.abs(currentY.current) < 0.0006;

    if (isSettled) {
      currentX.current = 0;
      currentY.current = 0;
      updateTransforms();
      rafId.current = null;
      return;
    }

    rafId.current = requestAnimationFrame(loop);
  }, [cursorRef, isHoveredRef, updateTransforms]);

  // Start animation loop on demand
  useEffect(() => {
    if (!isSupported.current) return;

    const interval = setInterval(() => {
      if (!isSupported.current) return;
      const target = cursorRef.current || { x: 0, y: 0 };
      const hasMotion =
        Math.abs(target.x - currentX.current) > 0.001 ||
        Math.abs(target.y - currentY.current) > 0.001 ||
        isHoveredRef.current;

      if (hasMotion && rafId.current === null) {
        rafId.current = requestAnimationFrame(loop);
      }
    }, 32);

    return () => clearInterval(interval);
  }, [cursorRef, isHoveredRef, loop]);

  // Support check for reduced motion and fine hover pointer
  useEffect(() => {
    if (typeof window === "undefined") return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");

    const checkSupport = () => {
      const supported = !motionQuery.matches && pointerQuery.matches;
      isSupported.current = supported;

      if (!supported) {
        if (rafId.current !== null) {
          cancelAnimationFrame(rafId.current);
          rafId.current = null;
        }
        currentX.current = 0;
        currentY.current = 0;
        updateTransforms();
      } else if (rafId.current === null) {
        rafId.current = requestAnimationFrame(loop);
      }
    };

    checkSupport();

    motionQuery.addEventListener("change", checkSupport);
    pointerQuery.addEventListener("change", checkSupport);

    return () => {
      motionQuery.removeEventListener("change", checkSupport);
      pointerQuery.removeEventListener("change", checkSupport);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [loop, updateTransforms]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full max-w-[560px] h-[210px] sm:h-[240px] select-none pointer-events-none mx-auto overflow-visible ${className}`}
      aria-hidden="true"
    >
      {/* Background Soft Glow Aura */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-indigo-500/15 to-amber-500/10 blur-2xl rounded-full transform scale-90 -z-10" />

      {/* ========================================================
          OVERSIZED COLORFUL GRAPHIC SHAPES CASCADE (Behind mascot)
          Fanning out towards the left, matching reference screenshot
      ======================================================== */}
      <div className="absolute inset-0 z-0">
        {/* Shape 6 (Deep Purple/Lavender, Furthest Left & Rear) */}
        <div
          ref={shape6Ref}
          className="absolute bottom-0 left-[6%] sm:left-[8%] w-[72px] sm:w-[82px] h-[130px] sm:h-[148px] rounded-t-[36px] sm:rounded-t-[41px] bg-gradient-to-b from-[#C084FC] to-[#9333EA] shadow-md will-change-transform"
          style={{ transform: "translate3d(0, 0, 0)" }}
        />

        {/* Shape 5 (Vivid Magenta / Pink) */}
        <div
          ref={shape5Ref}
          className="absolute bottom-0 left-[15%] sm:left-[17%] w-[78px] sm:w-[88px] h-[145px] sm:h-[165px] rounded-t-[39px] sm:rounded-t-[44px] bg-gradient-to-b from-[#F472B6] to-[#E11D48] shadow-md will-change-transform"
          style={{ transform: "translate3d(0, 0, 0)" }}
        />

        {/* Shape 4 (Bright Warm Orange) */}
        <div
          ref={shape4Ref}
          className="absolute bottom-0 left-[24%] sm:left-[27%] w-[84px] sm:w-[94px] h-[160px] sm:h-[180px] rounded-t-[42px] sm:rounded-t-[47px] bg-gradient-to-b from-[#FB923C] to-[#EA580C] shadow-md will-change-transform"
          style={{ transform: "translate3d(0, 0, 0)" }}
        />

        {/* Shape 3 (Electric Indigo / Blue) */}
        <div
          ref={shape3Ref}
          className="absolute bottom-0 left-[34%] sm:left-[37%] w-[90px] sm:w-[100px] h-[175px] sm:h-[196px] rounded-t-[45px] sm:rounded-t-[50px] bg-gradient-to-b from-[#6366F1] to-[#3B82F6] shadow-md will-change-transform"
          style={{ transform: "translate3d(0, 0, 0)" }}
        />

        {/* Shape 2 (Fresh Mint Green) */}
        <div
          ref={shape2Ref}
          className="absolute bottom-0 left-[44%] sm:left-[47%] w-[96px] sm:w-[106px] h-[190px] sm:h-[212px] rounded-t-[48px] sm:rounded-t-[53px] bg-gradient-to-b from-[#34D399] to-[#059669] shadow-md will-change-transform"
          style={{ transform: "translate3d(0, 0, 0)" }}
        />

        {/* Shape 1 (Warm Golden Yellow, Directly Behind Mascot) */}
        <div
          ref={shape1Ref}
          className="absolute bottom-0 left-[54%] sm:left-[57%] w-[102px] sm:w-[112px] h-[204px] sm:h-[226px] rounded-t-[51px] sm:rounded-t-[56px] bg-gradient-to-b from-[#FCD34D] to-[#D97706] shadow-lg will-change-transform"
          style={{ transform: "translate3d(0, 0, 0)" }}
        />
      </div>

      {/* ========================================================
          CAMPUSHUB SCHOLAR MASCOT ("HUBBY")
          Focal character with reactive head tilt and eye tracking
      ======================================================== */}
      <div
        ref={characterRef}
        className="absolute bottom-0 right-[2%] sm:right-[5%] w-[185px] sm:w-[210px] h-[200px] sm:h-[225px] z-10 will-change-transform origin-bottom-center"
        style={{ transform: "translate3d(0, 0, 0)" }}
      >
        <svg
          viewBox="0 0 210 225"
          className="w-full h-full overflow-visible drop-shadow-xl"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Mascot Ears */}
          <path
            d="M 28 70 Q 20 20 62 44 Z"
            fill="#1E1B4B"
          />
          <path
            d="M 32 64 Q 28 32 54 48 Z"
            fill="#C4B5FD"
            opacity="0.8"
          />
          <path
            d="M 182 70 Q 190 20 148 44 Z"
            fill="#1E1B4B"
          />
          <path
            d="M 178 64 Q 182 32 156 48 Z"
            fill="#C4B5FD"
            opacity="0.8"
          />

          {/* Main Dark Head Silhouette */}
          <ellipse
            cx="105"
            cy="124"
            rx="86"
            ry="92"
            fill="#0F172A"
          />

          {/* Soft Friendly Face Mask Plate */}
          <ellipse
            cx="105"
            cy="138"
            rx="66"
            ry="64"
            fill="url(#faceGrad)"
          />

          {/* Cheek Blush Ovals */}
          <ellipse
            cx="64"
            cy="156"
            rx="12"
            ry="7"
            fill="#FB7185"
            opacity="0.45"
          />
          <ellipse
            cx="146"
            cy="156"
            rx="12"
            ry="7"
            fill="#FB7185"
            opacity="0.45"
          />

          {/* Eye Scleras (Whites) */}
          <ellipse
            cx="76"
            cy="128"
            rx="20"
            ry="24"
            fill="#FFFFFF"
            stroke="#0F172A"
            strokeWidth="3.5"
          />
          <ellipse
            cx="134"
            cy="128"
            rx="20"
            ry="24"
            fill="#FFFFFF"
            stroke="#0F172A"
            strokeWidth="3.5"
          />

          {/* Left Eye Pupil (Tracks Cursor) */}
          <g>
            <circle
              ref={leftPupilRef}
              cx="76"
              cy="128"
              r="13"
              fill="#0F172A"
              className="will-change-transform"
              style={{ transform: "translate3d(0, 0, 0)" }}
            />
            {/* White Specular Highlights in Left Eye */}
            <circle cx="72" cy="122" r="4.5" fill="#FFFFFF" pointerEvents="none" />
            <circle cx="81" cy="133" r="2" fill="#FFFFFF" opacity="0.85" pointerEvents="none" />
          </g>

          {/* Right Eye Pupil (Tracks Cursor) */}
          <g>
            <circle
              ref={rightPupilRef}
              cx="134"
              cy="128"
              r="13"
              fill="#0F172A"
              className="will-change-transform"
              style={{ transform: "translate3d(0, 0, 0)" }}
            />
            {/* White Specular Highlights in Right Eye */}
            <circle cx="130" cy="122" r="4.5" fill="#FFFFFF" pointerEvents="none" />
            <circle cx="139" cy="133" r="2" fill="#FFFFFF" opacity="0.85" pointerEvents="none" />
          </g>

          {/* Nose */}
          <polygon
            points="105,142 101,148 109,148"
            fill="#4338CA"
          />

          {/* Cute Smile */}
          <path
            d="M 97 154 Q 105 162 113 154"
            stroke="#0F172A"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />

          {/* Collegiate Graduation Mortarboard Cap */}
          <g transform="translate(105, 42) rotate(-8)">
            {/* Cap Base Skullcap */}
            <path
              d="M -32 6 Q 0 -6 32 6 L 24 16 Q 0 10 -24 16 Z"
              fill="#1E1B4B"
            />
            {/* Diamond Mortarboard Plate */}
            <polygon
              points="0,-18 52,2 0,22 -52,2"
              fill="#4338CA"
              stroke="#312E81"
              strokeWidth="2.5"
            />
            {/* Golden Center Button */}
            <circle cx="0" cy="2" r="4.5" fill="#FBBF24" stroke="#D97706" strokeWidth="1" />
            {/* Hanging Golden Tassel (Sways with cursor) */}
            <line
              ref={tasselRef}
              x1="0"
              y1="2"
              x2="36"
              y2="34"
              stroke="#F59E0B"
              strokeWidth="3"
              strokeLinecap="round"
              className="will-change-transform origin-top-left"
              style={{ transform: "rotate(0deg)" }}
            />
            <circle cx="36" cy="34" r="3.5" fill="#D97706" />
          </g>

          {/* Definitions */}
          <defs>
            <radialGradient id="faceGrad" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#FFFBEB" />
              <stop offset="85%" stopColor="#FED7AA" />
              <stop offset="100%" stopColor="#FDBA74" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* ========================================================
          FLOATING SYNTAX / CODE TILES (<, >, {, }, /, ;, #, *, +, ()
          Small rounded tiles floating organically around the artwork
      ======================================================== */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        {SYNTAX_TILES.map((tile, i) => (
          <div
            key={i}
            ref={(el) => {
              tileRefs.current[i] = el;
            }}
            className="absolute w-[22px] sm:w-[26px] h-[22px] sm:h-[26px] rounded-lg shadow-sm flex items-center justify-center font-mono font-extrabold text-[12px] sm:text-[14px] leading-none will-change-transform select-none"
            style={{
              backgroundColor: tile.bgColor,
              color: tile.textColor,
              left: tile.left,
              right: tile.right,
              top: tile.top,
              bottom: tile.bottom,
              transform: `translate3d(0, 0, 0) rotate(${tile.baseRot}deg)`,
            }}
          >
            {tile.char}
          </div>
        ))}

        {/* Foreground 4-point Sparkle Stars */}
        <svg
          ref={(el) => {
            sparkRefs.current[0] = el;
          }}
          className="absolute left-[30%] top-[34%] w-4 h-4 text-amber-400 drop-shadow-sm will-change-transform"
          viewBox="0 0 24 24"
          fill="currentColor"
          style={{ transform: "translate3d(0, 0, 0)" }}
        >
          <path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z" />
        </svg>

        <svg
          ref={(el) => {
            sparkRefs.current[1] = el;
          }}
          className="absolute right-[22%] top-[12%] w-3.5 h-3.5 text-indigo-400 drop-shadow-sm will-change-transform"
          viewBox="0 0 24 24"
          fill="currentColor"
          style={{ transform: "translate3d(0, 0, 0)" }}
        >
          <path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 9.5 Z" />
        </svg>
      </div>
    </div>
  );
}
