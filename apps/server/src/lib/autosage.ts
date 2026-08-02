/**
 * Shared client for the AutoSage RAG service.
 *
 * Two agents live behind this: the conversational one (multi-turn, memes) that
 * powers the site chat, and the DRILL.EXE coach (one-shot, rubric JSON). Both
 * hit the same endpoint shape, so the transport lives here and each route owns
 * only its own prompt and response handling. The API key never leaves the server.
 */

import { AUTOSAGE_API_KEY, AUTOSAGE_BASE_URL } from "./env";

export type AutoSageFailure = "unconfigured" | "upstream" | "empty" | "network";

/** Thrown by {@link callAgent}; `kind` lets each route pick its own in-voice message. */
export class AutoSageError extends Error {
  constructor(readonly kind: AutoSageFailure, message: string) {
    super(message);
    this.name = "AutoSageError";
  }
}

/** True if the base URL, key, and the given agent id are all present. */
export function isAgentConfigured(agentId: string | undefined): agentId is string {
  return Boolean(AUTOSAGE_BASE_URL && AUTOSAGE_API_KEY && agentId);
}

/**
 * Fish the reply and chat_id out of an AutoSage agent response.
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
 * Send one message to an agent.
 *
 * Omitting `chatId` makes AutoSage create a new chat — which is exactly what
 * the drill coach wants on every call, since grading is deliberately stateless.
 *
 * @throws {AutoSageError} on missing config, a non-2xx upstream, an unusable
 *   response body, or a network/timeout failure.
 */
export async function callAgent(
  agentId: string,
  message: string,
  options: { chatId?: string; timeoutMs?: number; label?: string } = {},
): Promise<{ reply: string; chatId: string | null }> {
  const { chatId, timeoutMs = 60_000, label = "autosage" } = options;

  if (!isAgentConfigured(agentId)) {
    throw new AutoSageError("unconfigured", "AutoSage is not configured on this server.");
  }

  const payload: Record<string, string> = { message };
  if (chatId) payload.chat_id = chatId;

  const url = `${AUTOSAGE_BASE_URL}/api/v1/agents/${agentId}/messages`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AUTOSAGE_API_KEY}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    console.error(`[${label}] request failed:`, error);
    throw new AutoSageError("network", "AutoSage request failed.");
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(`[${label}] AutoSage ${response.status} on ${url}:`, detail.slice(0, 400));
    throw new AutoSageError("upstream", `AutoSage responded ${response.status}.`);
  }

  const data = await response.json().catch(() => null);
  const result = extractAgentResponse(data);
  if (!result.reply) {
    console.error(`[${label}] no reply in AutoSage response:`, JSON.stringify(data)?.slice(0, 400));
    throw new AutoSageError("empty", "AutoSage returned no usable reply.");
  }

  return { reply: result.reply, chatId: result.chatId };
}
