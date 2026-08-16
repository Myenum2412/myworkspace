"use client";

import {
  CheckCircle,
  ChevronRight,
  Database,
  Eye,
  FileText,
  Globe,
  Heart,
  Lock,
  Mail,
  Shield,
  UserCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const SECTIONS = [
  { id: "introduction", label: "1. Introduction", icon: Shield },
  { id: "collect", label: "2. Information We Collect", icon: Eye },
  { id: "use", label: "3. How We Use Information", icon: Globe },
  { id: "sharing", label: "4. Sharing & Disclosure", icon: FileText },
  { id: "security", label: "5. Data Security", icon: Lock },
  { id: "rights", label: "6. Your Rights & Choices", icon: Heart },
  { id: "cookies", label: "7. Cookies & Tracking", icon: CheckCircle },
  { id: "contact", label: "8. Contact Us", icon: Mail },
];

export function PrivacyContent() {
  const [activeSection, setActiveSection] = useState("introduction");

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

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
              <Shield className="size-3.5" />
              Privacy Center
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl max-w-3xl leading-none">
              Privacy Policy
            </h1>
            <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
              We believe in transparency, security, and giving you control over your personal data.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs font-medium text-muted-foreground">
              <span>Last updated: August 16, 2026</span>
              <span className="hidden sm:inline">•</span>
              <span>Version 2.4.0</span>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-surface border border-brand-150/60 dark:border-brand-900/10 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex gap-4 items-start">
              <div className="p-3 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 shrink-0">
                <Shield className="size-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">We Don't Sell Data</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Your information is yours. We never trade, license, or sell your personal details
                  or telemetry to third-party brokers.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-surface border border-brand-150/60 dark:border-brand-900/10 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex gap-4 items-start">
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                <Lock className="size-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Secure by Design</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  All connection states and data payloads are protected using modern TLS encryption
                  both in transit and at rest.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-surface border border-brand-150/60 dark:border-brand-900/10 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex gap-4 items-start">
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                <UserCheck className="size-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Compliance First</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Designed to align with modern international regulatory frameworks including GDPR,
                  CCPA, and regional IT regulations.
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
                On This Page
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
                <h3 className="text-xs font-bold text-foreground">Need help?</h3>
                <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
                  Our privacy team is available to assist you with any questions or requests.
                </p>
                <Button asChild size="sm" className="w-full mt-3 text-xs gap-1.5">
                  <Link href="mailto:privacy@myworkspace.io">
                    <Mail className="size-3.5" />
                    Contact Team
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Policy Text Columns */}
          <div className="flex-1 min-w-0">
            <div className="prose prose-brand dark:prose-invert max-w-none space-y-12">
              {/* Introduction */}
              <section id="introduction" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5 border-b pb-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    <Shield className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground m-0">1. Introduction</h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Welcome to MyWorkSpace. We respect your privacy and are committed to protecting
                  the integrity of any Personal Data you share with us. This Privacy Policy
                  describes how we collect, process, secure, and share your personal information
                  across our website, SaaS platform, and related integrations.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  By registering for an account, accessing our tools, or using our rebar detailing
                  and collaborative project management workflows, you agree to the collection and
                  handling of your data in accordance with the rules detailed herein. This policy
                  applies to all visitors, registered users, and organizations utilizing our cloud
                  services.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Our operations are built around a core tenant:{" "}
                  <strong>
                    you retain sole custody and ownership over the business assets you upload
                  </strong>
                  . Our access is strictly restricted to automated parsing and hosting functions
                  required to deliver the features of the platform.
                </p>
              </section>

              {/* Information We Collect */}
              <section id="collect" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5 border-b pb-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    <Eye className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground m-0">
                    2. Information We Collect
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We gather several kinds of information from our workspace administrators,
                  employees, and authorized clients.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  <div className="p-4 rounded-xl border border-brand-100 dark:border-brand-900/10 bg-card">
                    <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-primary" />
                      Direct Information
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                      Includes contact registration credentials (full name, official email,
                      telephone numbers, business/company addresses), authorized profile details,
                      and billing coordinates.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-brand-100 dark:border-brand-900/10 bg-card">
                    <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-primary" />
                      Usage & Analytics Data
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                      Includes telemetry about page interactions, navigation routes, timestamps,
                      connection indicators (IP addresses), operating system profiles, and browser
                      client characteristics.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-brand-100 dark:border-brand-900/10 bg-card">
                    <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-primary" />
                      Workspace Attachments
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                      Files, drawings, rebar layout specifications, schedules, team chat histories,
                      and related assets uploaded directly to the platform storage buckets.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-brand-100 dark:border-brand-900/10 bg-card">
                    <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-primary" />
                      Integration Details
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                      Authentication tokens from Google, GitHub, or LinkedIn if you choose to sign
                      up or authenticate through single sign-on (SSO) protocols.
                    </p>
                  </div>
                </div>

                <div className="mt-4 border rounded-lg overflow-hidden bg-card text-xs">
                  <div className="p-3 bg-muted font-semibold text-foreground border-b">
                    Specific Data Fields & Purpose
                  </div>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/30 text-left">
                        <th className="p-2 font-medium">Category</th>
                        <th className="p-2 font-medium">Fields Collected</th>
                        <th className="p-2 font-medium">Retention Period</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-muted-foreground">
                      <tr>
                        <td className="p-2 font-medium text-foreground">Identity Data</td>
                        <td className="p-2">
                          Name, official email, phone numbers, designation, avatar photo
                        </td>
                        <td className="p-2">Active account duration + 30 days</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium text-foreground">Business Profiles</td>
                        <td className="p-2">
                          Company name, Tax certificates, Registration proofs, currency, timezone
                        </td>
                        <td className="p-2">
                          Active account duration + 3 years (legal requirement)
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium text-foreground">Drawing Assets</td>
                        <td className="p-2">
                          CAD/PDF files, detailing specs, rebar schedules, and revision parameters
                        </td>
                        <td className="p-2">Until deleted by workspace admins</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium text-foreground">Usage Telemetry</td>
                        <td className="p-2">
                          IP address, browser cookies, error stack logs, navigation durations
                        </td>
                        <td className="p-2">90 Days, aggregated afterwards</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* How We Use Information */}
              <section id="use" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5 border-b pb-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    <Globe className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground m-0">
                    3. How We Use Information
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We process the gathered information to operate our business activities, ensure
                  system safety, and enhance the overall platform performance. Specifically, we use
                  your data to:
                </p>
                <ul className="list-disc list-inside space-y-2.5 text-xs text-muted-foreground pl-2 leading-relaxed">
                  <li>
                    <strong>Workspace Provisioning:</strong> Initializing database instances,
                    separating enterprise metadata, and compiling project timelines.
                  </li>
                  <li>
                    <strong>Real-time Communication:</strong> Operating chat protocols, audio/video
                    channels (WebRTC signaling), and system push-notifications.
                  </li>
                  <li>
                    <strong>Financial Operations:</strong> Constructing invoices, recording
                    payments, tracking unpaid balances, and processing taxes through secure payment
                    gateways.
                  </li>
                  <li>
                    <strong>Application Diagnostics:</strong> Aggregating crash logs to eliminate
                    bugs, optimizing database query speeds, and reducing layout loading cycles.
                  </li>
                  <li>
                    <strong>Access Protection:</strong> Validating two-factor codes, tracking
                    sign-in locations to intercept hijacking attempts, and running fraud analysis.
                  </li>
                  <li>
                    <strong>Compliance & Rights:</strong> Fulfilling accounting demands, tax
                    reporting, and defending corporate legal standings during audits.
                  </li>
                </ul>
              </section>

              {/* Sharing & Disclosure */}
              <section id="sharing" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5 border-b pb-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    <FileText className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground m-0">4. Sharing & Disclosure</h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We limit the dissemination of your personal coordinates and workspace assets.
                  Information is only disclosed under the following controlled circumstances:
                </p>

                <div className="space-y-3">
                  <div className="p-3 rounded-lg border border-neutral-100 dark:border-neutral-900 bg-muted/40">
                    <span className="text-xs font-semibold text-foreground block">
                      With Your Organization
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Members added to your corporate workspace can view basic profile data, shared
                      assignments, files, and chat responses. Administrator nodes can inspect
                      activity metrics.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border border-neutral-100 dark:border-neutral-900 bg-muted/40">
                    <span className="text-xs font-semibold text-foreground block">
                      Trusted Infrastructure Vendors (Subprocessors)
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      We share data with infrastructure partners (e.g., database hosts, email
                      senders, authentication systems, cloud storage providers) to keep the
                      application running. These vendors are bound by strict non-disclosure
                      obligations.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border border-neutral-100 dark:border-neutral-900 bg-muted/40">
                    <span className="text-xs font-semibold text-foreground block">
                      Legal Demands
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      If forced by legal authorities, subpoenas, or to defend MyWorkSpace rights
                      against litigation and security threats.
                    </p>
                  </div>
                </div>

                <div className="mt-4 border rounded-lg overflow-hidden bg-card text-xs">
                  <div className="p-3 bg-muted font-semibold text-foreground border-b">
                    Approved Platform Subprocessors
                  </div>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/30 text-left">
                        <th className="p-2 font-medium">Entity</th>
                        <th className="p-2 font-medium">Core Function</th>
                        <th className="p-2 font-medium">Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-muted-foreground">
                      <tr>
                        <td className="p-2 font-medium text-foreground">Vercel Inc.</td>
                        <td className="p-2">Frontend Hosting & Serverless Edge Functions</td>
                        <td className="p-2">United States</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium text-foreground">MongoDB Atlas</td>
                        <td className="p-2">Cloud Database Clusters & File Index storage</td>
                        <td className="p-2">India (Mumbai)</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium text-foreground">Resend / AWS SES</td>
                        <td className="p-2">Email Transaction pipelines & OTP codes delivery</td>
                        <td className="p-2">United States</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium text-foreground">Sentry.io</td>
                        <td className="p-2">Telemetry crash analytics and error tracking</td>
                        <td className="p-2">United States</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Data Security */}
              <section id="security" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5 border-b pb-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    <Lock className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground m-0">5. Data Security</h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We employ enterprise-grade safeguards to protect the security of your files and
                  profile details.
                </p>

                <div className="p-4 rounded-xl border border-brand-100/50 bg-gradient-to-r from-brand-50/50 to-white dark:from-brand-950/10 dark:to-background">
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-2 mb-3">
                    <Database className="size-4 text-primary" />
                    How we safeguard your database assets:
                  </h4>
                  <ul className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                    <li className="flex items-start gap-2.5">
                      <span className="text-green-500 font-bold mt-0.5">✓</span>
                      <span>
                        <strong>TLS 1.3 / AES-256 Encryption:</strong> All data is encrypted in
                        transit using industry-standard protocols, and database backups are securely
                        encrypted at rest.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-green-500 font-bold mt-0.5">✓</span>
                      <span>
                        <strong>Multi-Tenant Isolation:</strong> Virtual application layers ensure
                        that no organization can run queries outside its scoped sandbox database
                        environment.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-green-500 font-bold mt-0.5">✓</span>
                      <span>
                        <strong>Network Level Firewalls:</strong> Access is restricted behind
                        restricted security groups and VPC configurations. Only whitelisted
                        application nodes can query database stores.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-green-500 font-bold mt-0.5">✓</span>
                      <span>
                        <strong>Automated Vulnerability Scanning:</strong> Code dependencies are
                        regularly audited for security CVEs to prevent library exploits.
                      </span>
                    </li>
                  </ul>
                </div>
              </section>

              {/* Your Rights & Choices */}
              <section id="rights" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5 border-b pb-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    <Heart className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground m-0">
                    6. Your Rights & Choices
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Depending on your physical location and jurisdictions, you possess certain
                  statutory controls over your personal data:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 border rounded-lg bg-card">
                    <strong className="text-foreground">Access & Export (GDPR Art. 15)</strong>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      You may request a copy of all stored personal records in a machine-readable
                      format.
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg bg-card">
                    <strong className="text-foreground">Correction (GDPR Art. 16)</strong>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      You can modify designation details, company coordinates, and profile settings
                      inside the settings dashboard.
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg bg-card">
                    <strong className="text-foreground">Erasure / Right to be Forgotten</strong>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Request a complete purge of your account index, file folders, and email
                      databases.
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg bg-card">
                    <strong className="text-foreground">Consent Withdrawal</strong>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Opt-out of promotional alerts or customize cookies tracking tags.
                    </p>
                  </div>
                </div>
              </section>

              {/* Cookies & Tracking */}
              <section id="cookies" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5 border-b pb-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    <CheckCircle className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground m-0">7. Cookies & Tracking</h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  MyWorkSpace utilizes cookies to preserve sign-in states, remember workflow
                  configurations, and run analytics. You can adjust your consent choices at any time
                  through our interactive Preferences Center.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 items-center bg-muted/30 p-4 rounded-lg border">
                  <p className="text-[11px] text-muted-foreground flex-1 m-0">
                    To manage your cookie consents, consent settings, or inspect individual session
                    variables, open our Cookie settings.
                  </p>
                  <Button asChild size="sm" variant="outline" className="text-xs shrink-0">
                    <Link href="/privacy/cookies">Adjust Preferences</Link>
                  </Button>
                </div>
              </section>

              {/* Contact Us */}
              <section id="contact" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5 border-b pb-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    <Mail className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground m-0">8. Contact Us</h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  If you have queries, concerns regarding this Privacy Policy, or want to file an
                  official access request, do not hesitate to contact our data officer:
                </p>
                <div className="p-4 rounded-xl border border-primary/10 bg-primary/5 space-y-1.5">
                  <p className="text-xs text-foreground font-semibold">
                    MyWorkSpace Security & Privacy Group
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Email:{" "}
                    <a
                      href="mailto:privacy@myworkspace.io"
                      className="text-primary hover:underline"
                    >
                      privacy@myworkspace.io
                    </a>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Secondary backup:{" "}
                    <a
                      href="mailto:support@myworkspace.io"
                      className="text-primary hover:underline"
                    >
                      support@myworkspace.io
                    </a>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Address: Bangalore, Karnataka, India
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
