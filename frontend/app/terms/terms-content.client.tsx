"use client";

import {
  AlertTriangle,
  Briefcase,
  ChevronRight,
  CornerDownRight,
  CreditCard,
  FileText,
  Gavel,
  Mail,
  Percent,
  Scale,
  ShieldCheck,
  UserCheck,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const SECTIONS = [
  { id: "acceptance", label: "1. Acceptance of Terms", icon: ShieldCheck },
  { id: "description", label: "2. Description of Service", icon: Briefcase },
  { id: "accounts", label: "3. Registration & Security", icon: UserCheck },
  { id: "acceptable-use", label: "4. Acceptable Use Policy", icon: Zap },
  { id: "intellectual-property", label: "5. Intellectual Property", icon: FileText },
  { id: "billing", label: "6. Subscriptions & Payments", icon: CreditCard },
  { id: "sla", label: "7. SLA & Uptime Guarantees", icon: Percent },
  { id: "liability", label: "8. Limitation of Liability", icon: AlertTriangle },
  { id: "governing-law", label: "9. Governing Law", icon: Gavel },
  { id: "contact", label: "10. Contact Information", icon: Mail },
];

export function TermsContent() {
  const [activeSection, setActiveSection] = useState("acceptance");

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
              <Scale className="size-3.5" />
              Legal Agreements
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl max-w-3xl leading-none">
              Terms & Conditions
            </h1>
            <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
              Please read these terms carefully before accessing or using the MyWorkSpace
              collaborative environment.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs font-medium text-muted-foreground">
              <span>Last updated: August 16, 2026</span>
              <span className="hidden sm:inline">•</span>
              <span>Version 1.8.0</span>
            </div>
          </div>
        </div>
      </section>

      {/* Core Highlights Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-surface border border-brand-150/60 dark:border-brand-900/10 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex gap-4 items-start">
              <div className="p-3 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0">
                <FileText className="size-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">You Own Your Data</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  All drawings, rebar schedules, calculations, and chats you create on MyWorkSpace
                  remain strictly your intellectual property.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-surface border border-brand-150/60 dark:border-brand-900/10 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex gap-4 items-start">
              <div className="p-3 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 shrink-0">
                <Percent className="size-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">99.9% Uptime Target</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  We guarantee a reliable platform availability for our Enterprise tiers, backed by
                  service credit reimbursements.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-surface border border-brand-150/60 dark:border-brand-900/10 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex gap-4 items-start">
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                <CreditCard className="size-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Fair Billing</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  No hidden fees. Modify, upgrade, or cancel your subscription tiers directly from
                  the workspace settings dashboard.
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
                Agreement Outline
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
                <h3 className="text-xs font-bold text-foreground">Need legal clarity?</h3>
                <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
                  For corporate integrations, custom SLA needs, or regulatory questions, reach our
                  billing and legal desks.
                </p>
                <Button asChild size="sm" className="w-full mt-3 text-xs gap-1.5">
                  <Link href="mailto:support@myworkspace.io">
                    <Mail className="size-3.5" />
                    Contact Billing
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Policy Text Columns */}
          <div className="flex-1 min-w-0">
            <div className="prose prose-brand dark:prose-invert max-w-none space-y-12">
              {/* Acceptance of Terms */}
              <section id="acceptance" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5 border-b pb-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    <ShieldCheck className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground m-0">1. Acceptance of Terms</h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  By executing our sign-up workflows, maintaining a paid subscription, or browsing
                  MyWorkSpace services, you agree to be bound by these Terms and Conditions. This
                  agreement represents a legally binding contract between you (representing yourself
                  individually or as an authorized representative of a business entity) and
                  MyWorkSpace.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  If you disagree with any segment of these clauses, you must immediately close the
                  application and refrain from configuring workspaces or uploading documents. Your
                  continued use of the platform constitutes implicit consent to our practices.
                </p>
              </section>

              {/* Description of Service */}
              <section id="description" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5 border-b pb-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    <Briefcase className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground m-0">
                    2. Description of Service
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  MyWorkSpace is a comprehensive SaaS solution providing reinforcement detailing
                  layouts, structural concrete scheduling, document sharing directories, internal
                  chat environments, timesheets, and invoicing automation dashboards.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We constantly update our code. We reserve the rights to release hotfixes, modify
                  API boundaries, deprecate specific widgets, or re-structure navigation systems at
                  our sole discretion to sustain optimal cloud integrity. These changes may occur
                  without prior notification, though we endeavor to announce significant changes via
                  our updates page.
                </p>
              </section>

              {/* Account Registration & Security */}
              <section id="accounts" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5 border-b pb-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    <UserCheck className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground m-0">
                    3. Registration & Security
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  To open a workspace, you must provide functional registration details. You agree
                  to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-xs text-muted-foreground pl-2 leading-relaxed">
                  <li>Input correct email credentials and keep company information current.</li>
                  <li>
                    Maintain strict confidentiality of session keys, passwords, and API tokens.
                  </li>
                  <li>
                    Notify us immediately of any recognized network breaches or session hijackings.
                  </li>
                  <li>Verify official credentials using our designated OTP channels.</li>
                </ul>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We are not responsible for any losses arising from unauthorized operations carried
                  out under your credential profile prior to your formal report.
                </p>
              </section>

              {/* Acceptable Use Policy */}
              <section id="acceptable-use" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5 border-b pb-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    <Zap className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground m-0">
                    4. Acceptable Use Policy
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You are prohibited from abusing the computational infrastructure of MyWorkSpace.
                  Prohibited activities include:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  <div className="p-4 rounded-xl border border-destructive/10 bg-destructive/5">
                    <h4 className="text-xs font-semibold text-destructive flex items-center gap-2">
                      System Intrusion
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                      Probing vulnerabilities, launching DDoS streams, injecting malicious scripts
                      (viruses, trojans), or overriding authentication mechanisms.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-destructive/10 bg-destructive/5">
                    <h4 className="text-xs font-semibold text-destructive flex items-center gap-2">
                      Abusive Automation
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                      Scraping user indices, extracting contact rosters, or using automated script
                      triggers to overwhelm task-creation servers.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-muted/40 rounded-lg border text-xs text-muted-foreground">
                  <div className="font-semibold text-foreground flex items-center gap-1.5 mb-1">
                    <CornerDownRight className="size-3.5 text-primary" />
                    License Revocation
                  </div>
                  Failure to adhere to this Acceptable Use Policy constitutes a material breach of
                  contract and will result in immediate cancellation of your user credentials and
                  workspace locks without refund.
                </div>
              </section>

              {/* Intellectual Property */}
              <section id="intellectual-property" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5 border-b pb-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    <FileText className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground m-0">
                    5. Intellectual Property
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We respect the rights of creators and expect our users to do the same.
                </p>
                <div className="p-4 rounded-xl border border-brand-100 dark:border-brand-900/10 bg-card">
                  <span className="text-xs font-bold text-foreground">Your Content Ownership</span>
                  <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                    You hold complete copyright over your CAD file uploads, reinforcement details,
                    schedules, chat logs, contractor listings, and client metadata. By uploading
                    assets, you grant us a limited, worldwide license solely to render, parse,
                    index, backup, and serve the information within your workspace context.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-brand-100 dark:border-brand-900/10 bg-card">
                  <span className="text-xs font-bold text-foreground">Our Brand Integrity</span>
                  <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                    The software framework, database schemas, visual styles, micro-animations, logo
                    icons, and page code are the proprietary intellectual assets of MyWorkSpace and
                    its licensors. You may not reverse-engineer, clone, copy, or redistribute our
                    code structures.
                  </p>
                </div>
              </section>

              {/* Subscriptions & Payments */}
              <section id="billing" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5 border-b pb-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    <CreditCard className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground m-0">
                    6. Subscriptions & Payments
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Access to MyWorkSpace is provided via monthly or annual billing periods.
                </p>
                <ul className="list-disc list-inside space-y-2 text-xs text-muted-foreground pl-2 leading-relaxed">
                  <li>
                    <strong>Taxes:</strong> All subscription rates exclude local service taxes (such
                    as GST or VAT) unless explicitly listed during checkout.
                  </li>
                  <li>
                    <strong>Automatic Renewal:</strong> Plans renew automatically at the end of each
                    billing cycle unless you opt-out prior to the renewal timestamp.
                  </li>
                  <li>
                    <strong>Downgrades & Cancellations:</strong> Downgrading plans may result in
                    reduction of storage space or access parameters. We do not provide prorated
                    refunds for partial cycles.
                  </li>
                  <li>
                    <strong>Failed Payments:</strong> In the event of a payment failure, we grant a
                    7-day grace period. Afterwards, the workspace will transition to read-only mode,
                    and eventually face suspension.
                  </li>
                </ul>
              </section>

              {/* SLA & Uptime Guarantees */}
              <section id="sla" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5 border-b pb-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    <Percent className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground m-0">
                    7. SLA & Uptime Guarantees
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  For our paid corporate clients, MyWorkSpace targets a 99.9% uptime rate.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Our uptime target excludes pre-announced system maintenance windows, localized
                  network blockages, or DNS lookup interruptions outside of our hosting partners'
                  cloud perimeter. If we drop below our guarantee in any billing cycle, clients are
                  eligible to request service credits based on the schedule below:
                </p>
                <div className="mt-2 border rounded-lg overflow-hidden bg-card text-xs">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/30 text-left">
                        <th className="p-2 font-medium">Monthly Uptime Percentage</th>
                        <th className="p-2 font-medium">Service Credit Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-muted-foreground">
                      <tr>
                        <td className="p-2 font-medium text-foreground">
                          &lt; 99.9% but &ge; 99.0%
                        </td>
                        <td className="p-2">10% of monthly subscription fee</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium text-foreground">
                          &lt; 99.0% but &ge; 95.0%
                        </td>
                        <td className="p-2">25% of monthly subscription fee</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium text-foreground">&lt; 95.0%</td>
                        <td className="p-2">50% of monthly subscription fee</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Limitation of Liability */}
              <section id="liability" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5 border-b pb-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    <AlertTriangle className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground m-0">
                    8. Limitation of Liability
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  To the maximum extent permitted by law, MyWorkSpace and its developer teams shall
                  not be held liable for any indirect, incident-related, special, punitive, or
                  consequential damages. This includes data losses, design inaccuracies in rebar
                  detailing, billing errors, or network downtime.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Our cumulative aggregate liability for all claims arising out of this agreement
                  shall never exceed the absolute subscription fees paid by you to MyWorkSpace
                  during the immediate three (3) months prior to the incident.
                </p>
              </section>

              {/* Governing Law */}
              <section id="governing-law" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5 border-b pb-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    <Gavel className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground m-0">9. Governing Law</h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  These terms shall be governed, interpreted, and enforced in accordance with the
                  laws of India, without regard to conflict of law principles. Any dispute arising
                  from these clauses will be subject to exclusive arbitration and courts situated in
                  Bangalore, Karnataka, India.
                </p>
              </section>

              {/* Contact Information */}
              <section id="contact" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5 border-b pb-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    <Mail className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground m-0">10. Contact Information</h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  If you have queries, request legal clarifications, or want to discuss enterprise
                  arrangements, contact our support division:
                </p>
                <div className="p-4 rounded-xl border border-primary/10 bg-primary/5 space-y-1.5">
                  <p className="text-xs text-foreground font-semibold">
                    MyWorkSpace Legal & Customer Relations
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Email:{" "}
                    <a
                      href="mailto:support@myworkspace.io"
                      className="text-primary hover:underline"
                    >
                      support@myworkspace.io
                    </a>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Support Hours: Monday - Friday, 9:00 AM - 6:00 PM IST
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
