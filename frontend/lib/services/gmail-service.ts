import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";

export type EmailConnection = {
  id: string;
  userId: string;
  orgId: string;
  provider: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiry: Date | null;
  email: string;
  name: string;
  syncEnabled: boolean;
  lastSyncAt: Date | null;
};

export async function refreshGmailToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AUTH_GOOGLE_ID!,
        client_secret: process.env.AUTH_GOOGLE_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

export async function getUserEmailConnections(userId: string): Promise<EmailConnection[]> {
  const docs = await db
    .collection(collections.emailConnections)
    .find({ userId })
    .toArray();

  return docs.map((doc) => ({
    id: (doc.id || doc._id?.toString()) as string,
    userId: doc.userId as string,
    orgId: doc.orgId as string,
    provider: doc.provider as string,
    accessToken: doc.accessToken as string,
    refreshToken: doc.refreshToken as string | null,
    tokenExpiry: doc.tokenExpiry as Date | null,
    email: doc.email as string,
    name: doc.name as string,
    syncEnabled: doc.syncEnabled as boolean,
    lastSyncAt: doc.lastSyncAt as Date | null,
  }));
}

export async function getValidAccessToken(connection: EmailConnection): Promise<string | null> {
  let accessToken = connection.accessToken;

  if (connection.tokenExpiry && new Date(connection.tokenExpiry) < new Date()) {
    if (connection.refreshToken) {
      const newToken = await refreshGmailToken(connection.refreshToken);
      if (newToken) {
        accessToken = newToken;
        await db.collection(collections.emailConnections).updateOne(
          { id: connection.id },
          { $set: { accessToken: newToken, updatedAt: new Date() } }
        );
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  return accessToken;
}

export async function sendGmailEmail(
  connection: EmailConnection,
  to: string,
  subject: string,
  body: string
): Promise<boolean> {
  const accessToken = await getValidAccessToken(connection);
  if (!accessToken) return false;

  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`;
  const messageParts = [
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    "Content-Type: text/html; charset=utf-8",
    "",
    body,
  ];
  const message = messageParts.join("\n");
  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  try {
    const res = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: encodedMessage }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function listGmailMessages(
  connection: EmailConnection,
  maxResults = 20
): Promise<{ id: string; from: string; subject: string; snippet: string; date: string }[]> {
  const accessToken = await getValidAccessToken(connection);
  if (!accessToken) return [];

  try {
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=in:inbox`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!listRes.ok) return [];
    const listData = await listRes.json();
    const messages = listData.messages || [];

    const result: { id: string; from: string; subject: string; snippet: string; date: string }[] = [];

    for (const msg of messages.slice(0, maxResults)) {
      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!detailRes.ok) continue;
      const detailData = await detailRes.json();

      const headers = detailData.payload?.headers || [];
      const from = headers.find((h: { name: string }) => h.name === "From")?.value || "";
      const subject = headers.find((h: { name: string }) => h.name === "Subject")?.value || "";
      const date = headers.find((h: { name: string }) => h.name === "Date")?.value || "";

      result.push({
        id: msg.id,
        from,
        subject,
        snippet: detailData.snippet || "",
        date,
      });
    }

    return result;
  } catch {
    return [];
  }
}

export async function disconnectGmail(userId: string): Promise<void> {
  await db.collection(collections.emailConnections).deleteMany({
    userId,
    provider: "gmail",
  });
}
