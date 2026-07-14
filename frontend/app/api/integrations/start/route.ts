import { NextRequest, NextResponse } from "next/server";

const OAUTH_CONFIG: Record<string, { authUrl: string; clientIdEnv: string; clientSecretEnv: string; redirectUri: string; scopes: string[] }> = {
  facebook: {
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    clientIdEnv: "FACEBOOK_CLIENT_ID",
    clientSecretEnv: "FACEBOOK_CLIENT_SECRET",
    redirectUri: "/api/integrations/facebook/callback",
    scopes: ["email", "pages_show_list", "pages_read_engagement"],
  },
  x: {
    authUrl: "https://twitter.com/i/oauth2/authorize",
    clientIdEnv: "X_CLIENT_ID",
    clientSecretEnv: "X_CLIENT_SECRET",
    redirectUri: "/api/integrations/x/callback",
    scopes: ["tweet.read", "users.read", "offline.access"],
  },
  linkedin: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    clientIdEnv: "LINKEDIN_CLIENT_ID",
    clientSecretEnv: "LINKEDIN_CLIENT_SECRET",
    redirectUri: "/api/integrations/linkedin/callback",
    scopes: ["openid", "profile", "email", "w_member_social"],
  },
  instagram: {
    authUrl: "https://www.instagram.com/oauth/authorize",
    clientIdEnv: "INSTAGRAM_CLIENT_ID",
    clientSecretEnv: "INSTAGRAM_CLIENT_SECRET",
    redirectUri: "/api/integrations/instagram/callback",
    scopes: ["instagram_basic", "instagram_content_publish", "pages_show_list"],
  },
  youtube: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    clientIdEnv: "YOUTUBE_CLIENT_ID",
    clientSecretEnv: "YOUTUBE_CLIENT_SECRET",
    redirectUri: "/api/integrations/youtube/callback",
    scopes: ["https://www.googleapis.com/auth/youtube.readonly", "https://www.googleapis.com/auth/yt-analytics.readonly"],
  },
  pinterest: {
    authUrl: "https://www.pinterest.com/oauth",
    clientIdEnv: "PINTEREST_CLIENT_ID",
    clientSecretEnv: "PINTEREST_CLIENT_SECRET",
    redirectUri: "/api/integrations/pinterest/callback",
    scopes: ["boards:read", "pins:read", "user_accounts:read"],
  },
  reddit: {
    authUrl: "https://www.reddit.com/api/v1/authorize",
    clientIdEnv: "REDDIT_CLIENT_ID",
    clientSecretEnv: "REDDIT_CLIENT_SECRET",
    redirectUri: "/api/integrations/reddit/callback",
    scopes: ["identity", "read", "submit"],
  },
  slack: {
    authUrl: "https://slack.com/oauth/v2/authorize",
    clientIdEnv: "SLACK_CLIENT_ID",
    clientSecretEnv: "SLACK_CLIENT_SECRET",
    redirectUri: "/api/integrations/slack/callback",
    scopes: ["channels:read", "chat:write", "users:read", "team:read"],
  },
  discord: {
    authUrl: "https://discord.com/api/oauth2/authorize",
    clientIdEnv: "DISCORD_CLIENT_ID",
    clientSecretEnv: "DISCORD_CLIENT_SECRET",
    redirectUri: "/api/integrations/discord/callback",
    scopes: ["identify", "guilds", "bot"],
  },
  notion: {
    authUrl: "https://api.notion.com/v1/oauth/authorize",
    clientIdEnv: "NOTION_CLIENT_ID",
    clientSecretEnv: "NOTION_CLIENT_SECRET",
    redirectUri: "/api/integrations/notion/callback",
    scopes: [],
  },
  github: {
    authUrl: "https://github.com/login/oauth/authorize",
    clientIdEnv: "GITHUB_CLIENT_ID",
    clientSecretEnv: "GITHUB_CLIENT_SECRET",
    redirectUri: "/api/integrations/github/callback",
    scopes: ["repo", "user", "read:org"],
  },
  gitlab: {
    authUrl: "https://gitlab.com/oauth/authorize",
    clientIdEnv: "GITLAB_CLIENT_ID",
    clientSecretEnv: "GITLAB_CLIENT_SECRET",
    redirectUri: "/api/integrations/gitlab/callback",
    scopes: ["api", "read_user", "read_repository"],
  },
  stripe: {
    authUrl: "https://connect.stripe.com/oauth/authorize",
    clientIdEnv: "STRIPE_CLIENT_ID",
    clientSecretEnv: "STRIPE_CLIENT_SECRET",
    redirectUri: "/api/integrations/stripe/callback",
    scopes: ["read_write"],
  },
  hubspot: {
    authUrl: "https://app.hubspot.com/oauth/authorize",
    clientIdEnv: "HUBSPOT_CLIENT_ID",
    clientSecretEnv: "HUBSPOT_CLIENT_SECRET",
    redirectUri: "/api/integrations/hubspot/callback",
    scopes: ["crm.objects.contacts.read", "crm.objects.companies.read", "content", "forms"],
  },
  salesforce: {
    authUrl: "https://login.salesforce.com/services/oauth2/authorize",
    clientIdEnv: "SALESFORCE_CLIENT_ID",
    clientSecretEnv: "SALESFORCE_CLIENT_SECRET",
    redirectUri: "/api/integrations/salesforce/callback",
    scopes: ["api", "id", "refresh_token"],
  },
  jira: {
    authUrl: "https://auth.atlassian.com/authorize",
    clientIdEnv: "JIRA_CLIENT_ID",
    clientSecretEnv: "JIRA_CLIENT_SECRET",
    redirectUri: "/api/integrations/jira/callback",
    scopes: ["read:jira-work", "read:jira-user", "offline_access"],
  },
  asana: {
    authUrl: "https://app.asana.com/-/oauth_authorize",
    clientIdEnv: "ASANA_CLIENT_ID",
    clientSecretEnv: "ASANA_CLIENT_SECRET",
    redirectUri: "/api/integrations/asana/callback",
    scopes: ["default"],
  },
  trello: {
    authUrl: "https://trello.com/1/authorize",
    clientIdEnv: "TRELLO_API_KEY",
    clientSecretEnv: "TRELLO_API_SECRET",
    redirectUri: "/api/integrations/trello/callback",
    scopes: ["read", "write"],
  },
  zoom: {
    authUrl: "https://zoom.us/oauth/authorize",
    clientIdEnv: "ZOOM_CLIENT_ID",
    clientSecretEnv: "ZOOM_CLIENT_SECRET",
    redirectUri: "/api/integrations/zoom/callback",
    scopes: ["meeting:read", "user:read", "recording:read"],
  },
  "google-drive": {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    clientIdEnv: "GOOGLE_DRIVE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_DRIVE_CLIENT_SECRET",
    redirectUri: "/api/integrations/google-drive/callback",
    scopes: ["https://www.googleapis.com/auth/drive.readonly", "https://www.googleapis.com/auth/drive.file"],
  },
  dropbox: {
    authUrl: "https://www.dropbox.com/oauth2/authorize",
    clientIdEnv: "DROPBOX_APP_KEY",
    clientSecretEnv: "DROPBOX_APP_SECRET",
    redirectUri: "/api/integrations/dropbox/callback",
    scopes: ["files.metadata.read", "files.content.read", "sharing.read"],
  },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");

  if (!provider || !OAUTH_CONFIG[provider]) {
    return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
  }

  const config = OAUTH_CONFIG[provider];
  const clientId = process.env[config.clientIdEnv];

  if (!clientId) {
    return NextResponse.json(
      { error: `${provider} integration is not configured. Set ${config.clientIdEnv} environment variable.` },
      { status: 501 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}${config.redirectUri}`;

  const params: Record<string, string> = {
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
  };

  if (config.scopes.length > 0) {
    params.scope = config.scopes.join(" ");
  }

  const authUrl = `${config.authUrl}?${new URLSearchParams(params).toString()}`;

  return NextResponse.redirect(authUrl);
}
