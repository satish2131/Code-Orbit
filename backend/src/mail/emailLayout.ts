import { escapeHtml } from './utils';

interface BaseEmailLayoutOptions {
  preheader?: string;
  category?: string;
  title: string;
  content: string;
  footerNote?: string;
}

export function wrapInBaseLayout({
  preheader = '',
  category = 'CodeOrbit Security',
  title,
  content,
  footerNote,
}: BaseEmailLayoutOptions): string {
  const currentYear = new Date().getFullYear();
  const safeTitle = escapeHtml(title);
  const safeCategory = escapeHtml(category);
  const safePreheader = escapeHtml(preheader);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${safeTitle}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F3F4F6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #F3F4F6;
      padding: 36px 16px;
    }
    .card {
      max-width: 540px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 14px;
      border: 1px solid #E5E7EB;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .header {
      padding: 28px 32px 20px 32px;
      border-bottom: 1px solid #F3F4F6;
      text-align: center;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #111827;
      margin: 0;
    }
    .brand-accent {
      color: #EF4444;
    }
    .category-pill {
      display: inline-block;
      margin-top: 6px;
      font-size: 11.5px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #6B7280;
    }
    .content-body {
      padding: 32px;
      font-size: 15px;
      line-height: 1.6;
      color: #374151;
    }
    .footer {
      padding: 24px 32px;
      background-color: #F9FAFB;
      border-top: 1px solid #F3F4F6;
      text-align: center;
      font-size: 12px;
      line-height: 1.6;
      color: #6B7280;
    }
    .footer-links a {
      color: #6B7280;
      text-decoration: none;
      margin: 0 6px;
      font-weight: 500;
    }
    .footer-links a:hover {
      color: #EF4444;
      text-decoration: underline;
    }
    .preheader {
      display: none !important;
      visibility: hidden;
      mso-hide: all;
      font-size: 1px;
      line-height: 1px;
      max-height: 0;
      max-width: 0;
      opacity: 0;
      overflow: hidden;
    }
  </style>
</head>
<body>
  ${safePreheader ? `<span class="preheader">${safePreheader}</span>` : ''}
  <table class="wrapper" role="presentation" border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <div class="card">
          <!-- Header -->
          <div class="header">
            <h1 class="brand-title">Code<span class="brand-accent">Orbit</span></h1>
            <div class="category-pill">${safeCategory}</div>
          </div>

          <!-- Main Body -->
          <div class="content-body">
            ${content}
          </div>

          <!-- Footer -->
          <div class="footer">
            <p style="margin: 0 0 6px 0; font-weight: 600; color: #111827;">CodeOrbit</p>
            <p style="margin: 0 0 12px 0; font-size: 12px; color: #6B7280;">Collaborative coding, anywhere.</p>
            
            <div class="footer-links" style="margin-bottom: 12px;">
              <a href="https://codeorbit.app/privacy">Privacy Policy</a> •
              <a href="https://codeorbit.app/terms">Terms & Conditions</a> •
              <a href="mailto:support@codeorbit.app">Contact Support</a>
            </div>

            <p style="margin: 0; font-size: 11.5px; color: #9CA3AF;">
              © ${currentYear} CodeOrbit Technologies Inc. All rights reserved.<br>
              security@codeorbit.app
            </p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
