/**
 * Single place where environment is loaded and read.
 *
 * Every module that needs config imports from here rather than touching
 * `process.env` at its own top level. ES module bodies evaluate in import
 * order, so centralising the `dotenv` call guarantees the .env files are on
 * `process.env` before any consumer reads a value — which is not true if each
 * route module reads env directly and index.ts happens to call config() later.
 */

import path from "node:path";

import { config } from "dotenv";

// Local dev: root .env, then apps/server/.env if present.
// In production these come from the container/host environment.
config({ path: path.resolve(import.meta.dir, "../../../../.env") });
config();

export const PORT = Number(process.env.PORT) || 3000;

export const CORS_ORIGINS = process.env.CORS_ORIGIN?.split(",").map((o) => o.trim());

// ---- Gmail SMTP (contact form) ----
export const GMAIL_USER = process.env.GMAIL_USER;
export const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
export const CONTACT_TO = process.env.CONTACT_TO || GMAIL_USER;

// ---- AutoSage RAG ----
export const AUTOSAGE_BASE_URL = process.env.AUTOSAGE_BASE_URL?.replace(/\/+$/, "");
export const AUTOSAGE_API_KEY = process.env.AUTOSAGE_API_KEY;
/** Conversational "chat with Ashwath" agent — multi-turn, returns memes. */
export const AUTOSAGE_AGENT_ID = process.env.AUTOSAGE_AGENT_ID;
/** DRILL.EXE grading agent — one-shot, returns a rubric. Separate prompt. */
export const AUTOSAGE_COACH_AGENT_ID = process.env.AUTOSAGE_COACH_AGENT_ID;

// ---- Deepgram (DRILL.EXE speech-to-text) ----
export const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
