import { env } from "../../../config/env.js";
import { EmailData, SocialLinks } from "./types.js";

const COLORS = {
  primary: "#3b82f6",
  primaryHover: "#2563eb",
  bg: "#f4f5f7",
  cardBg: "#ffffff",
  textMain: "#1a1a2e",
  textMuted: "#64748b",
  textLight: "#94a3b8",
  border: "#e2e8f0",
  success: "#10b981",
  danger: "#ef4444",
  warning: "#f59e0b",
};

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

const ICONS = {
  linkedin: "https://cdn-icons-png.flaticon.com/512/174/174857.png",
  twitter: "https://cdn-icons-png.flaticon.com/512/5969/5969020.png",
  facebook: "https://cdn-icons-png.flaticon.com/512/124/124010.png",
  instagram: "https://cdn-icons-png.flaticon.com/512/2111/2111463.png",
  youtube: "https://cdn-icons-png.flaticon.com/512/1384/1384060.png",
  gmail: "https://cdn-icons-png.flaticon.com/512/5968/5968534.png"
};

export function buildEmailHtml(data: EmailData): string {
  const currentYear = new Date().getFullYear();
  const appUrl = env.APP_URL || "https://myworkspace.com";
  
  const renderPreviewText = () => {
    if (!data.previewText) return "";
    return `
      <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all; font-size: 0px; line-height: 0px; color: transparent;">
        ${data.previewText}
      </div>
    `;
  };

  const renderHeader = () => {
    return `
      <tr>
        <td align="center" style="padding: 40px 0 20px;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td>
                <img src="cid:workspace_logo" alt="Workspace Logo" width="64" height="64" style="display: block; border-radius: 12px; margin: 0 auto; border: 1px solid ${COLORS.border};" />
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  };

  const renderProviderIcon = () => {
    if (data.providerIcon === "gmail") {
      return `
        <tr>
          <td align="center" style="padding: 0 40px 16px;">
             <div style="display:inline-block; padding:8px 16px; background:#f1f5f9; border-radius:20px; font-size:12px; font-family:${FONT}; color:${COLORS.textMuted}; font-weight:600;">
               <img src="${ICONS.gmail}" width="14" height="14" style="vertical-align:middle; margin-right:6px;" alt="Gmail" /> Registered with Gmail
             </div>
          </td>
        </tr>
      `;
    }
    return "";
  };

  const renderGreeting = () => {
    if (!data.greeting) return "";
    return `
      <tr>
        <td style="padding: 0 40px 20px;">
          <h1 style="margin: 0; font-family: ${FONT}; font-size: 24px; color: ${COLORS.textMain}; font-weight: 600;">
            ${data.greeting}
          </h1>
        </td>
      </tr>
    `;
  };

  const renderIntro = () => {
    if (!data.intro || data.intro.length === 0) return "";
    return data.intro.map(p => `
      <tr>
        <td style="padding: 0 40px 16px;">
          <p style="margin: 0; font-family: ${FONT}; font-size: 16px; line-height: 24px; color: ${COLORS.textMuted};">
            ${p}
          </p>
        </td>
      </tr>
    `).join("");
  };

  const renderAccountInfo = () => {
    if (!data.accountInfo || data.accountInfo.length === 0) return "";
    
    const rows = data.accountInfo.map(info => `
      <tr>
        <td width="40%" style="padding: 12px 16px; border-bottom: 1px solid ${COLORS.border}; font-family: ${FONT}; font-size: 14px; font-weight: 600; color: ${COLORS.textMain};">
          ${info.label}
        </td>
        <td width="60%" style="padding: 12px 16px; border-bottom: 1px solid ${COLORS.border}; font-family: ${FONT}; font-size: 14px; color: ${COLORS.textMuted}; word-break: break-all;">
          ${info.value}
        </td>
      </tr>
    `).join("");

    return `
      <tr>
        <td style="padding: 0 40px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid ${COLORS.border}; border-radius: 8px; overflow: hidden; background-color: #fafafa;">
            ${rows}
          </table>
        </td>
      </tr>
    `;
  };

  const renderQuickStart = () => {
    if (!data.quickStart || data.quickStart.length === 0) return "";
    
    const items = data.quickStart.map(item => `
      <tr>
        <td width="24" valign="top" style="padding-bottom: 12px;">
          <span style="color: ${COLORS.success}; font-size: 18px;">✓</span>
        </td>
        <td valign="top" style="padding-bottom: 12px; font-family: ${FONT}; font-size: 15px; color: ${COLORS.textMuted}; line-height: 22px;">
          ${item}
        </td>
      </tr>
    `).join("");

    return `
      <tr>
        <td style="padding: 0 40px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid ${COLORS.border}; border-radius: 8px;">
            <tr>
              <td style="padding: 24px;">
                <h3 style="margin: 0 0 16px; font-family: ${FONT}; font-size: 16px; font-weight: 600; color: ${COLORS.textMain};">Quick Start</h3>
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  ${items}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  };

  const renderFeatures = () => {
    if (!data.features || data.features.length === 0) return "";

    const items = data.features.map(feat => `
      <tr>
        <td style="padding-bottom: 16px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              ${feat.icon ? `<td width="32" valign="top" style="padding-right: 12px; font-size: 24px;">
                ${feat.icon}
              </td>` : ''}
              <td valign="top">
                <h4 style="margin: 0 0 4px; font-family: ${FONT}; font-size: 15px; font-weight: 600; color: ${COLORS.textMain};">${feat.title}</h4>
                ${feat.description ? `<p style="margin: 0; font-family: ${FONT}; font-size: 14px; color: ${COLORS.textMuted}; line-height: 20px;">${feat.description}</p>` : ''}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `).join("");

    return `
      <tr>
        <td style="padding: 0 40px 24px;">
          <h3 style="margin: 0 0 16px; font-family: ${FONT}; font-size: 16px; font-weight: 600; color: ${COLORS.textMain};">Features you'll love</h3>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${items}
          </table>
        </td>
      </tr>
    `;
  };

  const renderButton = () => {
    if (!data.button) return "";
    return `
      <tr>
        <td align="center" style="padding: 16px 40px 32px;">
          <a href="${data.button.url}" style="display: inline-block; padding: 14px 32px; background-color: ${COLORS.primary}; color: #ffffff; text-decoration: none; font-family: ${FONT}; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);">
            ${data.button.text}
          </a>
        </td>
      </tr>
    `;
  };

  const renderSecurityNotice = () => {
    if (!data.securityNotice) return "";
    return `
      <tr>
        <td style="padding: 0 40px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fef2f2; border-left: 4px solid ${COLORS.danger}; border-radius: 0 8px 8px 0;">
            <tr>
              <td style="padding: 16px;">
                <h4 style="margin: 0 0 8px; font-family: ${FONT}; font-size: 14px; font-weight: 600; color: #b91c1c;">Security Notice</h4>
                <p style="margin: 0; font-family: ${FONT}; font-size: 13px; color: #991b1b; line-height: 20px;">
                  Never share your password. Enable Two-Factor Authentication if available. Contact support immediately if you did not request this action.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  };

  const renderOutro = () => {
    if (!data.outro || data.outro.length === 0) return "";
    return data.outro.map(p => `
      <tr>
        <td style="padding: 0 40px 16px;">
          <p style="margin: 0; font-family: ${FONT}; font-size: 15px; line-height: 24px; color: ${COLORS.textMuted};">
            ${p}
          </p>
        </td>
      </tr>
    `).join("");
  };

  const renderSocials = () => {
    if (!data.socialLinks) return "";
    
    const links = [];
    if (data.socialLinks.linkedin) links.push(`<a href="${data.socialLinks.linkedin}" style="display:inline-block; margin:0 8px;"><img src="${ICONS.linkedin}" width="24" height="24" alt="LinkedIn" /></a>`);
    if (data.socialLinks.twitter) links.push(`<a href="${data.socialLinks.twitter}" style="display:inline-block; margin:0 8px;"><img src="${ICONS.twitter}" width="24" height="24" alt="Twitter" /></a>`);
    if (data.socialLinks.facebook) links.push(`<a href="${data.socialLinks.facebook}" style="display:inline-block; margin:0 8px;"><img src="${ICONS.facebook}" width="24" height="24" alt="Facebook" /></a>`);
    if (data.socialLinks.instagram) links.push(`<a href="${data.socialLinks.instagram}" style="display:inline-block; margin:0 8px;"><img src="${ICONS.instagram}" width="24" height="24" alt="Instagram" /></a>`);
    if (data.socialLinks.youtube) links.push(`<a href="${data.socialLinks.youtube}" style="display:inline-block; margin:0 8px;"><img src="${ICONS.youtube}" width="24" height="24" alt="YouTube" /></a>`);
    
    if (links.length === 0) return "";
    
    return `
      <tr>
        <td align="center" style="padding: 0 40px 24px;">
          ${links.join("")}
        </td>
      </tr>
    `;
  };

  const renderFooter = () => {
    return `
      <tr>
        <td style="padding: 32px 40px; background-color: #f8fafc; border-top: 1px solid ${COLORS.border};">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${renderSocials()}
            <tr>
              <td align="center" style="padding-bottom: 16px;">
                <img src="cid:workspace_logo" alt="Workspace Logo" width="32" height="32" style="display: block; opacity: 0.5; border-radius: 6px;" />
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom: 12px;">
                <p style="margin: 0; font-family: ${FONT}; font-size: 13px; color: ${COLORS.textLight};">
                  &copy; ${currentYear} Workspace Inc. All rights reserved.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center">
                <p style="margin: 0; font-family: ${FONT}; font-size: 12px; color: ${COLORS.textLight}; line-height: 18px;">
                  123 Innovation Drive, Tech City, TC 10001<br/>
                  <a href="${appUrl}/privacy" style="color: ${COLORS.primary}; text-decoration: none;">Privacy Policy</a> &bull; 
                  <a href="${appUrl}/terms" style="color: ${COLORS.primary}; text-decoration: none;">Terms &amp; Conditions</a>
                  ${data.supportEmail ? ` &bull; <a href="mailto:${data.supportEmail}" style="color: ${COLORS.primary}; text-decoration: none;">Contact Support</a>` : ''}
                  ${data.unsubscribeUrl ? ` &bull; <a href="${data.unsubscribeUrl}" style="color: ${COLORS.primary}; text-decoration: none;">Unsubscribe</a>` : ''}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="x-apple-disable-message-reformatting">
      <title>${data.subject}</title>
      <style>
        :root {
          color-scheme: light dark;
          supported-color-schemes: light dark;
        }
        body { margin: 0; padding: 0; background-color: ${COLORS.bg}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { border: 0; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
        a { color: ${COLORS.primary}; }
        a:hover { color: ${COLORS.primaryHover}; }
        @media only screen and (max-width: 600px) {
          .email-container { width: 100% !important; margin: 0 !important; border-radius: 0 !important; }
          .content-cell { padding-left: 24px !important; padding-right: 24px !important; }
        }
        @media (prefers-color-scheme: dark) {
          body, .body-bg { background-color: #0f172a !important; }
          .email-container { background-color: #1e293b !important; }
          h1, h2, h3, h4, p, td, span, div { color: #f8fafc !important; }
          .text-muted { color: #cbd5e1 !important; }
          .border-table, .border-bottom { border-color: #334155 !important; }
          .bg-light { background-color: #0f172a !important; }
          .bg-card { background-color: #1e293b !important; }
        }
      </style>
    </head>
    <body class="body-bg" style="margin: 0; padding: 0; background-color: ${COLORS.bg};">
      ${renderPreviewText()}
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${COLORS.bg}; padding: 40px 0;">
        <tr>
          <td align="center">
            <table class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: ${COLORS.cardBg}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
              ${renderHeader()}
              ${renderProviderIcon()}
              ${renderGreeting()}
              ${renderIntro()}
              ${renderAccountInfo()}
              ${renderQuickStart()}
              ${renderFeatures()}
              ${renderSecurityNotice()}
              ${renderButton()}
              ${renderOutro()}
              ${renderFooter()}
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
