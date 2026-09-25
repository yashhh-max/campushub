"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useEffect,
  useCallback,
  useId,
} from "react";

export interface ParallaxLayerConfig {
  id: string;
  element: HTMLElement;
  depth: number;
  rotateFactor?: number;
  scaleFactor?: number;
  reverse?: boolean;
}

interface CursorParallaxContextType {
  registerLayer: (config: ParallaxLayerConfig) => void;
  unregisterLayer: (id: string) => void;
}

export const CursorParallaxContext = createContext<CursorParallaxContextType | null>(null);

export function useCursorParallax() {
  return useContext(CursorParallaxContext);
}

export interface CursorParallaxProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Maximum pixel translation for a layer with depth = 1.0 at full coordinate deflection */
  maxOffset?: number;
  /** Lerp smoothing factor between 0.01 (very heavy lag) and 0.2 (snappy). Default: 0.075 */
  ease?: number;
  /** Manually disable parallax effect */
  disabled?: boolean;
}

/**
 * CursorParallax
 * High-performance, GPU-accelerated cursor/parallax container inspired by GitHub Universe.
 * Uses requestAnimationFrame and direct DOM transform: translate3d updates for 120fps motion
 * without React state re-renders. Automatically disables on mobile touch and prefers-reduced-motion.
 */
export function CursorParallax({
  children,
  className = "",
  style,
  maxOffset = 55,
  ease = 0.075,
  disabled = false,
  ...props
}: CursorParallaxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<Map<string, ParallaxLayerConfig>>(new Map());

  // Cursor coordinates normalized to [-1, 1] relative to container
  const targetX = useRef(0);
  const targetY = useRef(0);
  const currentX = useRef(0);
  const currentY = useRef(0);

  const isHovered = useRef(false);
  const isSupported = useRef(true);
  const rafId = useRef<number | null>(null);

  const registerLayer = useCallback((config: ParallaxLayerConfig) => {
    layersRef.current.set(config.id, config);
  }, []);

  const unregisterLayer = useCallback((id: string) => {
    layersRef.current.delete(id);
  }, []);

  // Update layer transforms directly via DOM style for peak GPU performance
  const updateLayers = useCallback(() => {
    const cx = currentX.current;
    const cy = currentY.current;

    layersRef.current.forEach((layer) => {
      const sign = layer.reverse ? -1 : 1;
      const depth = layer.depth;
      const moveX = cx * maxOffset * depth * sign;
      const moveY = cy * maxOffset * depth * sign;
      const rot = layer.rotateFactor ? cx * layer.rotateFactor * depth * sign : 0;
      const scale = layer.scaleFactor
        ? 1 + (Math.abs(cx) + Math.abs(cy)) * 0.5 * layer.scaleFactor * depth
        : 1;

      let transform = `translate3d(${moveX.toFixed(2)}px, ${moveY.toFixed(2)}px, 0)`;
      if (rot) {
        transform += ` rotate(${rot.toFixed(2)}deg)`;
      }
      if (scale !== 1) {
        transform += ` scale(${scale.toFixed(3)})`;
      }

      layer.element.style.transform = transform;
    });
  }, [maxOffset]);

  // Inertial lerp loop
  const loop = useCallback(() => {
    const dx = targetX.current - currentX.current;
    const dy = targetY.current - currentY.current;

    currentX.current += dx * ease;
    currentY.current += dy * ease;

    updateLayers();

    // Check if motion has decelerated to resting position after pointer leave
    const isSettled =
      !isHovered.current &&
      Math.abs(dx) < 0.0008 &&
      Math.abs(dy) < 0.0008 &&
      Math.abs(currentX.current) < 0.0008 &&
      Math.abs(currentY.current) < 0.0008;

    if (isSettled) {
      currentX.current = 0;
      currentY.current = 0;
      updateLayers();
      rafId.current = null;
      return;
    }

    rafId.current = requestAnimationFrame(loop);
  }, [ease, updateLayers]);

  const startLoop = useCallback(() => {
    if (!isSupported.current || disabled) return;
    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(loop);
    }
  }, [disabled, loop]);

  // Pointer event handlers
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSupported.current || disabled) return;
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Normalize coordinates: (-1, -1) top-left, (0, 0) center, (1, 1) bottom-right
    const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const normY = ((e.clientY - rect.top) / rect.height) * 2 - 1;

    targetX.current = Math.max(-1.25, Math.min(1.25, normX));
    targetY.current = Math.max(-1.25, Math.min(1.25, normY));
    isHovered.current = true;

    startLoop();
  };

  const handlePointerEnter = () => {
    if (!isSupported.current || disabled) return;
    isHovered.current = true;
    startLoop();
  };

  const handlePointerLeave = () => {
    if (!isSupported.current || disabled) return;
    // Decelerate smoothly to resting origin (0, 0)
    targetX.current = 0;
    targetY.current = 0;
    isHovered.current = false;
    startLoop();
  };

  // Check hardware pointer capability and accessibility preferences
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
        targetX.current = 0;
        targetY.current = 0;
        layersRef.current.forEach((layer) => {
          layer.element.style.transform = "translate3d(0, 0, 0)";
        });
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
  }, []);

  return (
    <CursorParallaxContext.Provider value={{ registerLayer, unregisterLayer }}>
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        className={`relative ${className}`}
        style={style}
        {...props}
      >
        {children}
      </div>
    </CursorParallaxContext.Provider>
  );
}

export interface ParallaxLayerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Parallax depth coefficient (e.g. 0.05 for subtle background, 0.30 for fast foreground) */
  depth: number;
  /** Subtle rotation in degrees at maximum cursor deflection (e.g. 6 or -8) */
  rotateFactor?: number;
  /** Subtle scale change at maximum cursor deflection (e.g. 0.05) */
  scaleFactor?: number;
  /** Invert translation direction relative to cursor */
  reverse?: boolean;
  children?: React.ReactNode;
}

/**
 * ParallaxLayer
 * Registers with parent CursorParallax to receive GPU-accelerated translate3d and rotation transforms.
 * Enforces `pointer-events-none` so it never intercepts clicks, buttons, or links.
 */
export function ParallaxLayer({
  depth,
  rotateFactor,
  scaleFactor,
  reverse = false,
  className = "",
  style,
  children,
  ...props
}: ParallaxLayerProps) {
  const context = useCursorParallax();
  const elementRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!context || !elementRef.current) return;

    context.registerLayer({
      id,
      element: elementRef.current,
      depth,
      rotateFactor,
      scaleFactor,
      reverse,
    });

    return () => {
      context.unregisterLayer(id);
    };
  }, [context, id, depth, rotateFactor, scaleFactor, reverse]);

  return (
    <div
      ref={elementRef}
      className={`pointer-events-none select-none ${className}`}
      style={{
        willChange: "transform",
        transform: "translate3d(0, 0, 0)",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
