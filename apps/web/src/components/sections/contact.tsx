"use client";

import { useEffect, useRef, useState } from "react";

import SleepyCat from "@/components/fx/sleepy-cat";
import SectionHeader from "@/components/sections/section-header";
import { sections } from "@/lib/content";
import type { ProfilePayload } from "@/types/portfolio";

type ResponseState =
  | { phase: "idle" }
  | { phase: "sending" }
  | { phase: "sent" }
  | { phase: "done"; status: number; latencyMs: number; body: unknown }
  | { phase: "error"; message: string };

function JsonPreview({ name, email, message }: { name: string; email: string; message: string }) {
  return (
    <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-relaxed">
      <span className="json-plain">{"{"}</span>
      {"\n  "}
      <span className="json-key">"name"</span>
      <span className="json-plain">: </span>
      <span className="json-string">"{name || "…"}"</span>
      <span className="json-plain">,</span>
      {"\n  "}
      <span className="json-key">"email"</span>
      <span className="json-plain">: </span>
      <span className="json-string">"{email || "…"}"</span>
      <span className="json-plain">,</span>
      {"\n  "}
      <span className="json-key">"message"</span>
      <span className="json-plain">: </span>
      <span className="json-string">"{message || "…"}"</span>
      {"\n"}
      <span className="json-plain">{"}"}</span>
    </pre>
  );
}

export default function Contact({ profile }: { profile: ProfilePayload }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState<ResponseState>({ phase: "idle" });
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setResponse({ phase: "sending" });
    const startedAt = performance.now();

    const apiBase = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";

    try {
      const res = await fetch(`${apiBase}/api/v1/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const latencyMs = Math.round(performance.now() - startedAt);
      const body = await res.json().catch(() => ({ status: res.status }));
      setResponse({ phase: "sent" });
      timerRef.current = setTimeout(() => {
        setResponse({ phase: "done", status: res.status, latencyMs, body });
      }, 3500);
    } catch (err) {
      const latencyMs = Math.round(performance.now() - startedAt);
      setResponse({
        phase: "error",
        message: `Backend unreachable (${latencyMs}ms). Is the server running on ${apiBase}?`,
      });
    }

    setName("");
    setEmail("");
    setMessage("");
  };

  const inputClass =
    "w-full border border-line bg-surface-2 px-3 py-2.5 font-mono text-sm text-bright outline-none transition-colors placeholder:text-dim/50 focus:border-cyan/60";

  return (
    <section id="contact" className="grid-texture relative border-t border-line">
      <div className="mx-auto w-full max-w-6xl px-6 py-24 lg:px-10 lg:py-32">
        <SectionHeader {...sections.contact} />

        <div className="grid gap-8 lg:grid-cols-2">
          {/* The form — request builder */}
          <form onSubmit={submit} className="panel corner-ticks space-y-4 p-6">
            <div className="mb-2 flex items-center gap-2 font-mono text-[11px] text-dim">
              <span className="border border-cyan/50 bg-cyan/10 px-1.5 py-0.5 text-cyan">POST</span>
              <span>/api/v1/contact</span>
            </div>

            <label className="block">
              <span className="mb-1.5 block font-mono text-[11px] tracking-wider text-dim uppercase">
                body.name
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                minLength={2}
                placeholder="Ada Lovelace"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block font-mono text-[11px] tracking-wider text-dim uppercase">
                body.email
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="ada@analytical.engine"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block font-mono text-[11px] tracking-wider text-dim uppercase">
                body.message
              </span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                required
                minLength={10}
                rows={5}
                placeholder="Let's build something that survives production."
                className={`${inputClass} resize-y`}
              />
            </label>

            <button
              type="submit"
              disabled={response.phase === "sending" || response.phase === "sent"}
              className="w-full cursor-pointer border border-cyan/60 bg-cyan/10 px-5 py-3 font-mono text-xs tracking-widest text-cyan uppercase transition-all duration-200 hover:bg-cyan/20 hover:shadow-[0_0_24px_rgba(51,224,255,0.25)] disabled:cursor-wait disabled:opacity-50"
            >
              {response.phase === "sending" ? "sending…" : response.phase === "sent" ? "message sent!" : "execute request"}
            </button>
          </form>

          {/* Live request/response console */}
          <div className="space-y-4">
            <div className="panel p-5">
              <p className="mb-3 font-mono text-[11px] tracking-wider text-dim uppercase">
                request preview <span className="blink-cursor text-cyan">▊</span>
              </p>
              <JsonPreview name={name} email={email} message={message} />
            </div>

            <div className="panel p-5" aria-live="polite">
              <p className="mb-3 font-mono text-[11px] tracking-wider text-dim uppercase">
                response
              </p>
              {response.phase === "idle" && (
                <p className="font-mono text-xs text-dim">
                  — awaiting request. the socket is open, the engineer is listening.
                </p>
              )}
              {(response.phase === "sending" || response.phase === "sent") && (
                <p className="font-mono text-xs text-cyan">
                  {response.phase === "sending" ? "⇡ transmitting packet…" : "✓ message sent!"}
                </p>
              )}
              {response.phase === "error" && (
                <p className="font-mono text-xs text-signal">✗ {response.message}</p>
              )}
              {response.phase === "done" && (
                <div className="space-y-2 font-mono text-xs">
                  <p>
                    <span className={response.status < 400 ? "text-cyan" : "text-signal"}>
                      HTTP {response.status}
                    </span>{" "}
                    <span className="text-dim">· {response.latencyMs}ms</span>
                  </p>
                  <pre className="overflow-x-auto whitespace-pre-wrap text-dim">
                    {JSON.stringify(response.body, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <p className="font-mono text-xs leading-relaxed text-dim">
              prefer raw sockets?{" "}
              {profile.email && (
                <a
                  href={`mailto:${profile.email}`}
                  className="cursor-pointer text-cyan underline-offset-4 transition-colors hover:underline"
                >
                  {profile.email}
                </a>
              )}
            </p>

            {/* a cat naps on the job, occasionally annoying the laptop */}
            <div className="flex items-end justify-between gap-3 pt-2">
              <span className="font-mono text-[10px] text-dim/60">
                {"// on-call engineer (napping)"}
              </span>
              <SleepyCat />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
