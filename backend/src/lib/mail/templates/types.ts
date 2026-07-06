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

export interface EmailData {
  subject: string;
  previewText?: string;
  greeting?: string;
  intro?: string[];
  accountInfo?: {
    label: string;
    value: string;
  }[];
  quickStart?: string[];
  features?: EmailFeature[];
  cards?: EmailCard[];
  button?: EmailButton;
  outro?: string[];
  securityNotice?: boolean;
  socialLinks?: SocialLinks;
  unsubscribeUrl?: string;
  supportEmail?: string;
  providerIcon?: string; // e.g. 'gmail'
}

export interface AttachmentItem {
  filename: string;
  path?: string;
  content?: Buffer | string;
  cid?: string;
}
