/**
 * ASHWATH.SYS API.
 *
 * The site itself is content-driven from a static JSON file, so this server is
 * deliberately lean. It exists to hold the things a browser must not: SMTP
 * credentials, the AutoSage key, and the Deepgram key.
 *
 * Route modules live in ./routes and are composed here. Anything that reads
 * configuration goes through ./lib/env so dotenv has run first.
 */

import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

import { CORS_ORIGINS, PORT } from "./lib/env";
import { chatRoutes } from "./routes/chat";
import { contactRoutes, mailConfigured } from "./routes/contact";
import { drillRoutes } from "./routes/drill";
import { memeRoutes } from "./routes/meme";

const app = new Elysia()
  .use(
    cors({
      origin: CORS_ORIGINS ?? true,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type"],
    }),
  )
  .get("/", () => ({ status: "ok", service: "ashwath.sys api", cats: "roaming" }))
  .get("/health", () => ({ ok: true, mail: mailConfigured, uptime: process.uptime() }))
  .use(contactRoutes)
  .use(chatRoutes)
  .use(memeRoutes)
  .use(drillRoutes)
  .listen(PORT, (server) => {
    console.log(`ashwath.sys api on http://localhost:${server.port}`);
  });

export type App = typeof app;
