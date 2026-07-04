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
const AUTOSAGE_AGENT_ID = process.env.AUTOSAGE_AGENT_ID;
const AUTOSAGE_API_KEY = process.env.AUTOSAGE_API_KEY;

const chatConfigured = Boolean(AUTOSAGE_BASE_URL && AUTOSAGE_AGENT_ID && AUTOSAGE_API_KEY);
if (!chatConfigured) {
  console.warn(
    "[chat] AutoSage env incomplete (AUTOSAGE_BASE_URL / AUTOSAGE_AGENT_ID / AUTOSAGE_API_KEY) — chat will return 503.",
  );
}

/**
 * Fish the reply and chat_id out of the AutoSage agent response.
 * Expected shape: { assistant_message: { content }, chat_id }
 */
function extractAgentResponse(payload: unknown): { reply: string | null; chatId: string | null } {
  if (payload == null || typeof payload !== "object") {
    return { reply: null, chatId: null };
  }
  const record = payload as Record<string, unknown>;
  const chatId = typeof record.chat_id === "string" ? record.chat_id : null;
  const assistantMsg = record.assistant_message;
  if (assistantMsg && typeof assistantMsg === "object") {
    const content = (assistantMsg as Record<string, unknown>).content;
    if (typeof content === "string" && content.trim()) {
      return { reply: content.trim(), chatId };
    }
  }
  return { reply: null, chatId };
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

      const { chatId, message } = body;

      // Build payload — omit chat_id for the first message so AutoSage creates a new chat
      const payload: Record<string, string> = { message };
      if (chatId) payload.chat_id = chatId;

      try {
        const url = `${AUTOSAGE_BASE_URL}/api/v1/agents/${AUTOSAGE_AGENT_ID}/messages`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${AUTOSAGE_API_KEY}`,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(60_000),
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          console.error(`[chat] AutoSage ${response.status} on ${url}:`, detail.slice(0, 400));
          set.status = 502;
          return { reply: "Hm, my memory service just glitched. Give it another shot in a second?" };
        }

        const data = await response.json().catch(() => null);
        const result = extractAgentResponse(data);
        if (!result.reply) {
          console.error("[chat] could not find reply in AutoSage response:", JSON.stringify(data)?.slice(0, 400));
          set.status = 502;
          return { reply: "I definitely thought of something, but it got lost on the way. Ask me again?" };
        }
        return { reply: result.reply, chatId: result.chatId };
      } catch (error) {
        console.error("[chat] request failed:", error);
        set.status = 502;
        return { reply: "My brain took too long to respond (even I'm surprised). Try that again?" };
      }
    },
    {
      body: t.Object({
        chatId: t.Optional(t.String({ minLength: 8, maxLength: 64 })),
        message: t.String({ minLength: 1, maxLength: 4000 }),
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
