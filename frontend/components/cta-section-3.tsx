import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BookOpen, PlayCircle, Rocket, Sparkles } from "@/lib/icons";

export default function CtaSection3() {
  return (
    <section className="py-8 lg:py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div>
          <Card className="bg-white overflow-hidden border border-neutral-100 py-8 lg:py-12 shadow-xs">
            <CardContent className="gap-0 px-6 lg:px-12">
              <div className="grid gap-12 lg:grid-cols-2">
                {/* Left Content */}
                <div className="flex flex-col justify-center">
                  <div className="flex flex-col gap-6">
                    <Badge
                      variant="default"
                      className="h-auto px-2.5 py-0.5 font-semibold bg-primary rounded-md text-primary-foreground w-fit"
                    >
                      <Rocket className="me-2 size-3" />
                      Get Started Free
                    </Badge>

                    <div className="flex flex-col gap-4">
                      <h2 className="text-3xl font-bold tracking-tight text-balance lg:text-4xl text-neutral-900">
                        Ready to streamline your workspace?
                      </h2>
                      <p className="text-neutral-500 lg:text-lg">
                        Join thousands of teams using MyWorkspace to manage projects, collaborate in
                        real-time, and deliver results faster.
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button size="lg" className="h-10 cursor-pointer px-8" asChild>
                        <a href="/signup">
                          <Sparkles />
                          Start Free Trial
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        className="h-10 cursor-pointer px-8"
                        asChild
                      >
                        <a href="/features">Explore Features</a>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Right Content */}
                <div className="flex flex-col gap-6">
                  <Card className="group bg-white border border-neutral-100 cursor-pointer gap-2 py-6 hover:border-blue-500/30 transition-colors shadow-xs">
                    <CardHeader className="px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 flex size-10 items-center justify-center rounded-lg">
                            <BookOpen className="text-primary size-5" />
                          </div>
                          <CardTitle className="text-base text-balance text-neutral-900">
                            Documentation
                          </CardTitle>
                        </div>
                        <ArrowRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </CardHeader>
                    <CardContent className="px-6">
                      <p className="text-neutral-500 text-sm">
                        Complete guides, API references, and best practices to get you started.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="group bg-white border border-neutral-100 cursor-pointer gap-2 py-6 hover:border-blue-500/30 transition-colors shadow-xs">
                    <CardHeader className="px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 flex size-10 items-center justify-center rounded-lg">
                            <PlayCircle className="text-primary size-5" />
                          </div>
                          <CardTitle className="text-base text-balance text-neutral-900">
                            Video Tutorials
                          </CardTitle>
                        </div>
                        <ArrowRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </CardHeader>
                    <CardContent className="px-6">
                      <p className="text-neutral-500 text-sm">
                        Step-by-step video guides to help you master the platform quickly.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
