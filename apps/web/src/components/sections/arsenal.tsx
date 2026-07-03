"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, useReducedMotion } from "motion/react";
import { useRef } from "react";

import Cat from "@/components/fx/cat";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * The arsenal. Tech chips drop into their "boxes" with a spring when scrolled
 * into view. A pixel cat then hops from card to card — each landing knocks that
 * card into a bounce. A slow scan sweep and chip-hover keep it alive after.
 */
export default function Arsenal({ arsenal }: { arsenal: Record<string, string[]> }) {
  const totalDeps = Object.values(arsenal).reduce((count, items) => count + items.length, 0);
  const gridRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      const cat = catRef.current;
      const grid = gridRef.current;
      if (!cat || !grid) return;

      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        const catW = 46;
        const catH = 33;
        gsap.set(cat, { x: -80, y: -catH, opacity: 0 });

        const knock = (card: HTMLDivElement | null) => {
          if (!card) return;
          card.classList.remove("card-knock");
          void card.offsetWidth;
          card.classList.add("card-knock");
          window.setTimeout(() => card.classList.remove("card-knock"), 720);
        };

        let running = false;
        const leap = () => {
          if (running) return;
          running = true;
          // pick a random trio of cards each run so it isn't the same path
          const all = cardRefs.current.filter(Boolean) as HTMLDivElement[];
          const shuffled = [...all].sort(() => Math.random() - 0.5).slice(0, 3);
          cat.classList.add("is-walking");
          gsap.set(cat, { opacity: 1, x: -80, y: -catH });
          const tl = gsap.timeline({
            onComplete: () => {
              cat.classList.remove("is-walking");
              running = false;
            },
          });
          let prevX = -80;
          for (const card of shuffled) {
            const landX = card.offsetLeft + card.offsetWidth / 2 - catW / 2;
            const landY = card.offsetTop - catH + 4;
            gsap.set(cat, { scaleX: landX >= prevX ? 1 : -1 });
            prevX = landX;
            tl.to(cat, { x: landX, duration: 0.5, ease: "none" })
              .to(cat, { y: landY - 70, duration: 0.26, ease: "power2.out" }, "<")
              .to(cat, { y: landY, duration: 0.25, ease: "power2.in", onComplete: () => knock(card) });
          }
          tl.to(cat, { scaleX: 1, duration: 0.1 })
            .to(cat, { x: grid.offsetWidth + 90, y: -catH - 60, duration: 0.5, ease: "power1.in" }, "<")
            .to(cat, { opacity: 0, duration: 0.2 }, "<0.25");
        };

        // Loop the leap on an interval, but only while the section is on screen.
        let timer: ReturnType<typeof setInterval> | null = null;
        const startLoop = () => {
          if (timer) return;
          leap();
          timer = setInterval(leap, 9000);
        };
        const stopLoop = () => {
          if (timer) clearInterval(timer);
          timer = null;
        };

        const st = ScrollTrigger.create({
          trigger: grid,
          start: "top 78%",
          end: "bottom 20%",
          onToggle: (self) => (self.isActive ? startLoop() : stopLoop()),
        });

        return () => {
          stopLoop();
          st.kill();
        };
      });
    },
    { scope: gridRef },
  );

  return (
    <div className="relative mt-20">
      <p className="eyebrow mb-6">
        <span className="sigil">[PKG]</span> arsenal.lock — {totalDeps} dependencies, zero
        vulnerabilities (the cat is a known risk)
      </p>

      <div ref={gridRef} className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* the hopping cat rides above the grid */}
        <div ref={catRef} className="cat pointer-events-none absolute left-0 top-0 z-20">
          <Cat variant="cyan" scale={0.7} />
        </div>

        {Object.entries(arsenal).map(([group, items], cardIndex) => (
          <div
            key={group}
            ref={(element) => {
              cardRefs.current[cardIndex] = element;
            }}
            className="panel panel-hover group relative h-full overflow-hidden p-5"
          >
            <div className="arsenal-scan" aria-hidden />
            <h3 className="relative mb-3 flex items-center gap-2 font-display text-sm font-semibold tracking-wide text-cyan uppercase">
              <span className="led" aria-hidden />
              {group}
            </h3>
            <motion.div
              className="relative flex flex-wrap gap-1.5"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-40px" }}
              variants={{ show: { transition: { staggerChildren: 0.04 } } }}
            >
              {items.map((item) => (
                <motion.span
                  key={item}
                  variants={
                    reducedMotion
                      ? undefined
                      : {
                          hidden: { opacity: 0, y: -34, rotate: -8 },
                          show: {
                            opacity: 1,
                            y: 0,
                            rotate: 0,
                            transition: { type: "spring", stiffness: 500, damping: 18 },
                          },
                        }
                  }
                  className="cursor-default border border-line bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-bright/80 transition-all duration-150 hover:-translate-y-0.5 hover:border-cyan/60 hover:text-cyan hover:shadow-[0_0_10px_rgba(51,224,255,0.25)]"
                >
                  {item}
                </motion.span>
              ))}
            </motion.div>
          </div>
        ))}
      </div>
    </div>
  );
}
