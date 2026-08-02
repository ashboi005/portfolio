"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

/**
 * Live oscilloscope for the recording stage.
 *
 * This is deliberately the *only* live feedback while someone speaks. Interim
 * speech-to-text captions were the obvious alternative and were rejected: they
 * are frequently wrong, and watching a bad transcription of yourself mid-answer
 * is more distracting than useful. A waveform can't be wrong.
 *
 * With reduced motion the trace is replaced by a stepped level meter, which
 * still confirms "the mic is hearing you" without a moving line.
 */
export default function Waveform({
  analyser,
  active,
  className,
}: {
  analyser: AnalyserNode | null;
  active: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let frame = 0;
    let disposed = false;
    const buffer = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    // Match the backing store to device pixels so the 1px trace stays crisp.
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const draw = () => {
      if (disposed) return;
      const { width, height } = canvas.getBoundingClientRect();
      const mid = height / 2;

      context.clearRect(0, 0, width, height);

      // Centre line — always visible, so the panel never looks broken.
      context.strokeStyle = "rgba(139, 146, 167, 0.25)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(0, mid);
      context.lineTo(width, mid);
      context.stroke();

      if (analyser && buffer && active) {
        analyser.getByteTimeDomainData(buffer);

        if (reduceMotion) {
          // Peak amplitude as a stepped meter instead of a moving trace.
          let peak = 0;
          for (const sample of buffer) peak = Math.max(peak, Math.abs(sample - 128) / 128);
          const bars = 32;
          const lit = Math.round(peak * bars * 1.6);
          const barWidth = width / bars;
          for (let i = 0; i < bars; i += 1) {
            context.fillStyle = i < lit ? "#33e0ff" : "rgba(51, 224, 255, 0.12)";
            const barHeight = Math.max(2, height * 0.5 * (0.3 + (i / bars) * 0.7));
            context.fillRect(i * barWidth + 1, mid - barHeight / 2, barWidth - 2, barHeight);
          }
        } else {
          context.strokeStyle = "#33e0ff";
          context.lineWidth = 1.5;
          context.shadowBlur = 8;
          context.shadowColor = "rgba(51, 224, 255, 0.6)";
          context.beginPath();
          const step = width / buffer.length;
          for (let i = 0; i < buffer.length; i += 1) {
            const y = mid + ((buffer[i]! - 128) / 128) * (height / 2) * 0.9;
            if (i === 0) context.moveTo(0, y);
            else context.lineTo(i * step, y);
          }
          context.stroke();
          context.shadowBlur = 0;
        }
      }

      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [analyser, active, reduceMotion]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
