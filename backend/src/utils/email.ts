import { resend } from "@specific-dev/framework";
import type { Logger } from "pino";

let logger: Logger | null = null;

export function setEmailLogger(log: Logger) {
  logger = log;
}

const FROM_EMAIL = process.env.FROM_EMAIL ?? "APS App <noreply@aps.app>";

function log(level: "info" | "warn" | "error", data: any, message: string) {
  if (logger) {
    logger[level](data, message);
  }
}

function buildEmailHTML(header: string, body: string, footer?: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:16px;overflow:hidden;max-width:600px;width:100%">
        <tr><td style="background:linear-gradient(135deg,#FF6B35,#FF8C42);padding:32px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:32px;font-weight:700;letter-spacing:-1px">APS</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:13px;font-weight:500">Your Fitness Companion</p>
        </td></tr>
        <tr><td style="padding:40px 32px">
          ${header}
          ${body}
          ${footer ? `<div style="margin-top:32px">${footer}</div>` : ''}
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #2a2a2a;text-align:center">
          <p style="margin:0;color:#555;font-size:12px">© 2025 APS App. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  if (!resend) {
    log("warn", { email: to }, "Email service not configured, skipping welcome email");
    return;
  }

  const userName = name || to.split("@")[0] || "there";

  const header = `<h2 style="margin:0 0 16px;color:#fff;font-size:24px;font-weight:700">Welcome to APS, ${userName}! 💪</h2>`;

  const body = `
    <p style="margin:0 0 24px;color:#e0e0e0;font-size:15px;line-height:1.7">
      APS is your AI-powered fitness companion — personalized workouts, smart nutrition, and habit tracking all in one place. Your journey to a stronger you starts now.
    </p>
    <table cellpadding="0" cellspacing="0"><tr><td>
      <a href="aps://" style="display:inline-block;background:linear-gradient(135deg,#FF6B35,#FF8C42);color:#fff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:15px;font-weight:600">Open APS</a>
    </td></tr></table>
  `;

  const footer = `<p style="margin:0;color:#999;font-size:13px">Questions? Reply to this email anytime.</p>`;

  const html = buildEmailHTML(header, body, footer);

  resend.emails
    .send({
      from: FROM_EMAIL,
      to,
      subject: "Welcome to APS — Let's Get Moving 💪",
      html,
    })
    .catch((error) => {
      log("error", { err: error, email: to }, "Failed to send welcome email");
    });

  log("info", { email: to }, "Welcome email queued for sending");
}

export async function sendLoginNotificationEmail(
  to: string,
  name: string,
  timestamp: Date,
  userAgent: string,
  ipAddress: string
): Promise<void> {
  if (!resend) {
    log("warn", { email: to }, "Email service not configured, skipping login notification email");
    return;
  }

  const userName = name || to.split("@")[0] || "there";

  const formattedTime = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(timestamp);

  const truncatedUA = userAgent.length > 80 ? userAgent.substring(0, 77) + "..." : userAgent;

  const header = `<h2 style="margin:0 0 16px;color:#fff;font-size:24px;font-weight:700">🔐 New Sign-In Detected</h2>`;

  const body = `
    <p style="margin:0 0 20px;color:#e0e0e0;font-size:15px;line-height:1.6">
      Hi ${userName}, we noticed a new sign-in to your APS account.
    </p>
    <table cellpadding="0" cellspacing="0" width="100%" style="background:#111;border:1px solid #333;border-radius:8px;margin:0 0 20px;padding:0">
      <tr><td style="padding:16px 20px;border-bottom:1px solid #333;color:#999;font-size:12px;font-weight:600;text-transform:uppercase">Time</td><td style="padding:16px 20px;border-bottom:1px solid #333;color:#e0e0e0;font-size:14px;font-family:monospace">${formattedTime}</td></tr>
      <tr><td style="padding:16px 20px;border-bottom:1px solid #333;color:#999;font-size:12px;font-weight:600;text-transform:uppercase">Device</td><td style="padding:16px 20px;border-bottom:1px solid #333;color:#e0e0e0;font-size:14px;font-family:monospace">${truncatedUA}</td></tr>
      <tr><td style="padding:16px 20px;color:#999;font-size:12px;font-weight:600;text-transform:uppercase">IP Address</td><td style="padding:16px 20px;color:#e0e0e0;font-size:14px;font-family:monospace">${ipAddress}</td></tr>
    </table>
    <p style="margin:0 0 20px;color:#ff6b6b;font-size:14px;line-height:1.6">
      If this wasn't you, please contact our support team immediately and change your password.
    </p>
    <table cellpadding="0" cellspacing="0"><tr><td>
      <a href="aps://" style="display:inline-block;background:linear-gradient(135deg,#FF6B35,#FF8C42);color:#fff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:15px;font-weight:600">Secure My Account</a>
    </td></tr></table>
  `;

  const footer = `<p style="margin:0;color:#666;font-size:12px">This is an automated security notification.</p>`;

  const html = buildEmailHTML(header, body, footer);

  resend.emails
    .send({
      from: FROM_EMAIL,
      to,
      subject: "New Sign-In to Your APS Account",
      html,
    })
    .catch((error) => {
      log("error", { err: error, email: to }, "Failed to send login notification email");
    });

  log("info", { email: to }, "Login notification email queued for sending");
}

export async function sendPasswordResetEmail(to: string, name: string, resetToken: string): Promise<void> {
  if (!resend) {
    log("warn", { email: to }, "Email service not configured, skipping password reset email");
    return;
  }

  const userName = name || to.split("@")[0] || "there";
  const resetLink = `aps://reset-password?token=${encodeURIComponent(resetToken)}`;

  const header = `<h2 style="margin:0 0 16px;color:#fff;font-size:24px;font-weight:700">🔑 Reset Your Password</h2>`;

  const body = `
    <p style="margin:0 0 24px;color:#e0e0e0;font-size:15px;line-height:1.6">
      Hi ${userName}, we received a request to reset your APS account password.
    </p>
    <table cellpadding="0" cellspacing="0"><tr><td>
      <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#FF6B35,#FF8C42);color:#fff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:15px;font-weight:600">Reset My Password</a>
    </td></tr></table>
    <p style="margin:24px 0 0;color:#999;font-size:13px">
      This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
    </p>
  `;

  const footer = `<p style="margin:0;color:#999;font-size:12px">For security, never share this link with anyone.</p>`;

  const html = buildEmailHTML(header, body, footer);

  resend.emails
    .send({
      from: FROM_EMAIL,
      to,
      subject: "Reset Your APS Password",
      html,
    })
    .catch((error) => {
      log("error", { err: error, email: to }, "Failed to send password reset email");
    });

  log("info", { email: to }, "Password reset email queued for sending");
}
