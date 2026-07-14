"use client";

import { INTEGRATIONS_BY_CATEGORY, INTEGRATION_LINK_ICON } from "@/lib/integrations";

interface IntegrationsClientProps {
  userId: string;
  userName: string;
  userEmail: string;
}

export function IntegrationsClient(_props: IntegrationsClientProps) {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 max-w-3xl">
      {/* Social Media */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Social Media</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {INTEGRATIONS_BY_CATEGORY.social.map((integration) => (
            <a
              key={integration.id}
              href={integration.oauthUrl}
              className="group relative flex flex-col items-center gap-2 rounded-xl border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-sm hover:bg-accent/50"
            >
              <div className={`size-10 rounded-lg ${integration.bgColor} flex items-center justify-center`}>
                {integration.icon}
              </div>
              <span className="text-xs font-medium text-center leading-tight">{integration.name}</span>
              <span className="absolute top-2 right-2 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors">
                {INTEGRATION_LINK_ICON}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Business */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Business</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {INTEGRATIONS_BY_CATEGORY.business.map((integration) => (
            <a
              key={integration.id}
              href={integration.oauthUrl}
              className="group relative flex flex-col items-center gap-2 rounded-xl border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-sm hover:bg-accent/50"
            >
              <div className={`size-10 rounded-lg ${integration.bgColor} flex items-center justify-center`}>
                {integration.icon}
              </div>
              <span className="text-xs font-medium text-center leading-tight">{integration.name}</span>
              <span className="absolute top-2 right-2 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors">
                {INTEGRATION_LINK_ICON}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
