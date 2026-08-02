"use client";

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import ConceptSlot from "@/components/drill/concept-slot";
import LevelSelect from "@/components/drill/level-select";
import RecordStage from "@/components/drill/record-stage";
import VerdictCard from "@/components/drill/verdict-card";
import CatColony from "@/components/fx/cat-colony";
import {
  DEFAULT_DURATION,
  DEFAULT_LANGUAGE,
  DrillError,
  fetchConcept,
  gradeAnswer,
  GRADING_LINES,
  randomExhaustedLine,
  TRANSCRIBING_LINES,
  transcribeAudio,
  type Concept,
  type ConceptCounts,
  type DrillLanguage,
  type LevelFilter,
  type Verdict,
} from "@/lib/drill";
import { fallbackConcept } from "@/lib/drill-decoys";
import {
  averageScore,
  currentStreak,
  markSeen,
  readHistory,
  recordRun,
  saveLanguage,
  type DrillHistory,
} from "@/lib/drill-history";
import { useRecorder } from "@/lib/use-recorder";

/**
 * DRILL.EXE state machine.
 *
 *   idle ──START──▶ spinning ──▶ armed ──RECORD──▶ recording ──▶ transcribing ──▶ grading ──▶ result
 *                                  │                                                            │
 *                                  └── mic denied / STT down / grade failed ──▶ typing ─────────┘
 *
 * `typing` is not only the accessibility fallback — it doubles as the retry
 * surface. When transcription succeeds but grading fails, the user lands there
 * with the transcript already filled in, so a retry costs no re-recording and
 * no second Deepgram call.
 */

type Stage = "idle" | "spinning" | "armed" | "recording" | "transcribing" | "typing" | "grading" | "result";

/** Milliseconds per count-in step, after the permission dialog is dismissed. */
const COUNT_IN_MS = 800;

/** How long the reel spins before it is allowed to land, even on a fast response. */
const MIN_SPIN_MS = 1500;

/** After this, stop waiting on the server and land on a local concept. */
const CONCEPT_TIMEOUT_MS = 5000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Placeholder until a verdict arrives; never rendered on its own. */
const CHAIN_FALLBACK = "That's enough on this topic. Pick another one.";

/** Rotates the coach's thinking lines so the wait has a pulse instead of a spinner. */
function useRotatingLine(lines: readonly string[], active: boolean) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!active) return;
    setIndex(Math.floor(Math.random() * lines.length));
    const timer = setInterval(() => setIndex((i) => (i + 1) % lines.length), 3500);
    return () => clearInterval(timer);
  }, [active, lines]);
  return lines[index] ?? lines[0]!;
}

export default function DrillConsole() {
  const [stage, setStage] = useState<Stage>("idle");
  const [level, setLevel] = useState<LevelFilter>("all");
  const [duration, setDuration] = useState<number>(DEFAULT_DURATION);
  const [language, setLanguage] = useState<DrillLanguage>(DEFAULT_LANGUAGE);
  const [concept, setConcept] = useState<Concept | null>(null);
  const [counts, setCounts] = useState<ConceptCounts | null>(null);
  const [countIn, setCountIn] = useState<number | null>(null);
  const [transcript, setTranscript] = useState("");
  const [typed, setTyped] = useState("");
  const [spokenSec, setSpokenSec] = useState(0);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [history, setHistory] = useState<DrillHistory>({
    seen: [],
    runs: [],
    streak: 0,
    lastRunDay: null,
    language: DEFAULT_LANGUAGE,
  });
  /**
   * Set while answering one of the coach's own questions. `concept` is then a
   * stand-in whose title is the question, so every stage below renders it
   * without needing to know a follow-up is in progress.
   */
  const [followUp, setFollowUp] = useState<{ id: string; question: string } | null>(null);
  // Picked once per verdict so it doesn't reshuffle on every re-render.
  const [exhaustedLine, setExhaustedLine] = useState(CHAIN_FALLBACK);

  const recorder = useRecorder({ limitSec: duration });
  const reduceMotion = useReducedMotion();
  const mountedRef = useRef(true);
  const gradingLine = useRotatingLine(GRADING_LINES[language], stage === "grading");

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // localStorage is client-only, so history arrives after hydration. The
  // language preference rides along with it.
  useEffect(() => {
    const stored = readHistory();
    setHistory(stored);
    setLanguage(stored.language);
  }, []);

  const handleLanguageChange = useCallback((next: DrillLanguage) => {
    setLanguage(next);
    setHistory(saveLanguage(next));
  }, []);

  // Populate the pool counter on the idle screen. The concept it deals is
  // discarded — the endpoint is a pure read, so this costs nothing.
  useEffect(() => {
    const controller = new AbortController();
    fetchConcept("all", [], controller.signal)
      .then((result) => setCounts(result.counts))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // ---- grading ------------------------------------------------------------

  const submitForGrading = useCallback(
    async (text: string, seconds: number, forConcept: Concept) => {
      setStage("grading");
      setNotice(null);
      setTranscript(text);
      setSpokenSec(seconds);

      try {
        const result = await gradeAnswer({
          conceptId: forConcept.id,
          transcript: text,
          limitSec: duration,
          spokenSec: seconds,
          language,
          ...(followUp ? { followUpId: followUp.id } : {}),
        });
        if (!mountedRef.current) return;
        setVerdict(result);
        setExhaustedLine(randomExhaustedLine(language));
        setHistory(
          recordRun({
            conceptId: forConcept.id,
            conceptTitle: forConcept.title,
            level: forConcept.level,
            overall: result.overall,
            at: Date.now(),
            chainDepth: result.chainDepth,
          }),
        );
        // The chain advances on the server; clear ours so a retry from the
        // result screen doesn't re-submit against a spent question.
        setFollowUp(null);
        setStage("result");
      } catch (error) {
        if (!mountedRef.current) return;
        // A stale follow-up can't be retried — the server has forgotten the
        // question, so send them back to the top rather than looping.
        if (error instanceof DrillError && error.kind === "followup_expired") {
          setFollowUp(null);
          setNotice(error.message);
          setStage("idle");
          return;
        }
        // Otherwise drop back to the typing stage with the text intact so
        // retrying costs nothing — no re-recording, no second transcription.
        setNotice(error instanceof DrillError ? error.message : "Grading failed. Try again?");
        setTyped(text);
        setStage("typing");
      }
    },
    [duration, followUp, language],
  );

  // ---- start / deal -------------------------------------------------------

  const handleStart = useCallback(() => {
    setStage("spinning");
    setConcept(null);
    setVerdict(null);
    setTranscript("");
    setTyped("");
    setNotice(null);
    setFollowUp(null);

    const seen = readHistory().seen;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONCEPT_TIMEOUT_MS);

    fetchConcept(level, seen, controller.signal)
      .then((result) => {
        if (!mountedRef.current) return;
        setConcept(result.concept);
        setCounts(result.counts);
      })
      .catch(() => {
        if (!mountedRef.current) return;
        // The reel must always land on something gradeable rather than stall.
        setConcept(fallbackConcept(level === "all" ? "intermediate" : level));
        setNotice("Couldn't reach the concept bank, so here's one I know by heart.");
      })
      .finally(() => clearTimeout(timeout));
  }, [level]);

  // ConceptSlot holds this in a ref, so depending on `concept` doesn't restart
  // the reel mid-spin.
  const handleSettled = useCallback(() => {
    setStage("armed");
    if (concept) setHistory(markSeen(concept.id));
  }, [concept]);

  /**
   * Answer one of the coach's own questions instead of a fresh concept.
   *
   * Skips the reel — the question is already on screen — and swaps the concept
   * for a stand-in whose title is the question. Keeping the real concept id
   * matters: it still drives Deepgram's keyterms, and the server resolves the
   * actual topic from the follow-up token regardless.
   */
  const handleAnswerFollowUp = useCallback(
    (followUpId: string, question: string) => {
      if (!concept) return;
      setFollowUp({ id: followUpId, question });
      setConcept({ ...concept, title: question, probes: [] });
      setVerdict(null);
      setTranscript("");
      setTyped("");
      setNotice(null);
      setStage("armed");
    },
    [concept],
  );

  // ---- record -------------------------------------------------------------

  const handleRecord = useCallback(async () => {
    if (!concept) return;
    setNotice(null);

    const ready = await recorder.prepare();
    if (!mountedRef.current) return;
    if (!ready) {
      setNotice(recorder.error?.message ?? "Couldn't get the mic. Type your answer instead.");
      setStage("typing");
      return;
    }

    setStage("recording");
    for (let n = 3; n >= 1; n -= 1) {
      setCountIn(n);
      await sleep(COUNT_IN_MS);
      if (!mountedRef.current) return;
    }
    setCountIn(0);
    await sleep(300);
    if (!mountedRef.current) return;
    setCountIn(null);

    const result = await recorder.begin();
    if (!mountedRef.current) return;

    if (!result || result.blob.size === 0) {
      setNotice(recorder.error?.message ?? "That recording came back empty. Type your answer instead.");
      setStage("typing");
      return;
    }

    setStage("transcribing");
    try {
      const stt = await transcribeAudio(result.blob, concept.id, language);
      if (!mountedRef.current) return;
      await submitForGrading(stt.transcript, stt.durationSec || result.seconds, concept);
    } catch (error) {
      if (!mountedRef.current) return;
      setNotice(
        error instanceof DrillError
          ? error.message
          : "Couldn't transcribe that. Type your answer instead.",
      );
      setStage("typing");
    }
  }, [concept, recorder, submitForGrading, language]);

  const handleStop = useCallback(() => recorder.stop(), [recorder]);

  const handleBackToStart = useCallback(() => {
    recorder.cancel();
    setCountIn(null);
    setFollowUp(null);
    setStage("idle");
    setNotice(null);
  }, [recorder]);

  // ---- render -------------------------------------------------------------

  const showSlot = stage === "spinning" || stage === "armed";

  /**
   * Cats roam while you're browsing or reading a verdict, and clear out the
   * moment a topic is dealt. They're the best part of the site and the worst
   * possible thing to have wandering past while someone is ninety seconds into
   * explaining consensus — so they're mounted by stage rather than globally.
   */
  const catsWelcome = stage === "idle" || stage === "result";

  return (
    <div className="flex w-full flex-col items-center gap-6">
      {catsWelcome && <CatColony />}

      {notice && (
        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          role="status"
          className="w-full max-w-2xl border border-gold/30 bg-gold/5 px-4 py-2.5 font-mono text-xs text-gold"
        >
          {notice}
        </motion.p>
      )}

      {stage === "idle" && (
        <LevelSelect
          level={level}
          onLevelChange={setLevel}
          duration={duration}
          onDurationChange={setDuration}
          language={language}
          onLanguageChange={handleLanguageChange}
          onStart={handleStart}
          counts={counts}
          streak={currentStreak(history)}
          average={averageScore(history)}
          runs={history.runs}
        />
      )}

      {showSlot && (
        <div className="flex w-full max-w-2xl flex-col items-center gap-8">
          {followUp ? (
            // A follow-up skips the reel — the question is already on screen
            // from the verdict, so re-dealing it would be theatre.
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="eyebrow">
                <span className="sigil">▸</span> follow-up
              </p>
              <h2 className="font-display text-xl leading-tight font-semibold text-bright sm:text-2xl">
                {followUp.question}
              </h2>
            </div>
          ) : (
            <ConceptSlot
              spinning={stage === "spinning"}
              target={concept}
              minSpinMs={MIN_SPIN_MS}
              onSettled={handleSettled}
            />
          )}

          {stage === "armed" && concept && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="flex w-full flex-col items-center gap-3"
            >
              <p className="font-mono text-[11px] text-dim">
                {duration}s on the clock. Take a breath — the timer starts after the count-in.
              </p>
              <button
                type="button"
                onClick={handleRecord}
                className="w-full border border-cyan/50 bg-cyan/5 px-6 py-4 font-display text-lg font-semibold tracking-wide text-cyan transition-all hover:border-cyan hover:bg-cyan/15 hover:shadow-[0_0_32px_rgba(51,224,255,0.15)]"
              >
                ● RECORD
              </button>
              <button
                type="button"
                onClick={() => setStage("typing")}
                className="font-mono text-[11px] text-dim underline-offset-4 transition-colors hover:text-bright hover:underline"
              >
                or type the answer instead
              </button>
              <button
                type="button"
                onClick={followUp ? handleStart : handleBackToStart}
                className="font-mono text-[10px] tracking-[0.14em] text-dim/60 uppercase transition-colors hover:text-dim"
              >
                {followUp ? "skip — deal a new topic" : "deal a different topic"}
              </button>
            </motion.div>
          )}
        </div>
      )}

      {stage === "recording" && concept && (
        <RecordStage
          concept={concept}
          limitSec={duration}
          elapsedSec={recorder.elapsedSec}
          countIn={countIn}
          analyser={recorder.analyser}
          recording={recorder.status === "recording"}
          onStop={handleStop}
        />
      )}

      {(stage === "transcribing" || stage === "grading") && concept && (
        <div className="flex min-h-[16rem] w-full max-w-2xl flex-col items-center justify-center gap-4 text-center">
          <p className="eyebrow">
            <span className="sigil">▸</span> {stage === "transcribing" ? "transcribing" : "grading"}
          </p>
          <p className="font-mono text-sm text-dim">
            {stage === "transcribing" ? TRANSCRIBING_LINES[language] : gradingLine}
          </p>
          <div className="h-px w-40 overflow-hidden bg-line">
            <motion.div
              className="h-full w-1/3 bg-cyan"
              animate={reduceMotion ? undefined : { x: ["-100%", "300%"] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </div>
      )}

      {stage === "typing" && concept && (
        <div className="flex w-full max-w-2xl flex-col gap-5">
          <header className="flex flex-col gap-2">
            <p className="eyebrow">
              <span className="sigil">▸</span> typed answer
            </p>
            <h2 className="font-display text-xl font-semibold text-bright">{concept.title}</h2>
          </header>

          {concept.probes.length > 0 && (
            <ul className="flex flex-col gap-1.5 font-mono text-xs text-dim">
              {concept.probes.map((probe) => (
                <li key={probe} className="flex gap-2">
                  <span className="text-cyan/60">·</span>
                  <span>{probe}</span>
                </li>
              ))}
            </ul>
          )}

          <textarea
            value={typed}
            onChange={(event) => setTyped(event.target.value.slice(0, 12_000))}
            rows={10}
            placeholder="Write it the way you'd say it out loud…"
            className="w-full resize-y border border-line bg-surface/60 p-3 font-mono text-sm text-bright placeholder:text-dim/50 focus:border-cyan/50 focus:outline-none"
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={typed.trim().length === 0}
              onClick={() => submitForGrading(typed, Math.min(duration, Math.round((typed.split(/\s+/).length / 130) * 60)), concept)}
              className="flex-1 border border-cyan/50 bg-cyan/5 px-6 py-3.5 font-display font-semibold tracking-wide text-cyan transition-all hover:border-cyan hover:bg-cyan/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              GRADE IT
            </button>
            <button
              type="button"
              onClick={handleBackToStart}
              className="border border-line px-6 py-3.5 font-mono text-[11px] tracking-[0.14em] text-dim uppercase transition-colors hover:border-cyan/30 hover:text-bright"
            >
              start over
            </button>
          </div>
        </div>
      )}

      {stage === "result" && concept && verdict && (
        <VerdictCard
          concept={concept}
          verdict={verdict}
          transcript={transcript}
          spokenSec={spokenSec}
          exhaustedLine={exhaustedLine}
          onAnswerFollowUp={handleAnswerFollowUp}
          onAgain={handleStart}
          onBackToStart={handleBackToStart}
        />
      )}
    </div>
  );
}
