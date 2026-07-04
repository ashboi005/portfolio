"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import {
  CHAT_GREETING,
  fetchChatHistory,
  hasExistingChat,
  nextThinkingLine,
  sendChatMessage,
} from "@/lib/chat";
import type { ProfilePayload, ProjectPayload } from "@/types/portfolio";

type Line = {
  kind: "input" | "output" | "error" | "accent" | "chat" | "chat-user";
  text: string;
  instant?: boolean;
};

const CAT_ART = [" /\\_/\\", "( o.o )", " > ^ <"];

const BANNER: Line[] = [
  { kind: "accent", text: "ASHWATH.SYS terminal v5.2.1 — unauthorized access encouraged", instant: true },
  { kind: "output", text: 'type "help" for commands · ↑/↓ for history', instant: true },
];

export default function TerminalOverlay({
  open,
  onClose,
  profile,
  projects,
}: {
  open: boolean;
  onClose: () => void;
  profile: ProfilePayload;
  projects: ProjectPayload[];
}) {
  const [committed, setCommitted] = useState<Line[]>(BANNER);
  const [queue, setQueue] = useState<Line[]>([]);
  const [typing, setTyping] = useState<{ line: Line; shown: number } | null>(null);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [chatMode, setChatMode] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [thinking, setThinking] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [committed, typing, thinking]);

  // typewriter engine: pull from queue, type char-by-char, then commit
  useEffect(() => {
    if (typing) {
      if (reducedMotion || typing.line.instant || typing.shown >= typing.line.text.length) {
        setCommitted((prev) => [...prev, typing.line]);
        setTyping(null);
        return;
      }
      const timer = setTimeout(() => {
        setTyping((prev) => (prev ? { ...prev, shown: prev.shown + 2 } : prev));
      }, 8);
      return () => clearTimeout(timer);
    }
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      setQueue(rest);
      setTyping({ line: next!, shown: 0 });
    }
  }, [typing, queue, reducedMotion]);

  const uptime = () => {
    if (typeof performance === "undefined") return "00:00:00";
    const s = Math.floor(performance.now() / 1000);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  };

  const enqueue = (lines: Line[]) => setQueue((prev) => [...prev, ...lines]);

  // Rotate the corny "thinking" one-liners every ~4s while the RAG works.
  useEffect(() => {
    if (!chatBusy) {
      setThinking(null);
      return;
    }
    setThinking(nextThinkingLine());
    const interval = setInterval(
      () => setThinking((prev) => nextThinkingLine(prev ?? undefined)),
      4000,
    );
    return () => clearInterval(interval);
  }, [chatBusy]);

  const askAshwath = async (message: string) => {
    setChatBusy(true);
    try {
      const reply = await sendChatMessage(message);
      enqueue([{ kind: "chat", text: `ashwath ▸ ${reply}` }]);
    } catch (error) {
      enqueue([
        {
          kind: "chat",
          text: `ashwath ▸ ${error instanceof Error ? error.message : "something glitched. try again?"}`,
        },
      ]);
    } finally {
      setChatBusy(false);
      inputRef.current?.focus();
    }
  };

  const run = (raw: string) => {
    const command = raw.trim();
    const lower = command.toLowerCase();

    if (chatMode) {
      if (!command || chatBusy) return;
      setCommitted((prev) => [...prev, { kind: "chat-user", text: `you ▸ ${command}`, instant: true }]);
      setHistory((prev) => [command, ...prev]);
      setHistoryIndex(-1);
      setInput("");
      if (lower === "exit" || lower === "quit") {
        setChatMode(false);
        enqueue([
          { kind: "chat", text: "ashwath ▸ later! disconnecting…", instant: true },
          { kind: "output", text: "chat session detached. back to the shell.", instant: true },
        ]);
        return;
      }
      void askAshwath(command);
      return;
    }

    setCommitted((prev) => [...prev, { kind: "input", text: raw, instant: true }]);
    if (command) {
      setHistory((prev) => [command, ...prev]);
    }
    setHistoryIndex(-1);
    setInput("");

    const out: Line[] = [];
    const o = (text: string, kind: Line["kind"] = "output", instant = false) =>
      out.push({ kind, text, instant });

    const [verb, ...args] = lower.split(/\s+/);

    switch (verb) {
      case "":
        break;
      case "help":
        o("commands:", "accent", true);
        o("  whoami / neofetch   system + identity readout", "output", true);
        o("  ls [projects]       registered services", "output", true);
        o("  stack               the arsenal", "output", true);
        o("  cat                 ...it's a cat", "output", true);
        o("  chat                talk to the maintainer directly", "output", true);
        o("  contact             reach the maintainer", "output", true);
        o("  sudo hire-me        escalate privileges", "output", true);
        o("  matrix              follow the white rabbit", "output", true);
        o("  date · echo · clear · exit", "output", true);
        break;
      case "whoami":
      case "neofetch": {
        const info = [
          `${profile.name.toLowerCase().replace(/\s+/g, "")}@prod`,
          "------------------",
          `role:    ${profile.role}`,
          `os:      ASHWATH.SYS 5.2.1 (bun runtime)`,
          `uptime:  ${uptime()}`,
          `shell:   zsh + an unsafe amount of coffee`,
          `stack:   FastAPI · Elysia · Postgres · Redis · AWS`,
          `hobbies: null`,
          `cats:    3 (roaming)`,
        ];
        CAT_ART.forEach((art, i) => o(`${art}   ${info[i] ?? ""}`, "accent", true));
        info.slice(CAT_ART.length).forEach((line) => o(`         ${line}`, "output", true));
        break;
      }
      case "cat":
        CAT_ART.forEach((art) => o(art, "accent", true));
        o("meow. (that is the entire feature set.)", "output");
        break;
      case "chat":
        setChatMode(true);
        o("establishing secure channel to ashwath@prod… ok", "chat", true);
        o("——— chat mode · plaintext human protocol ———", "chat", true);
        if (hasExistingChat()) {
          // same chatId as the website widget — replay the old session
          o("known peer detected — retrieving our previous conversation…", "chat", true);
          void fetchChatHistory()
            .then((history) => {
              if (history.length === 0) {
                enqueue([{ kind: "chat", text: `ashwath ▸ ${CHAT_GREETING}` }]);
                return;
              }
              enqueue([
                ...history.map((m) => ({
                  kind: (m.role === "user" ? "chat-user" : "chat") as Line["kind"],
                  text: `${m.role === "user" ? "you" : "ashwath"} ▸ ${m.text}`,
                  instant: true,
                })),
                { kind: "chat", text: "——— session restored · carry on ———", instant: true },
              ]);
            })
            .catch(() => enqueue([{ kind: "chat", text: `ashwath ▸ ${CHAT_GREETING}` }]));
        } else {
          o(`ashwath ▸ ${CHAT_GREETING}`, "chat");
        }
        o('(type "exit" to detach)', "chat", true);
        break;
      case "ls":
        for (const project of projects) {
          o(`drwxr-xr-x  ${project.status.padEnd(8)} ${project.title}`, "output", true);
        }
        break;
      case "stack":
        for (const [group, items] of Object.entries(profile.arsenal)) {
          o(`${group}: ${items.join(", ")}`, "output", true);
        }
        break;
      case "contact":
        o(`email:    ${profile.email ?? "ashwathsoni005@gmail.com"}`, "output", true);
        o(`github:   ${profile.githubUrl ?? ""}`, "output", true);
        o(`linkedin: ${profile.linkedinUrl ?? ""}`, "output", true);
        break;
      case "sudo":
        if (lower.includes("hire")) {
          o("[sudo] password for recruiter: ********", "output");
          o("privileges escalated. drafting offer letter…", "accent");
          o(`> scroll to #contact or email ${profile.email ?? "ashwathsoni005@gmail.com"}`, "output");
        } else {
          o(`sudo: ${args.join(" ") || "usage: sudo hire-me"}: command requires belief in yourself`, "error");
        }
        break;
      case "matrix":
        for (let i = 0; i < 4; i++) {
          o(
            Array.from({ length: 46 }, () => (Math.random() > 0.5 ? "1" : "0")).join(""),
            "accent",
            true,
          );
        }
        o("wake up, Ashwath… the backend has you.", "output");
        break;
      case "date":
        o(
          new Intl.DateTimeFormat("en-IN", {
            dateStyle: "full",
            timeStyle: "medium",
            timeZone: "Asia/Kolkata",
          }).format(new Date()) + " IST",
          "output",
          true,
        );
        break;
      case "echo":
        o(args.length ? raw.trim().slice(5) : "", "output", true);
        break;
      case "rm":
        o("nice try. this system has backups of its backups of its cats.", "error");
        break;
      case "clear":
        setCommitted([]);
        setQueue([]);
        setTyping(null);
        return;
      case "exit":
        setCommitted(BANNER);
        setQueue([]);
        setTyping(null);
        onClose();
        return;
      default:
        o(`command not found: ${verb}. try "help".`, "error", true);
    }

    enqueue(out);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      const next = Math.min(historyIndex + 1, history.length - 1);
      if (history[next] !== undefined) {
        setHistoryIndex(next);
        setInput(history[next]!);
      }
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = historyIndex - 1;
      if (next < 0) {
        setHistoryIndex(-1);
        setInput("");
      } else {
        setHistoryIndex(next);
        setInput(history[next]!);
      }
    }
  };

  if (!open) return null;

  const lineClass = (kind: Line["kind"]) =>
    kind === "input"
      ? "text-bright"
      : kind === "error"
        ? "text-signal"
        : kind === "accent"
          ? "text-cyan"
          : kind === "chat"
            ? "text-[#00ff41] drop-shadow-[0_0_6px_rgba(0,255,65,0.35)]"
            : kind === "chat-user"
              ? "text-[#b6ffc4]"
              : "text-dim";

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-void/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Terminal"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <motion.div
        initial={reducedMotion ? undefined : { opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="panel corner-ticks m-4 flex h-[min(460px,72dvh)] w-full max-w-2xl flex-col overflow-hidden shadow-[0_0_60px_rgba(51,224,255,0.12)]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* window chrome */}
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5 font-mono text-[11px] text-dim">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-signal/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-gold/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-cyan/70" />
            <span className="ml-3">ashwath@prod: ~</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-dim transition-colors hover:text-signal"
            aria-label="Close terminal"
          >
            [x]
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-0.5 overflow-y-auto p-4 font-mono text-xs">
          {committed.map((line, index) => (
            <div
              // biome-ignore lint: append-only log
              key={index}
              className={`${
                line.kind === "chat" || line.kind === "chat-user"
                  ? "whitespace-pre-wrap break-words"
                  : "whitespace-pre"
              } ${lineClass(line.kind)}`}
            >
              {line.kind === "input" ? (
                <>
                  <span className="text-cyan">$ </span>
                  {line.text}
                </>
              ) : (
                line.text
              )}
            </div>
          ))}
          {typing && (
            <div
              className={`${
                typing.line.kind === "chat" || typing.line.kind === "chat-user"
                  ? "whitespace-pre-wrap break-words"
                  : "whitespace-pre"
              } ${lineClass(typing.line.kind)}`}
            >
              {typing.line.text.slice(0, typing.shown)}
              <span className={`blink-cursor ${chatMode ? "text-[#00ff41]" : "text-cyan"}`}>▊</span>
            </div>
          )}
          {thinking && !typing && (
            <div className="whitespace-pre-wrap break-words text-[#00ff41]/70 italic" aria-live="polite">
              {thinking}
              <span className="blink-cursor text-[#00ff41]">▊</span>
            </div>
          )}
        </div>

        <form
          className="flex items-center gap-2 border-t border-line px-4 py-3 font-mono text-xs"
          onSubmit={(event) => {
            event.preventDefault();
            run(input);
          }}
        >
          <span className={chatMode ? "text-[#00ff41]" : "text-cyan"}>
            {chatMode ? "you ▸" : "$"}
          </span>
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            className={`flex-1 bg-transparent outline-none placeholder:text-dim/50 ${
              chatMode ? "text-[#b6ffc4] caret-[#00ff41]" : "text-bright"
            }`}
            placeholder={chatMode ? "say something…" : "help"}
            spellCheck={false}
            autoComplete="off"
            aria-label={chatMode ? "Message Ashwath" : "Terminal command"}
          />
        </form>
      </motion.div>
    </div>
  );
}
