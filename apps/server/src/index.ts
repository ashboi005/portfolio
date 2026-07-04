import path from "node:path";

import { cors } from "@elysiajs/cors";
import { config } from "dotenv";
import { Elysia, t } from "elysia";
import nodemailer from "nodemailer";

// Load env for local dev (root .env and, if present, apps/server/.env).
// In production these come from the container/host environment.
config({ path: path.resolve(import.meta.dir, "../../../.env") });
config();

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const CONTACT_TO = process.env.CONTACT_TO || GMAIL_USER;

// Only build a transporter if SMTP is configured; otherwise the route still
// accepts submissions (logs them) so the site works without email set up.
const transporter =
  GMAIL_USER && GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        service: "gmail",
        auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
      })
    : null;

if (!transporter) {
  console.warn("[contact] GMAIL_USER / GMAIL_APP_PASSWORD not set — emails will be logged, not sent.");
}

// ---- AutoSage RAG proxy ("chat with Ashwath") ----
// The website/terminal chat talks to this route; the route forwards to the
// AutoSage RAG service so the API key never reaches the browser.
const AUTOSAGE_BASE_URL = process.env.AUTOSAGE_BASE_URL?.replace(/\/+$/, "");
const AUTOSAGE_TENANT_ID = process.env.AUTOSAGE_TENANT_ID;
const AUTOSAGE_KB_ID = process.env.AUTOSAGE_KB_ID;
const AUTOSAGE_API_KEY = process.env.AUTOSAGE_API_KEY;
const AUTOSAGE_MODEL = "deepseek/deepseek-v4-flash";

const chatConfigured = Boolean(
  AUTOSAGE_BASE_URL && AUTOSAGE_TENANT_ID && AUTOSAGE_KB_ID && AUTOSAGE_API_KEY,
);
if (!chatConfigured) {
  console.warn(
    "[chat] AutoSage env incomplete (AUTOSAGE_BASE_URL / AUTOSAGE_TENANT_ID / AUTOSAGE_KB_ID / AUTOSAGE_API_KEY) — chat will return 503.",
  );
}

/**
 * Fish the reply out of the AutoSage response. Observed shapes:
 *  - create chat:  { response: { assistant_message: { content } } }
 *  - fast-query:   { final_answer }
 * The rest are fallbacks in case the API evolves.
 */
function extractReply(payload: unknown, depth = 0): string | null {
  if (payload == null || depth > 3) return null;
  if (typeof payload === "string") return payload.trim() || null;
  if (typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  for (const key of [
    "final_answer",
    "reply",
    "response",
    "assistant_message",
    "answer",
    "content",
    "message",
    "text",
    "output",
    "result",
    "data",
  ]) {
    if (key in record) {
      const found = extractReply(record[key], depth + 1);
      if (found) return found;
    }
  }
  const choices = record.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    return extractReply(choices[0], depth + 1);
  }
  return null;
}

/**
 * Lean Elysia API. The site is content-driven from a static JSON file; this
 * server handles the contact form, emailing submissions to Ashwath via Gmail.
 */
const app = new Elysia()
  .use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()) ?? true,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type"],
    }),
  )
  .get("/", () => ({ status: "ok", service: "ashwath.sys api", cats: "roaming" }))
  .get("/health", () => ({ ok: true, mail: Boolean(transporter), uptime: process.uptime() }))
  .post(
    "/api/v1/contact",
    async ({ body, set }) => {
      const { name, email, message } = body;

      if (!transporter) {
        console.log("[contact] (no SMTP)", email, "—", message.slice(0, 120));
        set.status = 202;
        return {
          status: "202 Accepted",
          message: "Received — but email delivery isn't configured on this server yet.",
        };
      }

      try {
        await transporter.sendMail({
          from: `"ASHWATH.SYS portfolio" <${GMAIL_USER}>`,
          to: CONTACT_TO,
          replyTo: `"${name}" <${email}>`,
          subject: `Portfolio message from ${name}`,
          text: `${message}\n\n— ${name} (${email})`,
          html: `<p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
                 <hr/><p><strong>${escapeHtml(name)}</strong> &lt;${escapeHtml(email)}&gt;</p>`,
        });
        set.status = 201;
        return {
          status: "201 Created",
          receivedAt: new Date().toISOString(),
          message: "Request accepted. Response SLA: faster than my CI pipeline.",
        };
      } catch (error) {
        console.error("[contact] send failed:", error);
        set.status = 502;
        return { status: "502 Bad Gateway", message: "Mail delivery failed. Try emailing directly." };
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 2 }),
        email: t.String({ format: "email" }),
        message: t.String({ minLength: 10 }),
      }),
    },
  )
  .post(
    "/api/v1/chat",
    async ({ body, set }) => {
      if (!chatConfigured) {
        set.status = 503;
        return {
          reply:
            "My brain service isn't wired up on this server yet. Email me instead — I answer faster than my CI pipeline.",
        };
      }

      const { chatId, message, isNew } = body;
      const url = isNew
        ? `${AUTOSAGE_BASE_URL}/api/v1/chats/`
        : `${AUTOSAGE_BASE_URL}/api/v1/chats/fast-query`;
      // NB: no `title` — AutoSage 400s on an empty title; omitting it
      // auto-generates one from the first message.
      const payload = isNew
        ? {
            id: chatId,
            tenant_id: AUTOSAGE_TENANT_ID,
            knowledge_base_id: AUTOSAGE_KB_ID,
            message,
            model: AUTOSAGE_MODEL,
            websearch_enable: false,
            agent_mode: "quick",
          }
        : {
            knowledge_base_id: AUTOSAGE_KB_ID,
            content: message,
            model: AUTOSAGE_MODEL,
            chat_id: chatId,
            chunk_count: 12,
            websearch_enable: false,
          };

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${AUTOSAGE_API_KEY}`,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(45_000),
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          console.error(`[chat] AutoSage ${response.status} on ${url}:`, detail.slice(0, 400));
          set.status = 502;
          return { reply: "Hm, my memory service just glitched. Give it another shot in a second?" };
        }

        const data = await response.json().catch(() => null);
        const reply = extractReply(data);
        if (!reply) {
          console.error("[chat] could not find reply in AutoSage response:", JSON.stringify(data)?.slice(0, 400));
          set.status = 502;
          return { reply: "I definitely thought of something, but it got lost on the way. Ask me again?" };
        }
        return { reply };
      } catch (error) {
        console.error("[chat] request failed:", error);
        set.status = 502;
        return { reply: "My brain took too long to respond (even I'm surprised). Try that again?" };
      }
    },
    {
      body: t.Object({
        chatId: t.String({ minLength: 8, maxLength: 64 }),
        message: t.String({ minLength: 1, maxLength: 4000 }),
        isNew: t.Boolean(),
      }),
    },
  )
  .get(
    "/api/v1/chat/history",
    async ({ query, set }) => {
      if (!chatConfigured) {
        set.status = 503;
        return { messages: [] };
      }
      try {
        const response = await fetch(
          `${AUTOSAGE_BASE_URL}/api/v1/chats/${encodeURIComponent(query.chatId)}/messages`,
          {
            headers: { Authorization: `Bearer ${AUTOSAGE_API_KEY}` },
            signal: AbortSignal.timeout(15_000),
          },
        );
        if (!response.ok) {
          // unknown chat id (wiped server-side, etc.) — client falls back to a fresh session
          set.status = response.status === 404 ? 404 : 502;
          return { messages: [] };
        }
        const data = (await response.json().catch(() => null)) as {
          messages?: { role?: string; content?: string }[];
        } | null;
        const messages = (data?.messages ?? [])
          .filter((m) => typeof m.content === "string" && m.content.trim())
          .map((m) => ({
            role: m.role === "user" ? ("user" as const) : ("ashwath" as const),
            text: m.content!,
          }));
        return { messages };
      } catch (error) {
        console.error("[chat] history fetch failed:", error);
        set.status = 502;
        return { messages: [] };
      }
    },
    {
      query: t.Object({
        chatId: t.String({ minLength: 8, maxLength: 64 }),
      }),
    },
  )
  .listen(Number(process.env.PORT) || 3000, (server) => {
    console.log(`ashwath.sys api on http://localhost:${server.port}`);
  });

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type App = typeof app;
