"use client";

import React from "react";
import { useScrollReveal, type UseScrollRevealOptions } from "@/hooks/useScrollReveal";
import { cn } from "@/lib/utils";

export type RevealDirection = "up" | "down" | "left" | "right" | "fade";

export interface RevealOnScrollProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  /**
   * Stagger or start delay in milliseconds.
   * Default: 0
   */
  delay?: number;
  /**
   * Direction from which the element floats into view.
   * "up" slides up from below (+24px -> 0).
   * Default: "up"
   */
  direction?: RevealDirection;
  /**
   * Animation transition duration in milliseconds.
   * Default: 650ms
   */
  duration?: number;
  /**
   * Intersection threshold (0.0 to 1.0).
   * Default: 0.15 (~15% of element visible)
   */
  threshold?: number;
  /**
   * HTML element or custom component to render as the wrapper.
   * Default: "div"
   */
  as?: React.ElementType;
}

const DIRECTION_OFFSETS: Record<RevealDirection, string> = {
  up: "translate3d(0, 24px, 0)",
  down: "translate3d(0, -24px, 0)",
  left: "translate3d(24px, 0, 0)",
  right: "translate3d(-24px, 0, 0)",
  fade: "translate3d(0, 0, 0)",
};

/**
 * Reusable wrapper component for scroll-triggered reveal animations.
 * Driven entirely by native IntersectionObserver and smooth CSS transitions.
 */
export function RevealOnScroll({
  children,
  delay = 0,
  direction = "up",
  duration = 650,
  threshold = 0.15,
  as: Component = "div",
  className,
  style,
  ...props
}: RevealOnScrollProps) {
  const { ref, isVisible } = useScrollReveal({ threshold });

  const initialTransform = DIRECTION_OFFSETS[direction] || DIRECTION_OFFSETS.up;

  const animationStyle: React.CSSProperties = {
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? "translate3d(0, 0, 0)" : initialTransform,
    transitionProperty: "opacity, transform",
    transitionDuration: `${duration}ms`,
    transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)", // Smooth ease-out curve
    transitionDelay: `${delay}ms`,
    willChange: isVisible ? "auto" : "opacity, transform",
    ...style,
  };

  return (
    <Component
      ref={ref}
      style={animationStyle}
      className={cn("motion-reduce:!opacity-100 motion-reduce:!transform-none motion-reduce:!transition-none", className)}
      {...props}
    >
      {children}
    </Component>
  );
}

export default RevealOnScroll;
