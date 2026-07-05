/**
 * Shared client for the "chat with Ashwath" RAG service. Used by both the
 * website chat widget (🤓) and the terminal `chat` command so they share one
 * conversation. The frontend stores the chat id returned by the backend
 * (AutoSage creates it, not us) and sends it on subsequent messages.
 */

const CHAT_ID_KEY = "ashwath.sys/chat-id";

export const CHAT_GREETING =
  'Sup dawg. I am Ashwath but digitized. I have my entire brain loaded up here so ask me whatever you want. We can talk about my backend projects, how I started coding (I can give out advices as well), or how I\'m picky about my food.';

function apiBase() {
  return process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
}

function getChatId(): string | null {
  return localStorage.getItem(CHAT_ID_KEY);
}

function setChatId(id: string) {
  localStorage.setItem(CHAT_ID_KEY, id);
}

export type ChatHistoryMessage = { role: "user" | "ashwath"; text: string };

/** True if we have a chat id stored (meaning a conversation exists). */
export function hasExistingChat(): boolean {
  try {
    return getChatId() !== null;
  } catch {
    return false;
  }
}

/**
 * Pulls the previous conversation for the stored chat id so a reload doesn't
 * wipe the visible history. On a 404 (chat gone server-side) the local
 * session is reset so the next message starts a fresh chat.
 */
export async function fetchChatHistory(): Promise<ChatHistoryMessage[]> {
  const chatId = getChatId();
  if (!chatId) return [];
  const response = await fetch(
    `${apiBase()}/api/v1/chat/history?chatId=${encodeURIComponent(chatId)}`,
  );
  if (response.status === 404) {
    localStorage.removeItem(CHAT_ID_KEY);
    return [];
  }
  if (!response.ok) return [];
  const data = (await response.json().catch(() => null)) as {
    messages?: ChatHistoryMessage[];
  } | null;
  return data?.messages ?? [];
}

/**
 * Sends one message. The first message creates a new chat on AutoSage (no
 * chat_id sent); subsequent messages include the stored chat_id.
 * Resolves to Ashwath's reply — rejects with a human-sounding Error otherwise.
 */
export async function sendChatMessage(message: string): Promise<string> {
  const chatId = getChatId();

  const response = await fetch(`${apiBase()}/api/v1/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, ...(chatId ? { chatId } : {}) }),
  });

  const data = (await response.json().catch(() => null)) as {
    reply?: string;
    chatId?: string;
  } | null;

  if (!response.ok) {
    throw new Error(
      data?.reply ?? "Hm, my memory service just glitched. Give it another shot in a second?",
    );
  }

  // Store the chat_id returned by AutoSage (first message only)
  if (data?.chatId) setChatId(data.chatId);

  return data?.reply ?? "…I blanked. Ask me that again?";
}

/**
 * The RAG takes a few seconds, so the wait is covered by Ashwath "thinking
 * out loud" instead of a spinner. Rotate one of these every ~4s.
 */
export const THINKING_LINES = [
  "Thinking...",
  "Hold on, let me finish my Sprite.",
  "One second... I need another sip of tea.",
  "Searching through my questionable life choices...",
  "Trying to remember whether I actually did that...",
  "Compiling memories... hopefully without segmentation faults.",
  "Consulting the Ashwath archives...",
  "Running a very scientific \"trust me, bro\" algorithm.",
  "Debugging my own memories...",
  "Loading... because even I need a second sometimes.",
  "Grepping through 3 AM commit messages...",
  "Waking up the part of my brain that isn't on-call...",
  "Querying SELECT * FROM ashwath WHERE relevant = true;",
  "Hold on, a cat just walked across my keyboard.",
  "Re-reading my own résumé to make sure I'm not lying...",
  "Spinning up a memory pod... it's still in CrashLoopBackOff.",
  "Asking my rubber duck for a second opinion...",
  "Retrieving context... my context window is mostly cats.",
  "Doing a quick vibe check on that question...",
  "Cache miss. Fetching from cold storage (my brain)...",
  "Let me check with the intern (also me)...",
  "Restarting the Docker container in my head...",
  "Buffering... blame my rural bandwidth of thoughts.",
  "Cross-referencing with my hackathon war stories...",
  "Hmm, good question. Pretending I didn't panic just now...",
  "Fetching... this is the p99 latency they warned you about.",
  "Consulting the 30 Sprite cans of wisdom...",
  "Untangling a RAG pipeline... ironically, about myself.",
  "Checking whether that memory is in prod or staging...",
  "Rolling back to a stable version of this thought...",
  "My thoughts are eventually consistent. Almost there...",
  "Indexing my life. It's mostly backend work and cats.",
  "Hold on, arguing with an LLM about who I am...",
  "Warming up the tea-powered inference engine...",
  "That's in my brain's dead-letter queue. Retrying...",
  "Escalating this question to senior me (same guy, more tea)...",
] as const;

/** Random thinking line, avoiding an immediate repeat. */
export function nextThinkingLine(previous?: string): string {
  let line = previous;
  while (line === previous) {
    line = THINKING_LINES[Math.floor(Math.random() * THINKING_LINES.length)]!;
  }
  return line!;
}
