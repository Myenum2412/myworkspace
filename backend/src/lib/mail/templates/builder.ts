import { env } from "../../../config/env.js";
import { EmailData, SocialLinks, StatusType } from "./types.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logoBannerPath = path.resolve(__dirname, "../../../../../frontend/public/logobg.png");
const logoBannerBase64 = fs.existsSync(logoBannerPath)
  ? `data:image/png;base64,${fs.readFileSync(logoBannerPath).toString("base64")}`
  : `${env.APP_URL}/logobg.png`;

const logoSmallPath = path.resolve(__dirname, "../../../../../frontend/public/logo.jpeg");
const logoSmallBase64 = fs.existsSync(logoSmallPath)
  ? `data:image/jpeg;base64,${fs.readFileSync(logoSmallPath).toString("base64")}`
  : `${env.APP_URL}/logo.jpeg`;

const COLORS = {
  primary: "#2563eb",
  primaryHover: "#1d4ed8",
  bg: "#f1f5f9",
  cardBg: "#ffffff",
  textMain: "#0f172a",
  textMuted: "#475569",
  textLight: "#94a3b8",
  border: "#e2e8f0",
  success: "#059669",
  successBg: "#ecfdf5",
  danger: "#dc2626",
  dangerBg: "#fef2f2",
  warning: "#d97706",
  warningBg: "#fffbeb",
  info: "#2563eb",
  infoBg: "#eff6ff",
  neutral: "#64748b",
  neutralBg: "#f8fafc",
};

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

const ICONS: Record<string, string> = {
  linkedin: "https://cdn-icons-png.flaticon.com/512/174/174857.png",
  twitter: "https://cdn-icons-png.flaticon.com/512/5969/5969020.png",
  facebook: "https://cdn-icons-png.flaticon.com/512/124/124010.png",
  instagram: "https://cdn-icons-png.flaticon.com/512/2111/2111463.png",
  youtube: "https://cdn-icons-png.flaticon.com/512/1384/1384060.png",
  gmail: "https://cdn-icons-png.flaticon.com/512/5968/5968534.png",
};

function getStatusColors(type: StatusType) {
  switch (type) {
    case "success": return { bg: COLORS.successBg, text: COLORS.success, border: COLORS.success };
    case "warning": return { bg: COLORS.warningBg, text: COLORS.warning, border: COLORS.warning };
    case "error": return { bg: COLORS.dangerBg, text: COLORS.danger, border: COLORS.danger };
    case "info": return { bg: COLORS.infoBg, text: COLORS.info, border: COLORS.info };
    case "neutral": return { bg: COLORS.neutralBg, text: COLORS.neutral, border: COLORS.neutral };
  }
}

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
        <td align="center" style="padding: 0;">
          <img src="${logoBannerBase64}" alt="MyWorkspace" width="100%" style="display: block; width: 100%; max-width: 100%; height: auto;" />
        </td>
      </tr>
    `;
  };

  const renderProviderIcon = () => {
    if (data.providerIcon === "gmail") {
      return `
        <tr>
          <td align="center" style="padding: 0 40px 20px;">
             <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
               <tr>
                 <td style="padding: 6px 14px; background: #f1f5f9; border-radius: 4px; font-size: 12px; font-family:${FONT}; color:${COLORS.textMuted}; font-weight: 600;">
                   Registered with Gmail
                 </td>
               </tr>
             </table>
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
        <td style="padding: 0 40px 12px;">
          <h1 style="margin: 0; font-family: ${FONT}; font-size: 26px; color: ${COLORS.textMain}; font-weight: 700; letter-spacing: -0.5px;">
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
        <td style="padding: 0 40px 8px;">
          <p style="margin: 0; font-family: ${FONT}; font-size: 16px; line-height: 26px; color: ${COLORS.textMuted};">
            ${p}
          </p>
        </td>
      </tr>
    `).join("");
  };

  const renderStatusIndicator = () => {
    if (!data.statusIndicator) return "";
    const colors = getStatusColors(data.statusIndicator.type);
    return `
      <tr>
        <td style="padding: 8px 40px 20px;">
          <table cellpadding="0" cellspacing="0" border="0" style="margin: 0;">
            <tr>
              <td style="padding: 6px 16px; background-color: ${colors.bg}; border: 1px solid ${colors.border};">
                <span style="font-family: ${FONT}; font-size: 13px; font-weight: 700; color: ${colors.text}; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${data.statusIndicator.label}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  };

  const renderDetails = () => {
    if (!data.details || data.details.length === 0) return "";

    const rows = data.details.map(d => `
      <tr>
        <td width="35%" style="padding: 8px 16px; border-bottom: 1px solid ${COLORS.border}; font-family: ${FONT}; font-size: 13px; font-weight: 600; color: ${COLORS.textMain};">
          ${d.label}
        </td>
        <td width="65%" style="padding: 8px 16px; border-bottom: 1px solid ${COLORS.border}; font-family: ${FONT}; font-size: 14px; color: ${COLORS.textMuted}; word-break: break-word;">
          ${d.value}
        </td>
      </tr>
    `).join("");

    return `
      <tr>
        <td style="padding: 0 40px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid ${COLORS.border}; border-radius: 8px; overflow: hidden;">
            ${rows}
          </table>
        </td>
      </tr>
    `;
  };

  const renderAccountInfo = () => {
    if (!data.accountInfo || data.accountInfo.length === 0) return "";

    const rows = data.accountInfo.map(info => `
      <tr>
        <td width="35%" style="padding: 10px 16px; border-bottom: 1px solid ${COLORS.border}; font-family: ${FONT}; font-size: 13px; font-weight: 600; color: ${COLORS.textMain}; text-transform: uppercase; letter-spacing: 0.3px;">
          ${info.label}
        </td>
        <td width="65%" style="padding: 10px 16px; border-bottom: 1px solid ${COLORS.border}; font-family: ${FONT}; font-size: 14px; color: ${COLORS.textMuted}; word-break: break-all;">
          ${info.value}
        </td>
      </tr>
    `).join("");

    return `
      <tr>
        <td style="padding: 20px 40px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid ${COLORS.border}; border-radius: 8px; overflow: hidden;">
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
        <td width="16" valign="top" style="padding-bottom: 8px; font-family: ${FONT}; font-size: 14px; color: ${COLORS.success}; font-weight: 700;">-</td>
        <td valign="top" style="padding-bottom: 8px; font-family: ${FONT}; font-size: 15px; color: ${COLORS.textMuted}; line-height: 22px;">
          ${item}
        </td>
      </tr>
    `).join("");

    return `
      <tr>
        <td style="padding: 0 40px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid ${COLORS.border}; border-radius: 8px; overflow: hidden;">
            <tr>
              <td style="padding: 20px 24px;">
                <h3 style="margin: 0 0 12px; font-family: ${FONT}; font-size: 14px; font-weight: 700; color: ${COLORS.textMain}; text-transform: uppercase; letter-spacing: 0.5px;">Quick Start</h3>
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
        <td style="padding-bottom: 14px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td valign="top">
                <h4 style="margin: 0 0 2px; font-family: ${FONT}; font-size: 15px; font-weight: 700; color: ${COLORS.textMain};">${feat.title}</h4>
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
          <h3 style="margin: 0 0 14px; font-family: ${FONT}; font-size: 14px; font-weight: 700; color: ${COLORS.textMain}; text-transform: uppercase; letter-spacing: 0.5px;">Features</h3>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${items}
          </table>
        </td>
      </tr>
    `;
  };

  const renderSummaryItems = () => {
    if (!data.summaryItems || data.summaryItems.length === 0) return "";

    const items = data.summaryItems.map(item => {
      const statusColor = item.status ? getStatusColors(item.status) : null;
      return `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid ${COLORS.border};">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                ${statusColor ? `<td width="4" style="background-color: ${statusColor.border}; padding: 0; width: 4px;"></td>` : ''}
                <td style="padding: 0 0 0 ${statusColor ? '16' : '0'}px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td>
                        <a href="${item.url || '#'}" style="font-family: ${FONT}; font-size: 15px; font-weight: 600; color: ${COLORS.primary}; text-decoration: none; line-height: 22px;">
                          ${item.title}
                        </a>
                        ${item.description ? `<p style="margin: 2px 0 0; font-family: ${FONT}; font-size: 13px; color: ${COLORS.textMuted}; line-height: 18px;">${item.description}</p>` : ''}
                      </td>
                    </tr>
                    ${item.meta ? `<tr><td style="padding-top: 4px;"><span style="font-family: ${FONT}; font-size: 11px; color: ${COLORS.textLight};">${item.meta}</span></td></tr>` : ''}
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    }).join("");

    return `
      <tr>
        <td style="padding: 0 40px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid ${COLORS.border}; border-radius: 8px; overflow: hidden;">
            ${items}
          </table>
        </td>
      </tr>
    `;
  };

  const renderCards = () => {
    if (!data.cards || data.cards.length === 0) return "";

    const cards = data.cards.map(card => `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 12px;">
        <tr>
          <td style="padding: 16px; background-color: #f8fafc; border: 1px solid ${COLORS.border}; border-radius: 8px;">
            ${card.title ? `<h4 style="margin: 0 0 6px; font-family: ${FONT}; font-size: 14px; font-weight: 700; color: ${COLORS.textMain};">${card.title}</h4>` : ''}
            ${card.content ? `<p style="margin: 0 0 8px; font-family: ${FONT}; font-size: 13px; color: ${COLORS.textMuted}; line-height: 20px;">${card.content}</p>` : ''}
            ${card.list ? `
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${card.list.map(item => `
                  <tr>
                    <td width="12" valign="top" style="padding-bottom: 4px; font-family: ${FONT}; font-size: 12px; color: ${COLORS.primary};">-</td>
                    <td valign="top" style="padding-bottom: 4px; font-family: ${FONT}; font-size: 13px; color: ${COLORS.textMuted};">${item}</td>
                  </tr>
                `).join("")}
              </table>
            ` : ''}
          </td>
        </tr>
      </table>
    `).join("");

    return `
      <tr>
        <td style="padding: 0 40px 24px;">
          ${cards}
        </td>
      </tr>
    `;
  };

  const renderMetadata = () => {
    if (!data.metadata) return "";
    return `
      <tr>
        <td style="padding: 0 40px 18px;">
          <table cellpadding="0" cellspacing="0" border="0" style="margin: 0;">
            <tr>
              <td style="padding: 6px 12px; background-color: #f8fafc; border-radius: 4px;">
                <span style="font-family: ${FONT}; font-size: 11px; color: ${COLORS.textLight};">
                  ${data.metadata.module} ${data.metadata.action ? `- ${data.metadata.action}` : ''} &bull; ${data.metadata.timestamp}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  };

  const renderWarning = () => {
    if (!data.warning) return "";
    return `
      <tr>
        <td style="padding: 0 40px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${COLORS.warningBg}; border: 1px solid ${COLORS.warning}; border-radius: 8px; overflow: hidden;">
            <tr>
              <td style="padding: 14px 16px;">
                <p style="margin: 0; font-family: ${FONT}; font-size: 13px; color: #92400e; line-height: 20px;">
                  <strong>Note:</strong> ${data.warning}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  };

  const renderTip = () => {
    if (!data.tip) return "";
    return `
      <tr>
        <td style="padding: 0 40px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${COLORS.infoBg}; border: 1px solid ${COLORS.info}; border-radius: 8px; overflow: hidden;">
            <tr>
              <td style="padding: 14px 16px;">
                <p style="margin: 0; font-family: ${FONT}; font-size: 13px; color: #1e40af; line-height: 20px;">
                  <strong>Tip:</strong> ${data.tip}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  };

  const renderDivider = () => {
    if (!data.divider) return "";
    return `
      <tr>
        <td style="padding: 0 40px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="height: 1px; background-color: ${COLORS.border};"></td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  };

  const renderButton = () => {
    if (!data.button) return "";
    return `
      <tr>
        <td align="center" style="padding: 8px 40px 16px;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background-color: ${COLORS.primary}; padding: 14px 36px; border-radius: 6px;">
                <a href="${data.button.url}" style="color: #ffffff; text-decoration: none; font-family: ${FONT}; font-size: 15px; font-weight: 600; letter-spacing: 0.3px; display: inline-block;">
                  ${data.button.text}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  };

  const renderSecondaryButton = () => {
    if (!data.secondaryButton) return "";
    return `
      <tr>
        <td align="center" style="padding: 0 40px 24px;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding: 10px 28px; border: 1px solid ${COLORS.border}; border-radius: 6px;">
                <a href="${data.secondaryButton.url}" style="color: ${COLORS.textMuted}; text-decoration: none; font-family: ${FONT}; font-size: 13px; font-weight: 500; display: inline-block;">
                  ${data.secondaryButton.text}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  };

  const renderSecurityNotice = () => {
    if (!data.securityNotice) return "";
    return `
      <tr>
        <td style="padding: 0 40px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${COLORS.dangerBg}; border-left: 4px solid ${COLORS.danger}; border-radius: 8px; overflow: hidden;">
            <tr>
              <td style="padding: 16px;">
                <h4 style="margin: 0 0 6px; font-family: ${FONT}; font-size: 14px; font-weight: 700; color: #991b1b;">Security Notice</h4>
                <p style="margin: 0; font-family: ${FONT}; font-size: 13px; color: #7f1d1d; line-height: 20px;">
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
        <td style="padding: 0 40px 10px;">
          <p style="margin: 0; font-family: ${FONT}; font-size: 15px; line-height: 24px; color: ${COLORS.textMuted};">
            ${p}
          </p>
        </td>
      </tr>
    `).join("");
  };

  const renderSocials = () => {
    if (!data.socialLinks) return "";

    const links: string[] = [];
    if (data.socialLinks.linkedin) links.push(`<a href="${data.socialLinks.linkedin}" style="display:inline-block; margin:0 6px;"><img src="${ICONS.linkedin}" width="20" height="20" alt="LinkedIn" /></a>`);
    if (data.socialLinks.twitter) links.push(`<a href="${data.socialLinks.twitter}" style="display:inline-block; margin:0 6px;"><img src="${ICONS.twitter}" width="20" height="20" alt="Twitter" /></a>`);
    if (data.socialLinks.facebook) links.push(`<a href="${data.socialLinks.facebook}" style="display:inline-block; margin:0 6px;"><img src="${ICONS.facebook}" width="20" height="20" alt="Facebook" /></a>`);
    if (data.socialLinks.instagram) links.push(`<a href="${data.socialLinks.instagram}" style="display:inline-block; margin:0 6px;"><img src="${ICONS.instagram}" width="20" height="20" alt="Instagram" /></a>`);
    if (data.socialLinks.youtube) links.push(`<a href="${data.socialLinks.youtube}" style="display:inline-block; margin:0 6px;"><img src="${ICONS.youtube}" width="20" height="20" alt="YouTube" /></a>`);

    if (links.length === 0) return "";

    return `
      <tr>
        <td align="center" style="padding: 0 40px 20px;">
          ${links.join("")}
        </td>
      </tr>
    `;
  };

  const renderFooter = () => {
    return `
      <tr>
        <td style="padding: 28px 40px; background-color: #f8fafc; border-top: 1px solid ${COLORS.border};">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${renderSocials()}
            <tr>
              <td align="center" style="padding-bottom: 12px;">
                <img src="${logoSmallBase64}" alt="MyWorkspace" width="80" style="display: block; opacity: 0.4; border-radius: 4px;" />
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom: 10px;">
                <p style="margin: 0; font-family: ${FONT}; font-size: 12px; color: ${COLORS.textLight};">
                  &copy; ${currentYear} MyWorkspace Inc. All rights reserved.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center">
                <p style="margin: 0; font-family: ${FONT}; font-size: 11px; color: ${COLORS.textLight}; line-height: 18px;">
                  <a href="${appUrl}/privacy" style="color: ${COLORS.primary}; text-decoration: none;">Privacy Policy</a>
                  <span style="color: ${COLORS.textLight};"> &bull; </span>
                  <a href="${appUrl}/terms" style="color: ${COLORS.primary}; text-decoration: none;">Terms</a>
                  ${data.supportEmail ? ` <span style="color: ${COLORS.textLight};"> &bull; </span> <a href="mailto:${data.supportEmail}" style="color: ${COLORS.primary}; text-decoration: none;">Contact</a>` : ''}
                  ${data.unsubscribeUrl ? ` <span style="color: ${COLORS.textLight};"> &bull; </span> <a href="${data.unsubscribeUrl}" style="color: ${COLORS.primary}; text-decoration: none;">Unsubscribe</a>` : ''}
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
        body { margin: 0; padding: 0; background-color: ${COLORS.bg}; -webkit-font-smoothing: antialiased; }
        table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { border: 0; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
        a { color: ${COLORS.primary}; }
        a:hover { color: ${COLORS.primaryHover}; }
        @media only screen and (max-width: 480px) {
          .content-cell { padding-left: 20px !important; padding-right: 20px !important; }
          h1 { font-size: 22px !important; }
          td[style*="padding: 0 40px"] { padding-left: 20px !important; padding-right: 20px !important; }
          td[style*="padding: 0 40px"] { padding-left: 20px !important; padding-right: 20px !important; }
        }
        @media (prefers-color-scheme: dark) {
          body, .body-bg { background-color: #0f172a !important; }
          .email-container { background-color: #1e293b !important; }
          h1, h2, h3, h4, p, td, span, div { color: #f8fafc !important; }
          .text-muted { color: #cbd5e1 !important; }
          .border-table, .border-bottom { border-color: #334155 !important; }
          .bg-light { background-color: #0f172a !important; }
        }
      </style>
    </head>
    <body class="body-bg" style="margin: 0; padding: 0; background-color: ${COLORS.bg};">
      ${renderPreviewText()}
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${COLORS.bg};">
        <tr>
          <td align="center">
            <table class="email-container" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${COLORS.cardBg}; width: 100%; max-width: 100%;">
              ${renderHeader()}
              ${renderProviderIcon()}
              ${renderMetadata()}
              ${renderGreeting()}
              ${renderStatusIndicator()}
              ${renderIntro()}
              ${renderDetails()}
              ${renderWarning()}
              ${renderTip()}
              ${renderAccountInfo()}
              ${renderQuickStart()}
              ${renderFeatures()}
              ${renderSummaryItems()}
              ${renderCards()}
              ${renderSecurityNotice()}
              ${renderDivider()}
              ${renderButton()}
              ${renderSecondaryButton()}
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
