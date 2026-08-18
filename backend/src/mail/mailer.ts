import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer';
import { buildPasswordResetEmail } from './templates/passwordReset';
import { buildPasswordChangedEmail } from './templates/passwordChanged';
import { buildWelcomeEmail } from './templates/welcome';
import {
  buildSupportConfirmationEmail,
  buildAdminSupportNotificationEmail,
} from './templates/supportConfirmation';
import { buildAdminBugReportEmail } from './templates/bugReport';

// Environment variables only - no hardcoded credentials in source code
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'security@codeorbit.app';

export const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  family: 4, // Force IPv4 to prevent ENETUNREACH IPv6 routing failures in container environments
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
} as nodemailer.TransportOptions);

// Transporter verification
if (SMTP_USER && SMTP_PASS) {
  transporter.verify((error) => {
    if (error) {
      console.warn('⚠️ Nodemailer SMTP connection warning:', error.message);
    } else {
      console.log(`✅ Nodemailer SMTP ready (${SMTP_USER})`);
    }
  });
} else {
  console.warn('⚠️ SMTP_USER or SMTP_PASS environment variable is missing.');
}

// 1. Password Reset OTP Email
export async function sendPasswordResetOtpEmail({
  email,
  name,
  otp,
  expiresInMinutes = 10,
}: {
  email: string;
  name?: string;
  otp: string;
  expiresInMinutes?: number;
}) {
  const { subject, html, text } = buildPasswordResetEmail({ name, otp, expiresInMinutes });

  return transporter.sendMail({
    from: `"CodeOrbit Security" <${SMTP_USER}>`,
    to: email,
    replyTo: 'security@codeorbit.app',
    subject,
    text,
    html,
  });
}

// 2. Password Changed Security Alert Email
export async function sendPasswordResetConfirmationEmail({
  email,
  name,
}: {
  email: string;
  name?: string;
}) {
  const { subject, html, text } = buildPasswordChangedEmail({ name, date: new Date() });

  return transporter.sendMail({
    from: `"CodeOrbit Security" <${SMTP_USER}>`,
    to: email,
    replyTo: 'security@codeorbit.app',
    subject,
    text,
    html,
  });
}

// 3. Welcome Email
export async function sendWelcomeEmail({
  email,
  name,
  username,
}: {
  email: string;
  name: string;
  username: string;
}) {
  const { subject, html, text } = buildWelcomeEmail({ name, username });

  return transporter.sendMail({
    from: `"CodeOrbit" <${SMTP_USER}>`,
    to: email,
    replyTo: 'support@codeorbit.app',
    subject,
    text,
    html,
  });
}

// 4. Contact Form Inquiries (Dual: User auto-reply + Admin notification)
export async function sendContactEmail({
  name,
  email,
  subject,
  message,
}: {
  name: string;
  email: string;
  subject?: string;
  message: string;
}) {
  // Admin notification
  const adminTemplate = buildAdminSupportNotificationEmail({ name, email, subject, message });
  const adminPromise = transporter.sendMail({
    from: `"CodeOrbit Support Form" <${SMTP_USER}>`,
    to: SUPPORT_EMAIL,
    replyTo: email,
    subject: adminTemplate.subject,
    text: adminTemplate.text,
    html: adminTemplate.html,
  });

  // User auto-confirmation
  const userTemplate = buildSupportConfirmationEmail({ name, subject, message });
  const userPromise = transporter.sendMail({
    from: `"CodeOrbit Support" <${SMTP_USER}>`,
    to: email,
    replyTo: 'support@codeorbit.app',
    subject: userTemplate.subject,
    text: userTemplate.text,
    html: userTemplate.html,
  });

  return Promise.all([adminPromise, userPromise]);
}

// 5. In-App Bug Reports
export async function sendBugReportEmail({
  userName,
  userEmail,
  userId,
  platform,
  bugTitle,
  bugSteps,
}: {
  userName?: string;
  userEmail?: string;
  userId?: string;
  platform?: string;
  bugTitle: string;
  bugSteps: string;
}) {
  const { subject, html, text } = buildAdminBugReportEmail({
    userName,
    userEmail,
    userId,
    platform,
    bugTitle,
    bugSteps,
  });

  return transporter.sendMail({
    from: `"CodeOrbit Bug Reporter" <${SMTP_USER}>`,
    to: SUPPORT_EMAIL,
    replyTo: userEmail || SUPPORT_EMAIL,
    subject,
    text,
    html,
  });
}
