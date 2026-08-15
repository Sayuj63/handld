import { Resend } from "resend";

import { STATUS_LABELS } from "@/lib/constants";

/* Email delivery: Resend in production, console in dev. */

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
// No domain yet? Resend's onboarding@resend.dev test sender only delivers to
// your own account email. Set EMAIL_FROM to a verified domain once you add one.
export const EMAIL_FROM = process.env.EMAIL_FROM || "ChangeDesk <onboarding@resend.dev>";

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  idempotencyKey?: string;
}) {
  if (!resend) {
    // Dev mode: log the email instead of sending.
    console.log(
      `\n[email:dev] to=${input.to} idempotency=${input.idempotencyKey ?? "-"}\nsubject=${input.subject}\n${input.html}\n`,
    );
    return { id: `dev-${input.idempotencyKey ?? Math.random()}` };
  }
  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
    ...(input.idempotencyKey ? { headers: { "Idempotency-Key": input.idempotencyKey } } : {}),
  });
  if (error) throw new Error(error.message);
  return { id: data?.id };
}

/* ---------- design tokens ---------- */

const BRAND = {
  green: "#008060",
  ink: "#1e1e1e",
  muted: "#6d7175",
  faint: "#8c9196",
  border: "#e1e3e5",
  canvas: "#f6f6f7",
  white: "#ffffff",
};

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/* ---------- helpers ---------- */

/** Escape user-provided text before it goes into HTML. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/* ---------- layout ---------- */

function layout(title: string, preheader: string, bodyHtml: string) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.canvas};font-family:${FONT};color:${BRAND.ink};">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;mso-hide:all;opacity:0;font-size:1px;line-height:1px;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.canvas};padding:24px 12px;"><tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:${BRAND.white};border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <tr><td style="background:${BRAND.ink};padding:22px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-size:17px;font-weight:700;color:${BRAND.white};letter-spacing:0.01em;">ChangeDesk</td>
        <td align="right" style="font-size:12px;color:#a0a4a8;">Client change portal</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:28px;">
      <h1 style="margin:0 0 16px;font-size:20px;line-height:1.35;color:${BRAND.ink};font-weight:700;">${esc(title)}</h1>
      ${bodyHtml}
    </td></tr>
    <tr><td style="padding:18px 28px;border-top:1px solid ${BRAND.border};background:#fafbfb;">
      <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:${BRAND.faint};">ChangeDesk · Client change request portal</p>
      <p style="margin:0;font-size:12px;line-height:1.6;color:${BRAND.faint};">
        <a href="${esc(appUrl())}/notifications" style="color:${BRAND.muted};text-decoration:underline;">Notification settings</a>
        &nbsp;·&nbsp;
        <a href="${esc(appUrl())}" style="color:${BRAND.muted};text-decoration:underline;">Open ChangeDesk</a>
      </p>
    </td></tr>
  </table>
  <p style="margin:12px 0 0;font-size:11px;line-height:1.5;color:${BRAND.faint};text-align:center;">You're receiving this because of activity on a change request in ChangeDesk.</p>
</td></tr></table>
</body>
</html>`;
}

/* ---------- blocks ---------- */

function linkButton(href: string, label: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;"><tr><td style="border-radius:8px;background:${BRAND.green};">
<a href="${esc(href)}" style="display:block;padding:12px 20px;color:${BRAND.white};text-decoration:none;font-size:15px;font-weight:600;text-align:center;border-radius:8px;">${esc(label)}</a>
</td></tr></table>`;
}

function fallbackLink(href: string) {
  return `<p style="margin:6px 0 0;font-size:12px;color:${BRAND.faint};">If the button doesn't work, open this link: <a href="${esc(href)}" style="color:${BRAND.muted};">${esc(href)}</a></p>`;
}

function infoBlock(label: string, value: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:${BRAND.canvas};border:1px solid ${BRAND.border};border-radius:8px;"><tr><td style="padding:14px 16px;">
<p style="margin:0 0 4px;font-size:11px;color:${BRAND.faint};text-transform:uppercase;letter-spacing:0.05em;">${esc(label)}</p>
<p style="margin:0;font-size:15px;color:${BRAND.ink};font-weight:600;line-height:1.4;">${esc(value)}</p>
</td></tr></table>`;
}

function noteBox(note: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;"><tr><td style="background:${BRAND.canvas};border-left:3px solid ${BRAND.green};border-radius:0 6px 6px 0;padding:12px 16px;font-size:14px;line-height:1.6;color:${BRAND.ink};"><strong style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:${BRAND.muted};">Note</strong><br/>${esc(note).replace(/\n/g, "<br/>")}</td></tr></table>`;
}

function divider() {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;"><tr><td style="border-top:1px solid ${BRAND.border};font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
}

/* Status → pill colours (readable in most mail clients). */
const STATUS_PILLS: Record<string, { bg: string; fg: string }> = {
  submitted: { bg: "#e8f0fe", fg: "#1d4fd7" },
  acknowledged: { bg: "#fdf3d7", fg: "#946800" },
  in_progress: { bg: "#efe9fe", fg: "#5b21b6" },
  in_review: { bg: "#e6f7f3", fg: "#0e7490" },
  on_hold: { bg: "#f1f1f2", fg: "#5c5f62" },
  rejected: { bg: "#fdecea", fg: "#b42318" },
  completed: { bg: "#e3f5ec", fg: "#007a5a" },
};

function statusPill(label: string) {
  const key = Object.entries(STATUS_LABELS).find(([, l]) => l === label)?.[0];
  const palette = (key && STATUS_PILLS[key]) || { bg: "#f1f1f2", fg: "#5c5f62" };
  return `<span style="display:inline-block;padding:5px 14px;border-radius:999px;background:${palette.bg};color:${palette.fg};font-size:13px;font-weight:600;">${esc(label)}</span>`;
}

function statusFlow(from: string, to: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;"><tr>
<td>${statusPill(from)}</td>
<td style="padding:0 12px;font-size:15px;color:${BRAND.muted};">→</td>
<td>${statusPill(to)}</td>
</tr></table>`;
}

/* ---------- templates ---------- */

export function inviteEmail(input: { orgName: string; inviterName: string; inviteUrl: string; expiresAt: Date }) {
  return {
    subject: `You're invited to ${input.orgName} on ChangeDesk`,
    html: layout(
      `You're invited to ${input.orgName}`,
      `Join ${input.orgName} on ChangeDesk — invitation from ${input.inviterName}`,
      `<p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:${BRAND.muted};">Hi there,</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:${BRAND.ink};">${esc(input.inviterName)} invited you to collaborate on change requests for <strong>${esc(input.orgName)}</strong> on ChangeDesk.</p>
${infoBlock("Organization", input.orgName)}
<p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:${BRAND.muted};">Create your account (or sign in) to accept the invitation. It expires on <strong>${input.expiresAt.toLocaleDateString()}</strong>.</p>
${linkButton(input.inviteUrl, "Accept invitation")}
${fallbackLink(input.inviteUrl)}`,
    ),
  };
}

export function requestCreatedEmail(input: { orgName: string; title: string; requesterName: string; url: string }) {
  return {
    subject: `New change request from ${input.orgName}: ${input.title}`,
    html: layout(
      "New change request",
      `${input.requesterName} submitted a new change request in ${input.orgName}`,
      `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:${BRAND.ink};">${esc(input.requesterName)} at <strong>${esc(input.orgName)}</strong> submitted a new change request.</p>
${infoBlock("Request", input.title)}
${linkButton(input.url, "View request")}
${fallbackLink(input.url)}`,
    ),
  };
}

export function statusChangedEmail(input: {
  title: string;
  from: string;
  to: string;
  note?: string;
  url: string;
}) {
  return {
    subject: `Status update on "${input.title}" → ${input.to}`,
    html: layout(
      "Status update",
      `"${input.title}" moved from ${input.from} to ${input.to}`,
      `<p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:${BRAND.ink};">The status of your change request has been updated.</p>
${statusFlow(input.from, input.to)}
${infoBlock("Request", input.title)}
${input.note ? noteBox(input.note) : ""}
${linkButton(input.url, "View request")}
${fallbackLink(input.url)}`,
    ),
  };
}

export function commentAddedEmail(input: { title: string; commenter: string; url: string }) {
  return {
    subject: `New comment on "${input.title}"`,
    html: layout(
      "New comment",
      `${input.commenter} commented on "${input.title}"`,
      `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:${BRAND.ink};">${esc(input.commenter)} added a comment to your change request.</p>
${infoBlock("Request", input.title)}
${linkButton(input.url, "View discussion")}
${fallbackLink(input.url)}`,
    ),
  };
}

export function assignmentChangedEmail(input: { title: string; assigneeName: string; url: string }) {
  return {
    subject: `You've been assigned: ${input.title}`,
    html: layout(
      "New assignment",
      `"${input.title}" is now assigned to ${input.assigneeName}`,
      `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:${BRAND.ink};">A change request has been assigned to <strong>${esc(input.assigneeName)}</strong>.</p>
${infoBlock("Request", input.title)}
${linkButton(input.url, "Open request")}
${fallbackLink(input.url)}`,
    ),
  };
}

export function digestEmail(input: { orgName: string; items: { title: string; detail: string }[] }) {
  const count = input.items.length;
  return {
    subject: `${input.orgName} — ${count} update${count === 1 ? "" : "s"} from ChangeDesk`,
    html: layout(
      "Your ChangeDesk digest",
      `${input.orgName} — ${count} update${count === 1 ? "" : "s"} in ChangeDesk`,
      `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:${BRAND.ink};">You have ${count} update${count === 1 ? "" : "s"} for <strong>${esc(input.orgName)}</strong>:</p>
${input.items
  .map(
    (i, idx) =>
      `${idx > 0 ? divider() : ""}<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="width:8px;padding:6px 12px 6px 0;"><span style="display:inline-block;width:8px;height:8px;border-radius:999px;background:${BRAND.green};"></span></td>
<td style="padding:6px 0;"><p style="margin:0;font-size:14px;line-height:1.5;color:${BRAND.ink};font-weight:600;">${esc(i.title)}</p>${i.detail ? `<p style="margin:2px 0 0;font-size:13px;line-height:1.5;color:${BRAND.muted};">${esc(i.detail)}</p>` : ""}</td>
</tr></table>`,
  )
  .join("")}
${linkButton(appUrl(), "Open ChangeDesk")}`,
    ),
  };
}

export { appUrl };
