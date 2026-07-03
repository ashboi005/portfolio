import { cors } from "@elysiajs/cors";
import { Elysia, t } from "elysia";

/**
 * Lean Elysia API for the portfolio. The site itself is content-driven from a
 * static JSON file, so this server exists to handle dynamic actions — right now
 * the contact form, with room to grow (webhooks, analytics, etc.) later.
 * No database or auth wiring: it runs anywhere with just Bun.
 */
const app = new Elysia()
  .use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(",") ?? true,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type"],
    }),
  )
  .get("/", () => ({ status: "ok", service: "ashwath.sys api", cats: "roaming" }))
  .get("/health", () => ({ ok: true, uptime: process.uptime() }))
  .post(
    "/api/v1/contact",
    ({ body, set }) => {
      // TODO(ashwath): forward to email / store somewhere. For now, accept + log.
      console.log("[contact]", body.email, "—", body.message.slice(0, 80));
      set.status = 201;
      return {
        status: "201 Created",
        receivedAt: new Date().toISOString(),
        message: "Request accepted. Response SLA: faster than my CI pipeline.",
        payload: body,
      };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 2 }),
        email: t.String({ format: "email" }),
        message: t.String({ minLength: 10 }),
      }),
    },
  )
  .listen(Number(process.env.PORT) || 3000, (server) => {
    console.log(`ashwath.sys api on http://localhost:${server.port}`);
  });

export type App = typeof app;
