export interface EmailButton {
  text: string;
  url: string;
}

export interface EmailCard {
  title?: string;
  content?: string;
  icon?: string;
  list?: string[];
}

export interface EmailFeature {
  title: string;
  description?: string;
  icon?: string;
}

export interface SocialLinks {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
}

export type StatusType = "success" | "warning" | "error" | "info" | "neutral";

export interface StatusIndicator {
  type: StatusType;
  label: string;
}

export interface DetailItem {
  label: string;
  value: string;
}

export interface MetadataBlock {
  module: string;
  timestamp: string;
  action?: string;
}

export interface SummaryItem {
  title: string;
  description?: string;
  status?: StatusType;
  url?: string;
  meta?: string;
}

export interface EmailData {
  subject: string;
  previewText?: string;
  greeting?: string;
  intro?: string[];
  accountInfo?: DetailItem[];
  statusIndicator?: StatusIndicator;
  details?: DetailItem[];
  metadata?: MetadataBlock;
  quickStart?: string[];
  features?: EmailFeature[];
  cards?: EmailCard[];
  summaryItems?: SummaryItem[];
  button?: EmailButton;
  secondaryButton?: EmailButton;
  divider?: boolean;
  warning?: string;
  tip?: string;
  outro?: string[];
  securityNotice?: boolean;
  socialLinks?: SocialLinks;
  unsubscribeUrl?: string;
  supportEmail?: string;
  providerIcon?: string;
}

export interface AttachmentItem {
  filename: string;
  path?: string;
  content?: Buffer | string;
  cid?: string;
}
