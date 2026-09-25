"use client";

import { useEffect, useRef, useState } from "react";

export interface UseScrollRevealOptions {
  /**
   * Percentage of the target's visibility needed before triggering (0.0 to 1.0).
   * Default: 0.15 (~15% visible)
   */
  threshold?: number;
  /**
   * Margin around the root element. Defaults to "0px".
   */
  rootMargin?: string;
  /**
   * If true, skips the observer and sets isVisible to true immediately.
   */
  disabled?: boolean;
}

/**
 * Custom hook that triggers a one-time visibility flag when an element
 * intersects the viewport by the specified threshold (~15-20%).
 * Automatically stops observing once revealed and respects prefers-reduced-motion.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollRevealOptions = {}
) {
  const { threshold = 0.15, rootMargin = "0px", disabled = false } = options;
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<T | null>(null);

  useEffect(() => {
    // If disabled, reveal immediately
    if (disabled) {
      setIsVisible(true);
      return;
    }

    // Respect user's accessibility preference for reduced motion
    if (typeof window !== "undefined") {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (prefersReducedMotion) {
        setIsVisible(true);
        return;
      }
    }

    const node = ref.current;
    if (!node) return;

    // Fallback for environments without IntersectionObserver
    if (!("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Trigger once: stop observing immediately (won't re-trigger on scroll back up)
          observer.unobserve(node);
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, disabled]);

  return { ref, isVisible };
}

export default useScrollReveal;
