import { Resend } from "resend";

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

/* ---------- templates ---------- */

function layout(title: string, bodyHtml: string) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f6f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#202223;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f7;padding:24px 0;"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e4e5e7;border-radius:8px;overflow:hidden;">
<tr><td style="padding:20px 24px;border-bottom:1px solid #e4e5e7;background:#ffffff;">
  <span style="font-size:15px;font-weight:600;color:#202223;">ChangeDesk</span>
  <span style="float:right;font-size:12px;color:#8c9196;">Change request portal</span>
</td></tr>
<tr><td style="padding:24px;">
  <h1 style="margin:0 0 12px;font-size:18px;color:#202223;">${title}</h1>
  ${bodyHtml}
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #e4e5e7;font-size:12px;color:#8c9196;">
  Sent by ChangeDesk — you're receiving this because of activity on a change request.
</td></tr>
</table></td></tr></table>
</body></html>`;
}

function linkButton(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;"><tr><td style="border-radius:4px;background:#008060;padding:10px 20px;">
<a href="${href}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">${label}</a></td></tr></table>`;
}

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export function inviteEmail(input: { orgName: string; inviterName: string; inviteUrl: string; expiresAt: Date }) {
  return {
    subject: `${input.inviterName} invited you to ${input.orgName} on ChangeDesk`,
    html: layout(
      `You've been invited to ${input.orgName}`,
      `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;">${input.inviterName} invited you to collaborate on change requests for <strong>${input.orgName}</strong>.</p>
<p style="margin:0 0 12px;font-size:14px;line-height:1.6;">Create your account (or sign in) to accept the invitation. It expires ${input.expiresAt.toLocaleDateString()}.</p>
${linkButton(input.inviteUrl, "Accept invitation")}
<p style="margin:0;font-size:12px;color:#8c9196;">If the button doesn't work, open this link: ${input.inviteUrl}</p>`,
    ),
  };
}

export function requestCreatedEmail(input: { orgName: string; title: string; requesterName: string; url: string }) {
  return {
    subject: `New change request from ${input.orgName}: ${input.title}`,
    html: layout(
      `New change request: ${input.title}`,
      `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;"><strong>${input.requesterName}</strong> at <strong>${input.orgName}</strong> submitted a new request.</p>
${linkButton(input.url, "View request")}`,
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
      `Status update: "${input.title}"`,
      `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;">The status of your request changed from <strong>${input.from}</strong> to <strong>${input.to}</strong>.</p>
${input.note ? `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;background:#f6f6f7;padding:12px;border-left:3px solid #008060;">${input.note}</p>` : ""}
${linkButton(input.url, "View request")}`,
    ),
  };
}

export function commentAddedEmail(input: { title: string; commenter: string; url: string }) {
  return {
    subject: `New comment on "${input.title}"`,
    html: layout(
      `New comment on "${input.title}"`,
      `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;"><strong>${input.commenter}</strong> commented on your request.</p>
${linkButton(input.url, "View discussion")}`,
    ),
  };
}

export function assignmentChangedEmail(input: { title: string; assigneeName: string; url: string }) {
  return {
    subject: `You've been assigned: ${input.title}`,
    html: layout(
      `New assignment: ${input.title}`,
      `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;">This request is now assigned to <strong>${input.assigneeName}</strong>.</p>
${linkButton(input.url, "Open request")}`,
    ),
  };
}

export function digestEmail(input: { orgName: string; items: { title: string; detail: string }[] }) {
  return {
    subject: `${input.orgName} — ${input.items.length} update${input.items.length === 1 ? "" : "s"} from ChangeDesk`,
    html: layout(
      "Your ChangeDesk digest",
      `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;">Updates for <strong>${input.orgName}</strong>:</p>
${input.items.map((i) => `<p style="margin:0 0 10px;font-size:14px;line-height:1.5;"><strong>${i.title}</strong><br/><span style="color:#5c5f62;">${i.detail}</span></p>`).join("")}`,
    ),
  };
}

export { appUrl };
