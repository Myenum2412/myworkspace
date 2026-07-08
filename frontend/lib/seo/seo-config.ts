import type { Metadata } from "next";

const SITE_URL = "https://myworkspace.myenum.in";
const SITE_NAME = "MyWorkSpace";
const ORG_NAME = "MyWorkSpace";
const LOGO_URL = `${SITE_URL}/logo.jpeg`;
const OG_IMAGE = `${SITE_URL}/login-bg.png`;
const OG_IMAGE_ALT =
  "MyWorkSpace — the platform that transforms how your team collaborates and ships";

export const siteConfig = {
  url: SITE_URL,
  name: SITE_NAME,
  orgName: ORG_NAME,
  logo: LOGO_URL,
  ogImage: OG_IMAGE,
  ogImageAlt: OG_IMAGE_ALT,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  twitterHandle: "@myworkspace",
  locale: "en_US",
  language: "en",
  copyright: `${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.`,
} as const;

// ── Keywords ──────────────────────────────────────────────────────────
export const sharedKeywords = [
  "workspace management",
  "SaaS platform",
  "project management",
  "team collaboration",
  "task management",
  "employee management",
  "business management",
  "cloud workspace",
  "productivity software",
  "enterprise software",
  "CRM",
  "HR management",
  "organization management",
  "business automation",
] as const;

export const loginKeywords = [
  ...sharedKeywords,
  "secure login",
  "user authentication",
  "sign in",
  "login page",
  "account access",
] as const;

export const signupKeywords = [
  ...sharedKeywords,
  "create account",
  "free trial",
  "get started",
  "sign up",
  "registration",
  "new account",
] as const;

export const chatKeywords = [
  ...sharedKeywords,
  "video conferencing",
  "video calls",
  "audio calls",
  "screen sharing",
  "real-time messaging",
  "team chat",
  "instant messaging",
  "online meetings",
  "video meetings",
  "web conferencing",
  "remote collaboration",
  "virtual meetings",
  "chat application",
  "communication platform",
  "group chat",
  "direct messages",
  "file sharing",
  "voice calls",
  "HD video",
  "enterprise communication",
] as const;

// ── Common robots config ──────────────────────────────────────────────
const robots: Metadata["robots"] = {
  index: true,
  follow: true,
  nocache: false,
  googleBot: {
    index: true,
    follow: true,
    "max-video-preview": -1,
    "max-image-preview": "large",
    "max-snippet": -1,
  },
};

// ── Organization JSON-LD ──────────────────────────────────────────────
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ORG_NAME,
    url: SITE_URL,
    logo: LOGO_URL,
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["English"],
    },
  };
}

// ── WebSite JSON-LD ───────────────────────────────────────────────────
export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

// ── SoftwareApplication JSON-LD ───────────────────────────────────────
export function softwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "The platform that transforms how your team collaborates and ships. Workspace management, project management, task management, and team collaboration in one powerful SaaS platform.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      category: "Free",
    },
  };
}

// ── Login page metadata ───────────────────────────────────────────────
export function getLoginMetadata(): Metadata {
  return {
    title: {
      absolute: "Sign In — MyWorkSpace | Secure Workspace Login",
    },
    description:
      "Sign in to MyWorkSpace — the all-in-one SaaS platform for workspace management, project management, team collaboration, task management, and business automation. Secure login with enterprise-grade authentication.",
    keywords: [...loginKeywords],
    authors: [{ name: ORG_NAME, url: SITE_URL }],
    creator: ORG_NAME,
    publisher: ORG_NAME,
    robots,
    alternates: {
      canonical: `${SITE_URL}/login`,
    },
    openGraph: {
      title: "Sign In — MyWorkSpace | Secure Workspace Login",
      description:
        "Sign in to MyWorkSpace — the all-in-one SaaS platform for workspace management, project management, team collaboration, and business automation.",
      url: `${SITE_URL}/login`,
      siteName: SITE_NAME,
      images: [
        {
          url: OG_IMAGE,
          width: siteConfig.ogImageWidth,
          height: siteConfig.ogImageHeight,
          alt: OG_IMAGE_ALT,
        },
      ],
      locale: siteConfig.locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Sign In — MyWorkSpace | Secure Workspace Login",
      description:
        "Sign in to MyWorkSpace — the all-in-one SaaS platform for workspace management, project management, team collaboration, and business automation.",
      images: [OG_IMAGE],
      site: siteConfig.twitterHandle,
      creator: siteConfig.twitterHandle,
    },
    other: {
      "application-name": SITE_NAME,
      "msapplication-TileColor": "#000000",
    },
  };
}

// ── Sign Up page metadata ─────────────────────────────────────────────
export function getSignupMetadata(): Metadata {
  return {
    title: {
      absolute: "Create Account — MyWorkSpace | Free Workspace Signup",
    },
    description:
      "Create your free MyWorkSpace account. Get started with workspace management, project management, team collaboration, task management, and business automation on a powerful SaaS platform.",
    keywords: [...signupKeywords],
    authors: [{ name: ORG_NAME, url: SITE_URL }],
    creator: ORG_NAME,
    publisher: ORG_NAME,
    robots,
    alternates: {
      canonical: `${SITE_URL}/signup`,
    },
    openGraph: {
      title: "Create Account — MyWorkSpace | Free Workspace Signup",
      description:
        "Create your free MyWorkSpace account. Get started with workspace management, project management, team collaboration, and business automation.",
      url: `${SITE_URL}/signup`,
      siteName: SITE_NAME,
      images: [
        {
          url: OG_IMAGE,
          width: siteConfig.ogImageWidth,
          height: siteConfig.ogImageHeight,
          alt: OG_IMAGE_ALT,
        },
      ],
      locale: siteConfig.locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Create Account — MyWorkSpace | Free Workspace Signup",
      description:
        "Create your free MyWorkSpace account. Get started with workspace management, project management, team collaboration, and business automation.",
      images: [OG_IMAGE],
      site: siteConfig.twitterHandle,
      creator: siteConfig.twitterHandle,
    },
    other: {
      "application-name": SITE_NAME,
      "msapplication-TileColor": "#000000",
    },
  };
}

// ── Chat page metadata ────────────────────────────────────────────────
export function getChatMetadata(): Metadata {
  return {
    title: {
      absolute: "Chat & Video Calls — MyWorkSpace | Real-Time Communication",
    },
    description:
      "Connect with your team through real-time messaging, HD video calls, audio calls, and screen sharing. MyWorkSpace communication platform supports group chats, online meetings, and enterprise collaboration.",
    keywords: [...chatKeywords],
    authors: [{ name: ORG_NAME, url: SITE_URL }],
    creator: ORG_NAME,
    publisher: ORG_NAME,
    robots,
    alternates: {
      canonical: `${SITE_URL}/chat`,
    },
    openGraph: {
      title: "Chat & Video Calls — MyWorkSpace | Real-Time Communication",
      description:
        "Connect with your team through real-time messaging, HD video calls, audio calls, and screen sharing. Enterprise-grade communication platform.",
      url: `${SITE_URL}/chat`,
      siteName: SITE_NAME,
      images: [
        {
          url: OG_IMAGE,
          width: siteConfig.ogImageWidth,
          height: siteConfig.ogImageHeight,
          alt: OG_IMAGE_ALT,
        },
      ],
      locale: siteConfig.locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Chat & Video Calls — MyWorkSpace | Real-Time Communication",
      description:
        "Connect with your team through real-time messaging, HD video calls, audio calls, and screen sharing.",
      images: [OG_IMAGE],
      site: siteConfig.twitterHandle,
      creator: siteConfig.twitterHandle,
    },
    other: {
      "application-name": SITE_NAME,
      "msapplication-TileColor": "#000000",
    },
  };
}

// ── Login page JSON-LD ────────────────────────────────────────────────
export function loginPageJsonLd() {
  return [
    organizationJsonLd(),
    webSiteJsonLd(),
    softwareApplicationJsonLd(),
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Sign In — MyWorkSpace",
      description:
        "Sign in to MyWorkSpace — the all-in-one SaaS platform for workspace management, project management, team collaboration, and business automation.",
      url: `${SITE_URL}/login`,
      isPartOf: {
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
      },
      about: {
        "@type": "Organization",
        name: ORG_NAME,
        url: SITE_URL,
      },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Sign In",
            item: `${SITE_URL}/login`,
          },
        ],
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How do I sign in to MyWorkSpace?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Enter your email address and password on the MyWorkSpace sign-in page, then click the Sign In button. You can also use two-factor authentication for added security.",
          },
        },
        {
          "@type": "Question",
          name: "What if I forgot my MyWorkSpace password?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Click the 'Forgot Password' link on the sign-in page to reset your password via email. Follow the instructions in the email to create a new password.",
          },
        },
        {
          "@type": "Question",
          name: "Is MyWorkSpace secure?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. MyWorkSpace uses enterprise-grade security including encrypted data transmission, secure password hashing, and optional two-factor authentication to protect your account and workspace data.",
          },
        },
      ],
    },
  ];
}

// ── Chat page JSON-LD ─────────────────────────────────────────────────
export function chatPageJsonLd() {
  return [
    organizationJsonLd(),
    webSiteJsonLd(),
    softwareApplicationJsonLd(),
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Chat & Video Calls — MyWorkSpace",
      description:
        "Real-time messaging, HD video calls, audio calls, and screen sharing for team collaboration.",
      url: `${SITE_URL}/chat`,
      isPartOf: {
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
      },
      about: {
        "@type": "Organization",
        name: ORG_NAME,
        url: SITE_URL,
      },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Chat", item: `${SITE_URL}/chat` },
        ],
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: `${SITE_NAME} Chat`,
      applicationCategory: "CommunicationApplication",
      operatingSystem: "Web",
      description:
        "Real-time messaging, video conferencing, audio calls, screen sharing, and team collaboration platform.",
      featureList: [
        "HD Video Calls",
        "Audio Calls",
        "Screen Sharing",
        "Real-time Messaging",
        "Group Chat",
        "Direct Messages",
        "Online Meetings",
        "File Sharing",
        "Message Reactions",
        "Read Receipts",
        "Typing Indicators",
        "Presence Status",
      ],
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How do I start a video call on MyWorkSpace?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Navigate to the Chat page, click the 'Calls' tab, and select 'New Video Call'. You can also start a call directly from any conversation by clicking the video icon in the chat header.",
          },
        },
        {
          "@type": "Question",
          name: "Can I share my screen during a meeting?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. During any video or audio call, click the screen share button in the meeting controls to share your screen with all participants. System audio is also supported.",
          },
        },
        {
          "@type": "Question",
          name: "Is MyWorkSpace chat encrypted?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. All communication on MyWorkSpace is secured with enterprise-grade encryption including DTLS-SRTP for media streams and encrypted WebSocket connections for messaging.",
          },
        },
      ],
    },
  ];
}

// ── Sign Up page JSON-LD ──────────────────────────────────────────────
export function signupPageJsonLd() {
  return [
    organizationJsonLd(),
    webSiteJsonLd(),
    softwareApplicationJsonLd(),
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Create Account — MyWorkSpace",
      description:
        "Create your free MyWorkSpace account. Get started with workspace management, project management, team collaboration, and business automation.",
      url: `${SITE_URL}/signup`,
      isPartOf: {
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
      },
      about: {
        "@type": "Organization",
        name: ORG_NAME,
        url: SITE_URL,
      },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Create Account",
            item: `${SITE_URL}/signup`,
          },
        ],
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Is MyWorkSpace free to use?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. MyWorkSpace offers a free plan that includes core workspace management, project management, and team collaboration features. Paid plans are available for advanced needs.",
          },
        },
        {
          "@type": "Question",
          name: "How do I create a MyWorkSpace account?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Visit the MyWorkSpace signup page, enter your email address, choose a password, and click Create Account. You'll receive a verification email to confirm your account.",
          },
        },
        {
          "@type": "Question",
          name: "What features are included in MyWorkSpace?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "MyWorkSpace includes workspace management, project management, task management, team collaboration, employee management, CRM, HR management, business automation, file management, time tracking, and real-time notifications.",
          },
        },
      ],
    },
  ];
}
