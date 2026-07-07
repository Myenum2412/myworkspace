import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, LayoutDashboard } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white pt-32 pb-20 sm:pt-40 sm:pb-28 safe-paddings">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-brand-200/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-brand-300/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div className="text-center md:text-left">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-1.5 text-sm font-medium text-brand-600 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-brand-500" />
              Now in Public Beta
            </div>

            <h1 className="heading-responsive text-brand-900 md:text-5xl lg:text-6xl font-bold">
              Transform How Your
              <span className="text-brand-500"> Team Ships</span>
            </h1>

            <p className="mt-6 text-responsive leading-8 text-brand-600 sm:text-lg">
              The modern workspace that brings your projects, tasks, and team
              collaboration into one seamless experience.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 md:justify-start">
              <Button size="lg" asChild className="w-full sm:w-auto h-12 px-8 text-base font-medium shadow-md hover:shadow-lg transition-all duration-200 touch-target">
                <Link href="/signup">
                  Start Free Trial
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="w-full sm:w-auto h-12 px-8 text-base font-medium touch-target">
                <a href="#features">Learn More</a>
              </Button>
            </div>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-brand-400 md:justify-start">
              <span>No credit card required</span>
              <span className="hidden sm:inline h-4 w-px bg-brand-200" />
              <span>Free 14-day trial</span>
              <span className="hidden sm:inline h-4 w-px bg-brand-200" />
              <span>Cancel anytime</span>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="relative h-64 w-full max-w-md sm:h-72 md:h-80">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-300 to-brand-600 shadow-2xl" />
              <div className="absolute inset-0 flex items-center justify-center">
                <LayoutDashboard className="h-16 w-16 text-white/80 md:h-20 md:w-20" />
              </div>
              <div className="absolute -top-4 -right-4 h-24 w-24 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">98%</span>
              </div>
              <div className="absolute -bottom-4 -left-4 h-20 w-20 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <span className="text-xs font-medium text-white text-center leading-tight px-1">5k+<br/>teams</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
