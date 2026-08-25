"use client";

import {
  Activity,
  ChevronRight,
  Database,
  Key,
  Lock,
  Mail,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const SECTIONS = [
  { id: "framework", label: "1. Security Framework", icon: ShieldCheck },
  { id: "infrastructure", label: "2. Cloud Infrastructure", icon: Server },
  { id: "data-encryption", label: "3. Data Encryption", icon: Lock },
  { id: "access-controls", icon: Key, label: "4. Account Access Controls" },
  { id: "monitoring", label: "5. Threat Monitoring", icon: Activity },
  { id: "backups", label: "6. Backups & Disaster Recovery", icon: Database },
  { id: "reporting", label: "7. Vulnerability Reporting", icon: Terminal },
];

export function SecurityContent() {
  const [activeSection, setActiveSection] = useState("framework");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
            break;
          }
        }
      },
      {
        rootMargin: "-10% 0px -70% 0px",
        threshold: 0,
      },
    );

    for (const section of SECTIONS) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 90; // account for headers
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
      setActiveSection(id);
    }
  };

  return (
    <div className="w-full bg-background min-h-screen pb-20">
      {/* Hero Header */}
      <section className="relative w-full py-16 md:py-24 bg-gradient-to-b from-brand-50 to-white dark:from-brand-950/20 dark:to-background border-b border-brand-100/50 dark:border-brand-900/10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#3b82f6/8,transparent)] dark:bg-[radial-gradient(circle_at_30%_30%,#3b82f6/4,transparent)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col items-center text-center">
            {/* Logo Container */}
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand-800 ring-4 ring-primary/20 overflow-hidden shadow-md transition-transform hover:scale-105 duration-300">
              <Image
                src="/logo.jpeg"
                alt="MyWorkSpace Logo"
                width={64}
                height={64}
                className="h-16 w-16 object-cover rounded-full"
                priority
              />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4 animate-fade-in">
              <ShieldAlert className="size-3.5" />
              Security Center
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl max-w-3xl leading-none">
              Security Policy
            </h1>
            <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
              How we defend your designs, datasets, communication records, and workspace
              configurations against threats.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs font-medium text-muted-foreground">
              <span>Last updated: August 16, 2026</span>
              <span className="hidden sm:inline">•</span>
              <span>Version 1.2.0</span>
            </div>
          </div>
        </div>
      </section>

      {/* Core Security Metrics */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-surface border border-brand-150/60 dark:border-brand-900/10 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex gap-4 items-start">
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                <Lock className="size-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">AES-256 Encryption</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Military-grade encryption shields database backups at rest, and TLS 1.3 seals all
                  web connection streams.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-surface border border-brand-150/60 dark:border-brand-900/10 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex gap-4 items-start">
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                <Server className="size-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">ISO 27001 Data Centers</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Our databases are hosted on tier-1 cloud providers meeting ISO 27001, SOC 2 Type
                  II, and PCI-DSS compliance.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-surface border border-brand-150/60 dark:border-brand-900/10 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex gap-4 items-start">
              <div className="p-3 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 shrink-0">
                <RefreshCw className="size-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Hourly Data Sync</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Redundant servers and automated hourly databases snapshot prevent data loss under
                  critical failures.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Content Area */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Table of Contents (Sticky on Desktop) */}
          <div className="lg:w-1/4 shrink-0">
            <div className="sticky top-24 space-y-4">
              <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider px-3">
                Security Index
              </h2>
              <nav className="flex flex-col gap-1">
                {SECTIONS.map((sec) => {
                  const Icon = sec.icon;
                  const isActive = activeSection === sec.id;
                  return (
                    <button
                      type="button"
                      key={sec.id}
                      onClick={() => scrollToSection(sec.id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs font-medium transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{sec.label}</span>
                      {isActive && <ChevronRight className="size-3.5 ml-auto shrink-0" />}
                    </button>
                  );
                })}
              </nav>

              <Separator className="my-6" />

              <div className="bg-brand-50/50 dark:bg-brand-950/10 border border-brand-100 dark:border-brand-900/10 p-4 rounded-xl">
                <h3 className="text-xs font-bold text-foreground">Security incident?</h3>
                <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
                  Report a potential vulnerability or request a security compliance document packet.
                </p>
                <Button asChild size="sm" className="w-full mt-3 text-xs gap-1.5">
                  <Link href="mailto:security@myworkspace.io">
                    <Mail className="size-3.5" />
                    Report Bug
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Policy Text Columns */}
          <div className="flex-1 min-w-0">
            <div className="prose prose-brand dark:prose-invert max-w-none space-y-12">
              {/* Security Framework */}
              <section id="framework" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5 border-b pb-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    <ShieldCheck className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold m-0 text-foreground">1. Security Framework</h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  At MyWorkSpace, security is integrated into our entire development lifecycle
                  (SDLC) and operations. We construct our applications following OWASP top-10
                  defensive strategies, perform continuous code linting, and enforce automated
                  testing prior to production deployments.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Our system architecture is designed around multi-tenant isolation, ensuring that
                  database connections, memory storage caches, and drawing assets remain entirely
                  isolated within organizational bounds.
                </p>
              </section>

              {/* Cloud Infrastructure */}
              <section id="infrastructure" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5 border-b pb-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    <Server className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold m-0 text-foreground">2. Cloud Infrastructure</h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  MyWorkSpace resources are hosted within secured VPC networks across tier-1
                  providers (primarily AWS and MongoDB Atlas cloud).
                </p>
                <ul className="list-disc list-inside space-y-2 text-xs text-muted-foreground pl-2 leading-relaxed">
                  <li>
                    <strong>Physical Safeguards:</strong> Hosting datacenters employ continuous
                    surveillance, bio-metrics check gates, and hardware tracking.
                  </li>
                  <li>
                    <strong>DDoS Defenses:</strong> Cloudflare and Next.js CDN shields inspect
                    incoming HTTP payloads to block network layer floods.
                  </li>
                  <li>
                    <strong>Container Security:</strong> Application runtime nodes are decoupled
                    using containerized systems, isolating dependencies from host systems.
                  </li>
                </ul>
              </section>

              {/* Data Encryption */}
              <section id="data-encryption" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5 border-b pb-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    <Lock className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold m-0 text-foreground">3. Data Encryption</h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We verify that no information leaves our network boundary without encryption:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-brand-100 dark:border-brand-900/10 bg-card">
                    <span className="text-xs font-semibold text-foreground block">
                      Data in Transit
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                      All connection requests use TLS 1.3 protocols. This includes communication
                      between your browser and our edge servers, and internal API connections inside
                      the cluster network.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-brand-100 dark:border-brand-900/10 bg-card">
                    <span className="text-xs font-semibold text-foreground block">
                      Data at Rest
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                      Databases, files, CAD drawings, invoices, and logs are encrypted using keys
                      managed by AWS KMS using AES-256 standards.
                    </p>
                  </div>
                </div>
              </section>

              {/* Account Access Controls */}
              <section id="access-controls" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5 border-b pb-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    <Key className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold m-0 text-foreground">
                    4. Account Access Controls
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We provide several configurations to manage authentication access:
                </p>
                <ul className="list-disc list-inside space-y-2 text-xs text-muted-foreground pl-2 leading-relaxed">
                  <li>
                    <strong>OTP Verification:</strong> Account creation requires an email-based One
                    Time Password validation.
                  </li>
                  <li>
                    <strong>OAuth SSO Integration:</strong> Authenticate securely using Google or
                    GitHub OAuth protocols, avoiding password caching.
                  </li>
                  <li>
                    <strong>Role-Based Settings:</strong> Scoped authorization policies ensure that
                    only project managers or admins can view invoicing indices or add contractors.
                  </li>
                </ul>
              </section>

              {/* Threat Monitoring */}
              <section id="monitoring" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5 border-b pb-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    <Activity className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold m-0 text-foreground">5. Threat Monitoring</h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Our system coordinates with Sentry, Cloudwatch, and internal audit files to
                  capture activity metrics.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Internal systems record query patterns and alert engineers under anomalies (e.g.
                  rapid series of failed logins, bulk downloads of drawing logs, or requests
                  targeted outside organizational scopes).
                </p>
              </section>

              {/* Backups & Disaster Recovery */}
              <section id="backups" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5 border-b pb-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    <Database className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold m-0 text-foreground">
                    6. Backups & Disaster Recovery
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We verify that data remains highly available. MongoDB and file attachments are
                  backed up daily, with secondary replica sets spread across different geographic
                  availability zones to prevent complete server blackouts.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Disaster recovery drills are executed twice a year to ensure restore time
                  objective (RTO) remains under 4 hours, and restore point objective (RPO) under 24
                  hours.
                </p>
              </section>

              {/* Vulnerability Reporting */}
              <section id="reporting" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5 border-b pb-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    <Terminal className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold m-0 text-foreground">
                    7. Vulnerability Reporting
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We welcome reports from independent researchers to help maintain our security. If
                  you discover a vulnerability, please reach out to us at:
                </p>
                <div className="p-4 rounded-xl border border-primary/15 bg-primary/5 space-y-2">
                  <p className="text-xs text-foreground font-semibold">Security Response Desk</p>
                  <p className="text-xs text-muted-foreground">
                    Email:{" "}
                    <a
                      href="mailto:security@myworkspace.io"
                      className="text-primary hover:underline"
                    >
                      security@myworkspace.io
                    </a>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    We pledge to acknowledge reports within 48 hours and work with you to fix
                    vulnerabilities under a responsible disclosure policy.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
