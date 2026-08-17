import { wrapInBaseLayout } from '../emailLayout';
import { escapeHtml, formatDate } from '../utils';

interface PasswordChangedTemplateOptions {
  name?: string;
  date?: Date;
}

export function buildPasswordChangedEmail({
  name,
  date = new Date(),
}: PasswordChangedTemplateOptions) {
  const safeName = escapeHtml(name || 'there');
  const formattedDate = formatDate(date);
  const subject = 'Your CodeOrbit password was changed';

  const html = wrapInBaseLayout({
    preheader: `Your CodeOrbit password was changed on ${formattedDate}.`,
    category: 'CodeOrbit Security',
    title: subject,
    content: `
      <!-- Subtle Green Success Indicator -->
      <div style="display: inline-flex; align-items: center; background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 6px 12px; margin-bottom: 18px;">
        <span style="color: #059669; font-size: 13px; font-weight: 600;">✓ Password updated successfully</span>
      </div>

      <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #111827;">Password Changed</h2>
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151;">Hi ${safeName},</p>
      <p style="margin: 0 0 18px 0; font-size: 15px; color: #374151;">
        Your CodeOrbit password was changed on <strong>${formattedDate}</strong>.
      </p>
      
      <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 10px; padding: 18px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; font-size: 13.5px; color: #374151;">
          <strong>If you made this change:</strong> No further action is required.
        </p>
        <p style="margin: 0; font-size: 13.5px; color: #DC2626;">
          <strong>If you did not make this change:</strong> Please <a href="mailto:security@codeorbit.app" style="color: #DC2626; font-weight: 600; text-decoration: underline;">contact CodeOrbit Security</a> immediately to protect your account.
        </p>
      </div>
    `,
  });

  const text = `CodeOrbit Security Alert\n\nHi ${safeName},\n\nYour CodeOrbit password was changed on ${formattedDate}.\n\nIf you made this change, no further action is required.\n\nIf you did not make this change, please contact CodeOrbit Security immediately at security@codeorbit.app.\n\nCodeOrbit Security`;

  return { subject, html, text };
}
