import * as Sentry from "@sentry/node";
import { env } from "../config/env.js";

export function initSentry(): void {
  if (!env.SENTRY_DSN) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 0,
    profilesSampleRate: env.NODE_ENV === "production" ? 0.1 : 0,
    integrations: [Sentry.httpIntegration(), Sentry.mongooseIntegration()],
  });
}

export { Sentry };
