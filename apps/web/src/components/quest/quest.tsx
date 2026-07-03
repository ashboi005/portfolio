"use client";

import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { game } from "@/lib/content";

type QuestState = {
  found: Set<string>;
  total: number;
  collect: (id: string) => void;
};

const QuestContext = createContext<QuestState | null>(null);
const useQuest = () => useContext(QuestContext);

type Popup = { title: string; body: string; done?: boolean };

export function QuestProvider({ children }: { children: React.ReactNode }) {
  const foundRef = useRef<Set<string>>(new Set());
  const [found, setFound] = useState<Set<string>>(() => new Set());
  const [popup, setPopup] = useState<Popup | null>(null);
  const total = game.total;

  // Side effects (popup) live OUTSIDE the state updater so they fire reliably.
  const collect = useCallback(
    (id: string) => {
      if (foundRef.current.has(id)) return;
      foundRef.current.add(id);
      const n = foundRef.current.size;
      setFound(new Set(foundRef.current));

      if (n >= total) {
        setPopup({ title: `ALL ${total} CANS RECOVERED`, body: game.reward, done: true });
      } else if (n === 1) {
        setPopup({ title: `Sprite can 1/${total} found`, body: game.intro });
      } else {
        const line = (game.lines[n - 1] ?? game.lines[0]!).replace("{n}", String(n));
        setPopup({ title: `Sprite can ${n}/${total} found`, body: line });
      }
    },
    [total],
  );

  // auto-dismiss non-final popups
  useEffect(() => {
    if (!popup || popup.done) return;
    const timer = setTimeout(() => setPopup(null), 6000);
    return () => clearTimeout(timer);
  }, [popup]);

  const value = useMemo(() => ({ found, total, collect }), [found, total, collect]);

  return (
    <QuestContext.Provider value={value}>
      {children}
      <QuestHud found={found.size} total={total} />
      <QuestPopup popup={popup} onClose={() => setPopup(null)} />
    </QuestContext.Provider>
  );
}

/* pixel Sprite-style can */
function CanSprite({ u = 3 }: { u?: number }) {
  const body = "#3fe0b0";
  const shade = "#1fae86";
  const light = "#d8fff0";
  return (
    <svg width={7 * u} height={11 * u} viewBox={`0 0 ${7 * u} ${11 * u}`} shapeRendering="crispEdges" aria-hidden>
      {/* tab top */}
      <rect x={2 * u} y={0} width={3 * u} height={u} fill={shade} />
      {/* rim */}
      <rect x={u} y={u} width={5 * u} height={u} fill={light} />
      {/* body */}
      <rect x={u} y={2 * u} width={5 * u} height={8 * u} fill={body} />
      {/* shading */}
      <rect x={u} y={2 * u} width={u} height={8 * u} fill={light} opacity="0.5" />
      <rect x={5 * u} y={2 * u} width={u} height={8 * u} fill={shade} />
      {/* label stripe */}
      <rect x={u} y={5 * u} width={5 * u} height={2 * u} fill={light} opacity="0.85" />
      {/* base */}
      <rect x={u} y={10 * u} width={5 * u} height={u} fill={shade} />
    </svg>
  );
}

export function SpriteCan({ id, className, style }: { id: string; className?: string; style?: React.CSSProperties }) {
  const quest = useQuest();
  const [collecting, setCollecting] = useState(false);
  if (!quest || quest.found.has(id)) return null;

  return (
    <button
      type="button"
      aria-label="Collect a hidden Sprite can"
      className={`sprite-can ${collecting ? "can-collected" : ""} ${className ?? ""}`}
      style={style}
      onClick={() => {
        setCollecting(true);
        window.setTimeout(() => quest.collect(id), 460);
      }}
    >
      <CanSprite />
    </button>
  );
}

function QuestHud({ found, total }: { found: number; total: number }) {
  if (found === 0) return null;
  const complete = found >= total;
  return (
    <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2 border border-line bg-void/85 px-3 py-1.5 font-mono text-[11px] backdrop-blur-sm">
      <span className="text-base leading-none">🥤</span>
      <span className={complete ? "text-cyan" : "text-bright/80"}>
        {found}/{total} cans
      </span>
    </div>
  );
}

function QuestPopup({ popup, onClose }: { popup: Popup | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {popup && (
        <motion.div
          key={popup.title}
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 26 }}
          className="panel corner-ticks fixed bottom-6 left-1/2 z-[70] w-[min(92vw,26rem)] -translate-x-1/2 p-5"
        >
          <div className="mb-2 flex items-center justify-between font-mono text-[11px] tracking-wider uppercase">
            <span className={popup.done ? "text-gold" : "text-cyan"}>🥤 {popup.title}</span>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer text-dim transition-colors hover:text-signal"
              aria-label="Dismiss"
            >
              [x]
            </button>
          </div>
          <p className="text-sm leading-relaxed text-bright/90">{popup.body}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
