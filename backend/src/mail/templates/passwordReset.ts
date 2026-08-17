import { wrapInBaseLayout } from '../emailLayout';
import { escapeHtml } from '../utils';

interface PasswordResetTemplateOptions {
  name?: string;
  otp: string;
  expiresInMinutes?: number;
}

export function buildPasswordResetEmail({
  name,
  otp,
  expiresInMinutes = 10,
}: PasswordResetTemplateOptions) {
  const safeName = escapeHtml(name || 'there');
  const safeOtp = escapeHtml(otp);
  const subject = 'Your CodeOrbit verification code';

  const html = wrapInBaseLayout({
    preheader: `Your verification code is ${safeOtp}. It expires in ${expiresInMinutes} minutes.`,
    category: 'CodeOrbit Security',
    title: subject,
    content: `
      <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #111827;">Reset your password</h2>
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151;">Hi ${safeName},</p>
      <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151;">
        We received a request to reset your CodeOrbit password. Use the verification code below to proceed:
      </p>

      <!-- OTP Code Box -->
      <div style="background-color: #F9FAFB; border: 1.5px solid #E5E7EB; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
        <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #EF4444; display: inline-block;">${safeOtp}</span>
        <p style="margin: 10px 0 0 0; font-size: 12.5px; font-weight: 500; color: #6B7280;">
          Expires in <strong>${expiresInMinutes} minutes</strong>
        </p>
      </div>

      <p style="margin: 0 0 8px 0; font-size: 13.5px; color: #6B7280; line-height: 1.5;">
        If you didn't request a password reset, you can safely ignore this email. Your account remains secure.
      </p>
    `,
  });

  const text = `CodeOrbit Security: Reset your password\n\nHi ${safeName},\n\nWe received a request to reset your CodeOrbit password.\n\nYour verification code is: ${otp}\n\nThis code expires in ${expiresInMinutes} minutes.\n\nIf you didn't request this, you can safely ignore this email.\n\nCodeOrbit Security · security@codeorbit.app`;

  return { subject, html, text };
}
