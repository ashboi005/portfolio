/**
 * "Chat with Ashwath" — proxies the site chat widget and the terminal `chat`
 * command to the conversational AutoSage agent. Multi-turn: AutoSage owns the
 * chat id, the browser stores it and sends it back on later messages.
 *
 * Grading for DRILL.EXE deliberately does NOT go through here — see routes/drill.ts.
 */

import { Elysia, t } from "elysia";

import { AutoSageError, callAgent, isAgentConfigured } from "../lib/autosage";
import { AUTOSAGE_AGENT_ID, AUTOSAGE_API_KEY, AUTOSAGE_BASE_URL } from "../lib/env";

export const chatConfigured = isAgentConfigured(AUTOSAGE_AGENT_ID);

if (!chatConfigured) {
  console.warn(
    "[chat] AutoSage env incomplete (AUTOSAGE_BASE_URL / AUTOSAGE_AGENT_ID / AUTOSAGE_API_KEY) — chat will return 503.",
  );
}

/** In-voice apology per failure mode, so an outage still sounds like Ashwath. */
const FAILURE_REPLY: Record<string, string> = {
  unconfigured:
    "My brain service isn't wired up on this server yet. Email me instead — I answer faster than my CI pipeline.",
  upstream: "Hm, my memory service just glitched. Give it another shot in a second?",
  empty: "I definitely thought of something, but it got lost on the way. Ask me again?",
  network: "My brain took too long to respond (even I'm surprised). Try that again?",
};

export const chatRoutes = new Elysia({ name: "chat" })
  .post(
    "/api/v1/chat",
    async ({ body, set }) => {
      if (!chatConfigured) {
        set.status = 503;
        return { reply: FAILURE_REPLY.unconfigured };
      }

      try {
        const { reply, chatId } = await callAgent(AUTOSAGE_AGENT_ID!, body.message, {
          chatId: body.chatId,
          label: "chat",
        });
        return { reply, chatId };
      } catch (error) {
        const kind = error instanceof AutoSageError ? error.kind : "network";
        set.status = kind === "unconfigured" ? 503 : 502;
        return { reply: FAILURE_REPLY[kind] ?? FAILURE_REPLY.network };
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
  );
