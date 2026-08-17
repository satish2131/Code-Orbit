import { wrapInBaseLayout } from '../emailLayout';
import { escapeHtml } from '../utils';

interface WelcomeTemplateOptions {
  name?: string;
  username: string;
}

export function buildWelcomeEmail({
  name,
  username,
}: WelcomeTemplateOptions) {
  const safeName = escapeHtml(name || username);
  const subject = 'Welcome to CodeOrbit';

  const html = wrapInBaseLayout({
    preheader: `Welcome to CodeOrbit, ${safeName}! Your account is ready.`,
    category: 'Welcome to CodeOrbit',
    title: subject,
    content: `
      <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 800; color: #111827; letter-spacing: -0.5px;">Your account is ready</h2>
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151;">Hi ${safeName},</p>
      <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">
        Welcome to CodeOrbit! You can now create collaborative coding sessions, invite teammates, and run code directly from your mobile device.
      </p>

      <!-- 3 Compact Features -->
      <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <div style="margin-bottom: 14px;">
          <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #111827;">⚡ Collaborate</h4>
          <p style="margin: 0; font-size: 13px; color: #6B7280;">Create live coding rooms with sub-50ms peer synchronization.</p>
        </div>
        <div style="margin-bottom: 14px;">
          <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #111827;">💻 Code</h4>
          <p style="margin: 0; font-size: 13px; color: #6B7280;">Run Python, Web (HTML/JS), TypeScript, Java, and C++ sandboxes.</p>
        </div>
        <div>
          <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #111827;">💬 Connect</h4>
          <p style="margin: 0; font-size: 13px; color: #6B7280;">Chat with teammates in real time while editing code.</p>
        </div>
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin: 28px 0 12px 0;">
        <a href="https://codeorbit.app" style="display: inline-block; background-color: #EF4444; color: #FFFFFF; font-size: 14.5px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 10px; box-shadow: 0 2px 6px rgba(239, 68, 68, 0.25);">
          Open CodeOrbit →
        </a>
      </div>
    `,
  });

  const text = `Welcome to CodeOrbit!\n\nHi ${safeName},\n\nYour account is ready. You can now create collaborative coding sessions, invite teammates, and run code from your mobile device.\n\n• Collaborate: Create live coding rooms\n• Code: Work with multiple languages\n• Connect: Chat with collaborators in real time\n\nOpen CodeOrbit: https://codeorbit.app\n\nCodeOrbit · support@codeorbit.app`;

  return { subject, html, text };
}
