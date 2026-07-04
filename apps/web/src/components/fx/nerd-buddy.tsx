"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import ChatPanel from "@/components/chat/chat-panel";

/**
 * The classic "well, actually" nerd — 🤓 with a raised index finger ☝️ —
 * parked on the right of the hero. Click it and it opens a direct line to
 * Ashwath (the RAG-backed chat panel). Same brain as the terminal `chat`.
 */
export default function NerdBuddy() {
  const [chatOpen, setChatOpen] = useState(false);
  const [nudged, setNudged] = useState(false);
  const reducedMotion = useReducedMotion();

  const openChat = () => {
    setNudged(true);
    setChatOpen(true);
  };

  return (
    <>
      <div className="pointer-events-none absolute right-5 bottom-24 z-20 lg:top-1/2 lg:right-[14%] lg:bottom-auto lg:-translate-y-1/2">
        <div className="relative flex flex-col items-center gap-3">
          <motion.button
            type="button"
            onClick={openChat}
            aria-label="Chat with Ashwath"
            className="pointer-events-auto relative cursor-pointer select-none leading-none drop-shadow-[0_0_24px_rgba(51,224,255,0.3)]"
            animate={reducedMotion ? undefined : { y: [0, -10, 0] }}
            transition={{ duration: 3.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            whileHover={{ scale: 1.08, rotate: -3 }}
            whileTap={{ scale: 0.9 }}
          >
            <span className="block text-6xl lg:text-[96px]" role="img" aria-hidden>
              🤓
            </span>
            <span
              className="absolute -left-3 bottom-1 text-3xl -rotate-12 lg:-left-5 lg:text-5xl"
              role="img"
              aria-hidden
            >
              ☝️
            </span>
          </motion.button>

          {!nudged && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0.4] }}
              transition={{ delay: 1.6, duration: 2.4, repeat: Number.POSITIVE_INFINITY }}
              className="font-mono text-[10px] tracking-wider text-dim uppercase"
            >
              talk to me →
            </motion.span>
          )}
        </div>
      </div>

      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
