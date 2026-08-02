"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Microphone recording for DRILL.EXE.
 *
 * Two-step by design: `prepare()` asks for the mic and opens the audio graph,
 * `begin()` starts the actual recording. That lets the console run its 3-2-1
 * count-in *after* the permission dialog is out of the way, so the first
 * second of the answer isn't eaten by a browser prompt — and the oscilloscope
 * is already live during the count-in.
 *
 * The same stream feeds an AnalyserNode for the waveform. Tracks are stopped
 * explicitly on teardown so the browser's recording indicator doesn't stay lit.
 */

export type RecorderStatus =
  | "idle"
  | "requesting"
  | "ready"
  | "recording"
  | "processing"
  | "error";

export type RecorderErrorKind = "denied" | "no-device" | "unsupported" | "failed";

export type RecorderError = { kind: RecorderErrorKind; message: string };

/** Containers MediaRecorder actually produces, best first. Deepgram reads all of them. */
const PREFERRED_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  // Safari only does mp4/aac.
  "audio/mp4",
];

function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const type of PREFERRED_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  // Some builds support recording but report nothing — let the browser choose.
  return "";
}

/**
 * Report the recording as audio even when the browser labelled it video.
 *
 * WebM and MP4 are containers, not media types. When MediaRecorder picks the
 * container itself rather than being handed an explicit `mimeType`, Chrome
 * stamps `video/webm` on the blob even though the stream has only an audio
 * track. The bytes are a valid audio-only WebM, so relabelling is accurate,
 * not a lie — and it stops the upload from looking like a video file.
 */
function normalizeAudioType(mimeType: string): string {
  const base = (mimeType || "audio/webm").split(";")[0]!.trim().toLowerCase();
  const [kind, container] = base.split("/");
  if (kind === "video" && container) return `audio/${container}`;
  return base;
}

const ERROR_COPY: Record<RecorderErrorKind, string> = {
  denied: "Mic access denied. No problem — type your answer instead.",
  "no-device": "No microphone found. Type your answer instead.",
  unsupported: "This browser won't let me record audio. Type your answer instead.",
  failed: "Recording broke halfway. Type your answer instead.",
};

function classifyError(error: unknown): RecorderError {
  const name = (error as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "SecurityError") return { kind: "denied", message: ERROR_COPY.denied };
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return { kind: "no-device", message: ERROR_COPY["no-device"] };
  return { kind: "failed", message: ERROR_COPY.failed };
}

export function useRecorder({ limitSec }: { limitSec: number }) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [error, setError] = useState<RecorderError | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolveRef = useRef<((result: { blob: Blob; seconds: number } | null) => void) | null>(null);
  // Read inside the MediaRecorder callback, which is created once per recording.
  const limitRef = useRef(limitSec);
  limitRef.current = limitSec;

  /** Stop the clock. Safe to call repeatedly. */
  const stopTicking = useCallback(() => {
    if (tickRef.current !== null) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  /** Release the mic and the audio graph. Safe to call repeatedly. */
  const teardown = useCallback(() => {
    stopTicking();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    setAnalyser(null);
  }, [stopTicking]);

  // Guarantee the mic is released if the user navigates away mid-recording.
  useEffect(() => teardown, [teardown]);

  /**
   * Ask for the mic and open the audio graph. Resolves true when the stream is
   * live and `begin()` can be called.
   */
  const prepare = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || pickMimeType() === null) {
      setError({ kind: "unsupported", message: ERROR_COPY.unsupported });
      setStatus("error");
      return false;
    }

    setStatus("requesting");
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      // Waveform source. Wrapped because a failed AudioContext should cost the
      // visualiser, not the recording.
      try {
        const context = new AudioContext();
        const node = context.createAnalyser();
        node.fftSize = 2048;
        node.smoothingTimeConstant = 0.75;
        context.createMediaStreamSource(stream).connect(node);
        audioContextRef.current = context;
        setAnalyser(node);
      } catch {
        setAnalyser(null);
      }

      setElapsedSec(0);
      setStatus("ready");
      return true;
    } catch (caught) {
      setError(classifyError(caught));
      setStatus("error");
      teardown();
      return false;
    }
  }, [teardown]);

  /**
   * Start recording. Resolves when the recording ends — whether by hitting the
   * limit or by a `stop()` call — with the audio and its true length.
   * Resolves null if recording could not start.
   */
  const begin = useCallback((): Promise<{ blob: Blob; seconds: number } | null> => {
    const stream = streamRef.current;
    if (!stream) return Promise.resolve(null);

    const mimeType = pickMimeType();
    if (mimeType === null) return Promise.resolve(null);

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      setError({ kind: "unsupported", message: ERROR_COPY.unsupported });
      setStatus("error");
      teardown();
      return Promise.resolve(null);
    }

    chunksRef.current = [];
    recorderRef.current = recorder;

    const finished = new Promise<{ blob: Blob; seconds: number } | null>((resolve) => {
      resolveRef.current = resolve;
    });

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onerror = () => {
      stopTicking();
      setError({ kind: "failed", message: ERROR_COPY.failed });
      setStatus("error");
      teardown();
      resolveRef.current?.(null);
      resolveRef.current = null;
    };

    recorder.onstop = () => {
      stopTicking();
      const seconds = Math.min(limitRef.current, (Date.now() - startedAtRef.current) / 1000);
      const blob = new Blob(chunksRef.current, { type: normalizeAudioType(recorder.mimeType) });
      chunksRef.current = [];
      setStatus("processing");
      teardown();
      resolveRef.current?.({ blob, seconds: Math.round(seconds) });
      resolveRef.current = null;
    };

    startedAtRef.current = Date.now();
    // Timeslice keeps chunks flowing, so a tab that gets throttled still has
    // most of the audio rather than one buffer that never flushed.
    recorder.start(1000);
    setStatus("recording");
    setElapsedSec(0);

    tickRef.current = setInterval(() => {
      const seconds = (Date.now() - startedAtRef.current) / 1000;
      setElapsedSec(seconds);
      if (seconds >= limitRef.current && recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
    }, 100);

    return finished;
  }, [stopTicking, teardown]);

  /** Stop early. The promise from `begin()` resolves with what was captured. */
  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }, []);

  /** Abandon a recording without producing a result — used when leaving the stage. */
  const cancel = useCallback(() => {
    resolveRef.current?.(null);
    resolveRef.current = null;
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    teardown();
    setStatus("idle");
    setElapsedSec(0);
  }, [teardown]);

  return { status, error, elapsedSec, analyser, prepare, begin, stop, cancel };
}
