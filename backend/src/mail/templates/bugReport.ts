import { wrapInBaseLayout } from '../emailLayout';
import { escapeHtml } from '../utils';

interface BugReportOptions {
  userName?: string;
  userEmail?: string;
  userId?: string;
  platform?: string;
  bugTitle: string;
  bugSteps: string;
}

export function buildAdminBugReportEmail({
  userName,
  userEmail,
  userId,
  platform,
  bugTitle,
  bugSteps,
}: BugReportOptions) {
  const safeName = escapeHtml(userName || 'Anonymous');
  const safeEmail = escapeHtml(userEmail || 'No email provided');
  const safeUserId = escapeHtml(userId || 'N/A');
  const safePlatform = escapeHtml(platform || 'Mobile App');
  const safeTitle = escapeHtml(bugTitle);
  const safeSteps = escapeHtml(bugSteps);
  const mailSubject = `🐞 [CodeOrbit Bug Report] ${safeTitle}`;

  const html = wrapInBaseLayout({
    category: 'Diagnostic Bug Report',
    title: mailSubject,
    content: `
      <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #DC2626;">In-App Bug Report</h2>
      
      <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
        <p style="margin: 0 0 6px 0; font-size: 13px; color: #4B5563;"><strong>Reporter:</strong> ${safeName} (${safeEmail})</p>
        <p style="margin: 0 0 6px 0; font-size: 13px; color: #4B5563;"><strong>User ID:</strong> ${safeUserId}</p>
        <p style="margin: 0; font-size: 13px; color: #4B5563;"><strong>Platform:</strong> ${safePlatform}</p>
      </div>

      <h4 style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #6B7280;">Issue Title:</h4>
      <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #111827;">${safeTitle}</p>

      <h4 style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #6B7280;">Steps to Reproduce & Details:</h4>
      <div style="background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; color: #1F2937;">${safeSteps}</div>
    `,
  });

  const text = `In-App Bug Report\n\nReporter: ${userName} (${userEmail})\nPlatform: ${platform}\nUser ID: ${userId}\n\nTitle: ${bugTitle}\n\nSteps & Details:\n${bugSteps}`;

  return { subject: mailSubject, html, text };
}
