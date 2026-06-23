import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white pt-32 pb-20 sm:pt-40 sm:pb-28">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-brand-200/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-brand-300/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-1.5 text-sm font-medium text-brand-600 shadow-xs">
            <span className="h-2 w-2 rounded-full bg-brand-500" />
            Now in Public Beta
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-brand-900 sm:text-5xl lg:text-6xl">
            Transform How Your
            <span className="text-brand-500"> Team Ships</span>
          </h1>

          <p className="mt-6 text-lg leading-8 text-brand-600 sm:text-xl">
            The modern workspace that brings your projects, tasks, and team
            collaboration into one seamless experience.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg" asChild className="h-12 px-8 text-base font-medium shadow-md hover:shadow-lg transition-all duration-200">
              <Link href="/signup">
                Start Free Trial
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base font-medium">
              <a href="#features">Learn More</a>
            </Button>
          </div>

          <div className="mt-16 flex items-center justify-center gap-8 text-sm text-brand-400">
            <span>No credit card required</span>
            <span className="h-4 w-px bg-brand-200" />
            <span>Free 14-day trial</span>
            <span className="h-4 w-px bg-brand-200" />
            <span>Cancel anytime</span>
          </div>
        </div>
      </div>
    </section>
  );
}
