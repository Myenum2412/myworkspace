import { HeroFinancial } from "@/components/landing/hero-financial";
import { FeaturePlatform } from "@/components/feature-platform";
import Feature2 from "@/components/feature-2";
import CtaSection3 from "@/components/cta-section-3";
import { CircularCarousel, type CarouselItem } from "@/components/circular-carousel/circular-carousel";

const CAROUSEL_ITEMS: CarouselItem[] = [
  {
    id: "1",
    title: "Granular Permissions",
    description: "Manage custom roles, team invitations, and full audit logs.",
    tag: "Security",
  },
  {
    id: "2",
    title: "Real-time Chat",
    description: "Communicate instantly with your team using audio & video calls.",
    tag: "Collaboration",
  },
  {
    id: "3",
    title: "Interactive Invoices",
    description: "Create, track, and send invoices with automated reminders.",
    tag: "Billing",
  },
  {
    id: "4",
    title: "Smart Task Boards",
    description: "Organize tasks, define timelines, and track work progress.",
    tag: "Productivity",
  },
  {
    id: "5",
    title: "Shared Cloud Storage",
    description: "Upload, preview, and organize files in secure folders.",
    tag: "Files",
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <HeroFinancial />
      <FeaturePlatform />
      <Feature2 />
      <section className="w-full py-16 bg-gradient-to-b from-white to-blue-50/40 text-neutral-900 flex flex-col items-center overflow-hidden border-t border-neutral-100/50">
        <div className="max-w-4xl text-center mb-8 px-4">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">Platform in Motion</h2>
          <p className="mt-3 text-neutral-500 max-w-xl mx-auto">
            Discover the key features built directly into our collaborative environment.
          </p>
        </div>
        <CircularCarousel items={CAROUSEL_ITEMS} />
      </section>
      <CtaSection3 />
    </main>
  );
}

