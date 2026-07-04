"use client";

import { useInViewOnce } from "@/lib/use-in-view-once";

/**
 * Fade-up reveal on scroll into view. CSS-transition based (see .reveal-fx):
 * motion's whileInView left content stranded at opacity 0 on phones that
 * report prefers-reduced-motion, so visibility must not depend on a JS
 * animation actually running.
 */
export default function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, seen } = useInViewOnce<HTMLDivElement>("-60px");

  return (
    <div
      ref={ref}
      className={`reveal-fx ${seen ? "is-seen" : ""} ${className ?? ""}`}
      style={delay ? ({ "--reveal-delay": `${delay}s` } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}
