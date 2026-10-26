import { sendEmail } from "./emailOtp";
import { DEACTIVATION_MONTHS } from "./inactivityPolicy";
import Worker from "../model/Worker";
import Employer from "../model/Employer";
import Admin from "../model/Admin";

export type LifecycleAccount = {
  email: string;
  inactivityEmailOverride?: string | null;
  name?: string | null;
  company?: string | null;
  owner?: string | null;
};

/** Tombstone label after purge — not a person's name. */
export const isPurgedDisplayName = (value?: string | null): boolean => {
  const s = value?.trim();
  return !!s && /^Removed (user|employer)/i.test(s);
};

/** Registered display name on the account (same field family as login JWT `name`). */
export const accountDisplayName = (
  account: LifecycleAccount,
  role: "worker" | "employer",
): string => {
  if (role === "employer") {
    const owner = account.owner?.trim();
    if (owner && owner.toLowerCase() !== "n/a" && !isPurgedDisplayName(owner)) return owner;
    const company = account.company?.trim();
    if (company && !isPurgedDisplayName(company)) return company;
  }
  const name = account.name?.trim();
  if (name && !isPurgedDisplayName(name)) return name;
  const company = account.company?.trim();
  if (company && !isPurgedDisplayName(company)) return company;
  return "there";
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Name on whichever Worker / Employer / Admin record uses this login email. */
export const lookupRegisteredDisplayNameByEmail = async (rawEmail: string): Promise<string | null> => {
  const email = rawEmail.trim();
  if (!email) return null;
  const rx = new RegExp(`^${escapeRegExp(email)}$`, "i");
  const [worker, employer, admin] = await Promise.all([
    Worker.findOne({ email: rx }).select("name").lean(),
    Employer.findOne({ email: rx }).select("company owner").lean(),
    Admin.findOne({ email: rx }).select("name").lean(),
  ]);
  if (worker?.name?.trim() && !isPurgedDisplayName(worker.name)) return worker.name.trim();
  if (employer) {
    const label = accountDisplayName(employer, "employer");
    if (label !== "there") return label;
  }
  if (admin?.name?.trim()) return admin.name.trim();
  return null;
};

/** Pure greeting rule (testable): account holder when mail goes to their login email; else inbox owner. */
export const resolveLifecycleGreetingName = (
  account: LifecycleAccount,
  role: "worker" | "employer",
  toEmail: string,
  lookupNameAtTo: string | null,
): string => {
  const to = toEmail.trim();
  const accountEmail = account.email.trim();
  if (to && accountEmail && to.toLowerCase() === accountEmail.toLowerCase()) {
    return accountDisplayName(account, role);
  }
  if (lookupNameAtTo?.trim()) return lookupNameAtTo.trim();
  return accountDisplayName(account, role);
};

export const lifecycleMailRecipientName = async (
  account: LifecycleAccount,
  role: "worker" | "employer",
  toEmail: string,
): Promise<string> => {
  const lookup = await lookupRegisteredDisplayNameByEmail(toEmail);
  return resolveLifecycleGreetingName(account, role, toEmail, lookup);
};

export const accountLifecycleEmail = (accountEmail: string, override?: string | null) =>
  override?.trim() || accountEmail;

/** First name for "Hi …," — avoids demo labels like "Tour Three Months" reading awkwardly in mail. */
export const emailGreetingName = (fullName: string) => {
  const trimmed = fullName.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] ?? "there";
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const appOrigin = () => {
  const fromEnv = process.env.APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const cors = process.env.CORS_ORIGINS?.split(",")[0]?.trim();
  return cors || "http://localhost:8080";
};

/** Matches frontend design tokens (index.css --primary / --background / --foreground). */
const EMAIL_PRIMARY = "#ec6a13";
const EMAIL_PAGE_BG = "#fcf9f5";
const EMAIL_CARD_BG = "#ffffff";
const EMAIL_TEXT = "#3a342f";
const EMAIL_MUTED = "#827a72";
const EMAIL_FOOTER_BG = "#f0ebe3";

const wrapHtml = (title: string, body: string) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title></head>
<body style="margin:0;font-family:Segoe UI,Roboto,Arial,sans-serif;background:${EMAIL_PAGE_BG};padding:24px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:${EMAIL_CARD_BG};border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06)">
<tr><td style="background:${EMAIL_PRIMARY};padding:20px 24px;color:#fff;font-size:20px;font-weight:700">LocalWorks</td></tr>
<tr><td style="padding:24px;color:${EMAIL_TEXT};font-size:15px;line-height:1.55">${body}</td></tr>
<tr><td style="padding:16px 24px;background:${EMAIL_FOOTER_BG};color:${EMAIL_MUTED};font-size:12px">Questions? Reply to this email or contact your barangay coordinator.</td></tr>
</table></body></html>`;

const btn = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${href}" style="display:inline-block;background:${EMAIL_PRIMARY};color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">${label}</a></p>`;

/** Shown on 3 / 4 / 5-month warnings only — data is removed at deletion (6 mo.), not on reminders. */
export const INACTIVITY_WARNING_DATA_PRESERVED =
  "Your CV/Resume and other profile details remain saved on LocalWorks. These reminder emails do not remove your data.";

export const sendInactivityWarningEmail = async (
  to: string,
  name: string,
  month: 3 | 4 | 5,
) => {
  const signIn = `${appOrigin()}/login`;
  const subjects = {
    3: "Account Inactivity Warning — Please Check Your Account",
    4: "Reminder: Your LocalWorks Account Is Still Inactive",
    5: "Final Reminder: Account Deletion Next Month",
  } as const;
  const intros = {
    3: `We noticed you have not used LocalWorks for about <strong>three months</strong>.`,
    4: `Your account has been inactive for about <strong>four months</strong>.`,
    5: `This is a <strong>final reminder</strong>: your account has been inactive for about <strong>five months</strong>. If you do not sign in during the <strong>next month</strong>, your account and its data will be <strong>permanently deleted</strong>. You would need to sign up again to use LocalWorks.`,
  } as const;
  const subject = subjects[month];
  const dataPreserved = INACTIVITY_WARNING_DATA_PRESERVED;
  const deletionPolicy =
    month === 5
      ? `After <strong>${DEACTIVATION_MONTHS} months</strong> without meaningful activity, accounts and their data (including CV/Resume and profile information) are permanently deleted — not just disabled.`
      : `Our policy: after <strong>${DEACTIVATION_MONTHS} months</strong> without meaningful activity, inactive accounts and their data are permanently deleted.`;
  const greeting = emailGreetingName(name);
  const text = `Hi ${greeting},\n\n${intros[month].replace(/<[^>]+>/g, "")}\n\n${dataPreserved}\n\nSign in to stay active: ${signIn}\n\n${deletionPolicy.replace(/<[^>]+>/g, "")}\n\n— LocalWorks`;
  const html = wrapHtml(
    subject,
    `<p>Hi ${escapeHtml(greeting)},</p><p>${intros[month]}</p>
<p><strong>${escapeHtml(dataPreserved)}</strong></p>
<p>LocalWorks connects skilled workers with employers in your community. Signing in and using the platform keeps your profile visible and your account in good standing.</p>
<p>${deletionPolicy}</p>
${btn(signIn, "Sign in to LocalWorks")}`,
  );
  await sendEmail(to, subject, text, html);
};

export const sendInactivityDeletionEmail = async (to: string, name: string) => {
  const signUp = `${appOrigin()}/login`;
  const greeting = emailGreetingName(name);
  const subject = "Your LocalWorks Account Has Been Deleted";
  const text = `Hi ${greeting},\n\nYour account was inactive for ${DEACTIVATION_MONTHS} months and has been permanently deleted along with its data.\n\nTo use LocalWorks again, create a new account: ${signUp}\n\n— LocalWorks`;
  const html = wrapHtml(
    subject,
    `<p>Hi ${escapeHtml(greeting)},</p>
<p>Your LocalWorks account reached our <strong>${DEACTIVATION_MONTHS}-month</strong> inactivity threshold and has been <strong>permanently deleted</strong>, including profile and activity data tied to this account.</p>
<p>To return to the platform, please <strong>register a new account</strong> with the same or a different email.</p>
${btn(signUp, "Sign up / log in")}
<p>If you did not expect this email, you can ignore it.</p>`,
  );
  await sendEmail(to, subject, text, html);
};

/** @deprecated inactivity now deletes accounts; kept for admin-deactivated accounts only */
export const sendDeactivationEmail = async (
  to: string,
  name: string,
  reactivationUrl: string,
) => {
  const greeting = emailGreetingName(name);
  const subject = "Your LocalWorks Account Has Been Deactivated";
  const text = `Hi ${greeting},\n\nYour account was inactive for ${DEACTIVATION_MONTHS} months and has been deactivated.\n\nRequest reactivation: ${reactivationUrl}\n\n— LocalWorks`;
  const html = wrapHtml(
    subject,
    `<p>Hi ${escapeHtml(greeting)},</p>
<p>Your LocalWorks account reached our <strong>${DEACTIVATION_MONTHS}-month</strong> inactivity threshold and has been <strong>deactivated</strong>. Your job history and records are preserved.</p>
<p>To request that an administrator restore your account, use the secure link below:</p>
${btn(reactivationUrl, "Request account reactivation")}
<p>If you did not expect this email, you can ignore it.</p>`,
  );
  await sendEmail(to, subject, text, html);
};

export const sendReactivationSubmittedEmail = async (to: string, name: string) => {
  const greeting = emailGreetingName(name);
  const subject = "Reactivation Request Received";
  const text = `Hi ${greeting},\n\nWe received your account reactivation request. An administrator will review it shortly.\n\n— LocalWorks`;
  const html = wrapHtml(
    subject,
    `<p>Hi ${escapeHtml(greeting)},</p><p>Your reactivation request was submitted successfully and is <strong>pending review</strong>. We will email you when a decision is made.</p>`,
  );
  await sendEmail(to, subject, text, html);
};

export const sendReactivationApprovedEmail = async (to: string, name: string) => {
  const greeting = emailGreetingName(name);
  const signIn = `${appOrigin()}/login`;
  const subject = "Your LocalWorks Account Has Been Reactivated";
  const text = `Hi ${greeting},\n\nYour account has been reactivated. You may sign in: ${signIn}\n\n— LocalWorks`;
  const html = wrapHtml(
    subject,
    `<p>Hi ${escapeHtml(greeting)},</p><p>Good news — your account has been <strong>reactivated</strong>.</p>${btn(signIn, "Sign in")}`,
  );
  await sendEmail(to, subject, text, html);
};

export const sendReactivationRejectedEmail = async (
  to: string,
  name: string,
  reason?: string,
  reactivationUrl?: string,
) => {
  const greeting = emailGreetingName(name);
  const subject = "Reactivation Request Update";
  const reasonText = reason?.trim() ? `\n\nReason: ${reason}` : "";
  const linkText = reactivationUrl ? `\n\nYou may submit a new request: ${reactivationUrl}` : "";
  const text = `Hi ${greeting},\n\nYour reactivation request was not approved at this time.${reasonText}${linkText}\n\n— LocalWorks`;
  const html = wrapHtml(
    subject,
    `<p>Hi ${escapeHtml(greeting)},</p><p>Your reactivation request was <strong>not approved</strong> at this time.</p>${reason ? `<p><strong>Note:</strong> ${escapeHtml(reason)}</p>` : ""}${reactivationUrl ? btn(reactivationUrl, "Submit a new reactivation request") : ""}`,
  );
  await sendEmail(to, subject, text, html);
};

export const notifyAdminReactivationRequest = async (adminEmail: string, userLabel: string) => {
  const dash = `${appOrigin()}/admin-dashboard`;
  const subject = "Pending account reactivation request";
  const text = `A user requested account reactivation: ${userLabel}. Review in the admin dashboard.`;
  await sendEmail(adminEmail, subject, text);
};

export const notifyAdminInactivityDeletion = async (adminEmail: string, userLabel: string) => {
  const subject = "Account deleted due to inactivity";
  const text = `Account deleted (inactivity): ${userLabel}`;
  await sendEmail(adminEmail, subject, text);
};

export const notifyAdminDeactivation = async (adminEmail: string, userLabel: string) => {
  const subject = "Account deactivated due to inactivity";
  const text = `Account deactivated (inactivity): ${userLabel}`;
  await sendEmail(adminEmail, subject, text);
};
