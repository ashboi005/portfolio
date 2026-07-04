"use client";

import { useEffect, useRef, useState } from "react";

/**
 * True once the element has scrolled into view (never flips back). Drives the
 * CSS reveal classes — unlike motion's whileInView, this cannot strand content
 * at opacity 0 on devices that report prefers-reduced-motion. A safety timer
 * force-reveals if the observer never fires for any reason.
 */
export function useInViewOnce<T extends HTMLElement>(margin = "-40px") {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || seen) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { rootMargin: margin },
    );
    observer.observe(element);

    // belt and braces: content must never stay hidden
    const fallback = setTimeout(() => {
      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) setSeen(true);
    }, 1500);

    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, [seen, margin]);

  return { ref, seen };
}
