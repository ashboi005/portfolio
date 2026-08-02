/**
 * Contact form → email. The only route that touches SMTP.
 *
 * Degrades rather than fails: with no SMTP configured the submission is logged
 * and accepted with a 202, so the site stays usable on a fresh deploy.
 */

import { Elysia, t } from "elysia";
import nodemailer from "nodemailer";

import { CONTACT_TO, GMAIL_APP_PASSWORD, GMAIL_USER } from "../lib/env";

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

/** True if SMTP is wired up. Surfaced on /health. */
export const mailConfigured = Boolean(transporter);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const contactRoutes = new Elysia({ name: "contact" }).post(
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
);
