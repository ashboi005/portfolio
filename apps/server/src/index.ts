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
