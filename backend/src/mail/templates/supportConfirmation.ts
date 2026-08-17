import { wrapInBaseLayout } from '../emailLayout';
import { escapeHtml } from '../utils';

interface SupportConfirmationOptions {
  name: string;
  subject?: string;
  message: string;
}

export function buildSupportConfirmationEmail({
  name,
  subject = 'Support Request',
  message,
}: SupportConfirmationOptions) {
  const safeName = escapeHtml(name || 'there');
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message);
  const mailSubject = 'We received your CodeOrbit support request';

  const html = wrapInBaseLayout({
    preheader: `Thanks for reaching out! We've received your request: "${safeSubject}".`,
    category: 'CodeOrbit Support',
    title: mailSubject,
    content: `
      <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #111827;">We've received your message</h2>
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151;">Hi ${safeName},</p>
      <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151; line-height: 1.6;">
        Thanks for contacting CodeOrbit Support. We've received your request and our team will review it shortly.
      </p>

      <!-- Request Summary Card -->
      <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 10px; padding: 20px; margin: 20px 0;">
        <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #6B7280; letter-spacing: 0.5px;">Your Request</h4>
        <p style="margin: 0 0 12px 0; font-size: 14.5px; font-weight: 600; color: #111827;">${safeSubject}</p>
        <div style="font-size: 13.5px; line-height: 1.6; color: #4B5563; white-space: pre-wrap;">${safeMessage}</div>
      </div>

      <p style="margin: 0; font-size: 13.5px; color: #6B7280; line-height: 1.5;">
        You can reply directly to this email if you need to provide additional details.
      </p>
    `,
  });

  const text = `We've received your support request\n\nHi ${safeName},\n\nThanks for contacting CodeOrbit Support. We've received your request:\n\nSubject: ${subject}\nMessage:\n${message}\n\nYou can reply directly to this email to add more information.\n\nCodeOrbit Support · support@codeorbit.app`;

  return { subject: mailSubject, html, text };
}

export function buildAdminSupportNotificationEmail({
  name,
  email,
  subject = 'General Inquiry',
  message,
}: {
  name: string;
  email: string;
  subject?: string;
  message: string;
}) {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message);
  const mailSubject = `[CodeOrbit Support] ${safeSubject}`;

  const html = wrapInBaseLayout({
    category: 'Admin Notification',
    title: mailSubject,
    content: `
      <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #111827;">New Support Message</h2>
      <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
        <p style="margin: 0 0 6px 0; font-size: 13.5px; color: #4B5563;"><strong>From:</strong> ${safeName} &lt;${safeEmail}&gt;</p>
        <p style="margin: 0; font-size: 13.5px; color: #4B5563;"><strong>Subject:</strong> ${safeSubject}</p>
      </div>

      <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #6B7280;">Message:</h4>
      <div style="background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; color: #1F2937;">${safeMessage}</div>
    `,
  });

  const text = `New Support Message\n\nFrom: ${name} <${email}>\nSubject: ${subject}\n\nMessage:\n${message}`;

  return { subject: mailSubject, html, text };
}
