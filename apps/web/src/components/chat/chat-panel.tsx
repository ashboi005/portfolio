"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { CHAT_GREETING, nextThinkingLine, sendChatMessage } from "@/lib/chat";

type ChatMessage = { role: "user" | "ashwath"; text: string };

/**
 * The floating "talk to Ashwath" panel the 🤓 opens. Same cyan instrument-
 * panel look as the rest of the site; the RAG backend does the remembering,
 * this just renders the conversation.
 */
export default function ChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "ashwath", text: CHAT_GREETING },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) inputRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  // Rotate the corny "thinking" one-liners every ~4s while waiting on the RAG.
  useEffect(() => {
    if (!busy) {
      setThinking(null);
      return;
    }
    setThinking(nextThinkingLine());
    const interval = setInterval(() => setThinking((prev) => nextThinkingLine(prev ?? undefined)), 4000);
    return () => clearInterval(interval);
  }, [busy]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const send = async () => {
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: message }]);
    setBusy(true);
    try {
      const reply = await sendChatMessage(message);
      setMessages((prev) => [...prev, { role: "ashwath", text: reply }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "ashwath",
          text: error instanceof Error ? error.message : "Something glitched. Try again?",
        },
      ]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  // Portaled to <body>: any transformed/filtered ancestor (hero zoom, parallax)
  // would hijack position:fixed and pin the panel to the section instead.
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          // positioning lives on this outer div — .corner-ticks forces
          // position:relative, so it must NOT share the `fixed` element
          className="fixed right-3 bottom-3 left-3 z-[90] h-[min(560px,72dvh)] shadow-[0_0_60px_rgba(51,224,255,0.14)] sm:right-6 sm:bottom-6 sm:left-auto sm:w-[380px]"
          role="dialog"
          aria-label="Chat with Ashwath"
        >
          <div className="panel corner-ticks flex h-full flex-col overflow-hidden">
          {/* header */}
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5 font-mono text-[11px]">
            <span className="flex items-center gap-2 text-dim">
              <span className="text-base leading-none" aria-hidden>
                🤓
              </span>
              <span className="text-bright">ashwath</span>
              <span className="flex items-center gap-1.5 text-cyan">
                <span className="led" aria-hidden />
                ONLINE
              </span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer text-dim transition-colors hover:text-signal"
              aria-label="Close chat"
            >
              [x]
            </button>
          </div>

          {/* conversation */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div
                // biome-ignore lint: append-only log
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 text-[13px] leading-relaxed ${
                    message.role === "user"
                      ? "border border-cyan/40 bg-cyan/10 text-bright"
                      : "border border-line bg-surface-2 text-bright/90"
                  }`}
                >
                  {message.role === "ashwath" && (
                    <p className="mb-1 font-mono text-[10px] tracking-wider text-cyan uppercase">
                      ashwath
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">{message.text}</p>
                </div>
              </div>
            ))}

            {thinking && (
              <div className="flex justify-start">
                <div className="max-w-[85%] border border-line bg-surface-2 px-3 py-2">
                  <p className="mb-1 font-mono text-[10px] tracking-wider text-cyan uppercase">
                    ashwath
                  </p>
                  <p className="font-mono text-xs text-dim italic" aria-live="polite">
                    {thinking}
                    <span className="blink-cursor text-cyan">▊</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* composer */}
          <form
            className="flex items-center gap-2 border-t border-line px-4 py-3 font-mono text-xs"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <span className="text-cyan" aria-hidden>
              {">"}
            </span>
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="flex-1 bg-transparent text-bright outline-none placeholder:text-dim/50"
              placeholder="ask me anything…"
              spellCheck={false}
              autoComplete="off"
              aria-label="Message Ashwath"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="cursor-pointer border border-cyan/50 bg-cyan/10 px-2.5 py-1 text-[11px] tracking-wider text-cyan uppercase transition-all enabled:hover:bg-cyan/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              send
            </button>
          </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
