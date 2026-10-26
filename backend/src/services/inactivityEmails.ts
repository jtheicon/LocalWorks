import { sendEmail } from "./emailOtp";
import { DEACTIVATION_MONTHS } from "./inactivityPolicy";

export const accountLifecycleEmail = (accountEmail: string, override?: string | null) =>
  override?.trim() || accountEmail;

const appOrigin = () => {
  const fromEnv = process.env.APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const cors = process.env.CORS_ORIGINS?.split(",")[0]?.trim();
  return cors || "http://localhost:8080";
};

const wrapHtml = (title: string, body: string) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title></head>
<body style="margin:0;font-family:Segoe UI,Roboto,Arial,sans-serif;background:#f4f4f5;padding:24px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06)">
<tr><td style="background:#0d9488;padding:20px 24px;color:#fff;font-size:20px;font-weight:700">LocalWorks</td></tr>
<tr><td style="padding:24px;color:#18181b;font-size:15px;line-height:1.55">${body}</td></tr>
<tr><td style="padding:16px 24px;background:#fafafa;color:#71717a;font-size:12px">Questions? Reply to this email or contact your barangay coordinator.</td></tr>
</table></body></html>`;

const btn = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${href}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">${label}</a></p>`;

export const sendInactivityWarningEmail = async (
  to: string,
  name: string,
  month: 3 | 4 | 5,
) => {
  const signIn = `${appOrigin()}/login`;
  const subjects = {
    3: "Account Inactivity Warning — Please Check Your Account",
    4: "Reminder: Your LocalWorks Account Is Still Inactive",
    5: "Final Reminder: Account Deactivation Approaching",
  } as const;
  const intros = {
    3: `We noticed you have not used LocalWorks for about <strong>three months</strong>.`,
    4: `Your account has been inactive for about <strong>four months</strong>.`,
    5: `This is a <strong>final reminder</strong>: your account has been inactive for about <strong>five months</strong>.`,
  } as const;
  const subject = subjects[month];
  const text = `Hi ${name},\n\n${intros[month].replace(/<[^>]+>/g, "")}\n\nSign in to stay active: ${signIn}\n\nIf you remain inactive for ${DEACTIVATION_MONTHS} months, your account may be deactivated.\n\n— LocalWorks`;
  const html = wrapHtml(
    subject,
    `<p>Hi ${name},</p><p>${intros[month]}</p>
<p>LocalWorks connects skilled workers with employers in your community. Signing in and using the platform keeps your profile visible and your account in good standing.</p>
<p>Our policy: after <strong>${DEACTIVATION_MONTHS} months</strong> without meaningful activity, accounts are deactivated for security and data hygiene.</p>
${btn(signIn, "Sign in to LocalWorks")}`,
  );
  await sendEmail(to, subject, text, html);
};

export const sendDeactivationEmail = async (
  to: string,
  name: string,
  reactivationUrl: string,
) => {
  const subject = "Your LocalWorks Account Has Been Deactivated";
  const text = `Hi ${name},\n\nYour account was inactive for ${DEACTIVATION_MONTHS} months and has been deactivated.\n\nRequest reactivation: ${reactivationUrl}\n\n— LocalWorks`;
  const html = wrapHtml(
    subject,
    `<p>Hi ${name},</p>
<p>Your LocalWorks account reached our <strong>${DEACTIVATION_MONTHS}-month</strong> inactivity threshold and has been <strong>deactivated</strong>. Your job history and records are preserved.</p>
<p>To request that an administrator restore your account, use the secure link below:</p>
${btn(reactivationUrl, "Request account reactivation")}
<p>If you did not expect this email, you can ignore it.</p>`,
  );
  await sendEmail(to, subject, text, html);
};

export const sendReactivationSubmittedEmail = async (to: string, name: string) => {
  const subject = "Reactivation Request Received";
  const text = `Hi ${name},\n\nWe received your account reactivation request. An administrator will review it shortly.\n\n— LocalWorks`;
  const html = wrapHtml(
    subject,
    `<p>Hi ${name},</p><p>Your reactivation request was submitted successfully and is <strong>pending review</strong>. We will email you when a decision is made.</p>`,
  );
  await sendEmail(to, subject, text, html);
};

export const sendReactivationApprovedEmail = async (to: string, name: string) => {
  const signIn = `${appOrigin()}/login`;
  const subject = "Your LocalWorks Account Has Been Reactivated";
  const text = `Hi ${name},\n\nYour account has been reactivated. You may sign in: ${signIn}\n\n— LocalWorks`;
  const html = wrapHtml(
    subject,
    `<p>Hi ${name},</p><p>Good news — your account has been <strong>reactivated</strong>.</p>${btn(signIn, "Sign in")}`,
  );
  await sendEmail(to, subject, text, html);
};

export const sendReactivationRejectedEmail = async (
  to: string,
  name: string,
  reason?: string,
  reactivationUrl?: string,
) => {
  const subject = "Reactivation Request Update";
  const reasonText = reason?.trim() ? `\n\nReason: ${reason}` : "";
  const linkText = reactivationUrl ? `\n\nYou may submit a new request: ${reactivationUrl}` : "";
  const text = `Hi ${name},\n\nYour reactivation request was not approved at this time.${reasonText}${linkText}\n\n— LocalWorks`;
  const html = wrapHtml(
    subject,
    `<p>Hi ${name},</p><p>Your reactivation request was <strong>not approved</strong> at this time.</p>${reason ? `<p><strong>Note:</strong> ${reason}</p>` : ""}${reactivationUrl ? btn(reactivationUrl, "Submit a new reactivation request") : ""}`,
  );
  await sendEmail(to, subject, text, html);
};

export const notifyAdminReactivationRequest = async (adminEmail: string, userLabel: string) => {
  const dash = `${appOrigin()}/admin-dashboard`;
  const subject = "Pending account reactivation request";
  const text = `A user requested account reactivation: ${userLabel}. Review in the admin dashboard.`;
  await sendEmail(adminEmail, subject, text);
};

export const notifyAdminDeactivation = async (adminEmail: string, userLabel: string) => {
  const subject = "Account deactivated due to inactivity";
  const text = `Account deactivated (inactivity): ${userLabel}`;
  await sendEmail(adminEmail, subject, text);
};
