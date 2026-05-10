const nodemailer = require("nodemailer");
const { logger } = require("../utils/logger");

let transporter;

const isEmailEnabled = () => process.env.ENABLE_EMAIL_NOTIFICATIONS === "true";

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getTransporter = () => {
  if (!isEmailEnabled()) {
    return null;
  }

  if (transporter) {
    return transporter;
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    logger.warn("Email notifications enabled but SMTP credentials are missing");
    return null;
  }

  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || undefined,
    host: process.env.EMAIL_HOST || undefined,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: String(process.env.EMAIL_PORT) === "465",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
  if (!isEmailEnabled()) {
    return { skipped: true, reason: "disabled" };
  }

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    logger.warn("Skipped notification email because recipient address is invalid");
    return { skipped: true, reason: "invalid_recipient" };
  }

  const mailer = getTransporter();
  if (!mailer) {
    return { skipped: true, reason: "smtp_not_configured" };
  }

  try {
    await mailer.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html,
      text
    });

    return { success: true };
  } catch (error) {
    logger.error("Notification email failed", error);
    return { success: false, error: error.message };
  }
};

const buildNotificationTemplate = (user, notification) => {
  const displayName = escapeHtml(user.fullName || user.username || "there");
  const title = escapeHtml(notification.title || "StreamHub notification");
  const message = escapeHtml(notification.message || "");
  const link = notification.link
    ? `${(process.env.CLIENT_URL || "").replace(/\/$/, "")}${notification.link}`
    : "";

  const action = link
    ? `<p style="margin:24px 0 0"><a href="${escapeHtml(link)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:700">Open StreamHub</a></p>`
    : "";

  return {
    subject: title,
    text: `Hi ${user.fullName || user.username || "there"},\n\n${notification.message || ""}\n\nOpen StreamHub: ${link || process.env.CLIENT_URL || ""}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;background:#f8fafc;padding:24px">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:24px">
          <p style="margin:0 0 12px;color:#475569">Hi ${displayName},</p>
          <h1 style="font-size:20px;margin:0 0 12px;color:#0f172a">${title}</h1>
          <p style="margin:0;color:#334155">${message}</p>
          ${action}
          <p style="margin:24px 0 0;color:#64748b;font-size:12px">You can update notification preferences from your StreamHub account.</p>
        </div>
      </div>
    `
  };
};

const sendNotificationEmail = async (user, notification) => {
  if (!isEmailEnabled()) {
    return { skipped: true, reason: "disabled" };
  }

  const template = buildNotificationTemplate(user, notification);
  return sendEmail({
    to: user.email,
    subject: template.subject,
    html: template.html,
    text: template.text
  });
};

module.exports = {
  sendEmail,
  sendNotificationEmail,
  isEmailEnabled
};
