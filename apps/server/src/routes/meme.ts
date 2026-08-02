/**
 * Meme resolver. The chatbot returns a meme id in its JSON; the frontend hits
 * this to turn that id into the actual CloudFront URL to render.
 *
 * Edit apps/server/src/data/memes.json to add one — no DB, no admin panel.
 */

import { Elysia, t } from "elysia";

import memes from "../data/memes.json";

const MEME_URLS: Record<string, string> = Object.fromEntries(
  Object.entries(memes as Record<string, string>).filter(
    ([id, url]) => !id.startsWith("_") && typeof url === "string" && url.startsWith("http"),
  ),
);

export const memeRoutes = new Elysia({ name: "meme" }).get(
  "/api/v1/meme/:id",
  ({ params, set }) => {
    const url = MEME_URLS[params.id];
    if (!url) {
      set.status = 404;
      return { error: "unknown meme id" };
    }
    return { id: params.id, url };
  },
  {
    params: t.Object({
      id: t.String({ minLength: 1, maxLength: 80 }),
    }),
  },
);
