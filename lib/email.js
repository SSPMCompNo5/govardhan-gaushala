import nodemailer from 'nodemailer';

export function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

export async function sendMail({ to, subject, html, text }) {
  const from = process.env.SMTP_FROM || 'no-reply@example.com';
  const t = createTransport();
  if (!t) return false;
  await t.sendMail({ from, to, subject, text: text || '', html: html || '' });
  return true;
}

export const sendEmail = sendMail;


