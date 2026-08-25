import { Headphones, RefreshCw, Shield, Zap } from "@/lib/icons";
import { cn } from "@/lib/utils";

interface FeatureItem {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const features: FeatureItem[] = [
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "Role-based access control, audit logs, and encrypted storage keep your business data safe and compliant.",
  },
  {
    icon: Zap,
    title: "Fast Performance",
    description:
      "Lightning-fast load times and real-time updates ensure your team stays productive without waiting.",
  },
  {
    icon: RefreshCw,
    title: "Seamless Sync",
    description:
      "Real-time synchronization across devices and team members keeps everyone on the same page.",
  },
  {
    icon: Headphones,
    title: "Dedicated Support",
    description:
      "Our expert support team is available around the clock to help you get the most out of MyWorkspace.",
  },
];

interface Feature2Props extends React.HTMLAttributes<HTMLElement> {
  className?: string;
}

export default function Feature2({ className, ...props }: Feature2Props) {
  return (
    <section
      className={cn("mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8", className)}
      {...props}
    >
      <div>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-10">
            <header className="flex flex-col gap-4">
              <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
                Why MyWorkspace
              </h2>
              <p className="text-muted-foreground text-base text-pretty md:text-lg">
                Purpose-built for modern teams to collaborate, manage projects, and scale operations
                seamlessly.
              </p>
            </header>

            <div className="grid gap-6 sm:grid-cols-2 sm:gap-8">
              {features.map(({ icon: Icon, title, description }) => (
                <div key={title} className="group flex flex-col items-start gap-3 rounded-lg">
                  <div className="bg-secondary text-secondary-foreground inline-flex size-10 items-center justify-center rounded-full">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-foreground text-base font-semibold md:text-lg">{title}</h3>
                    <p className="text-muted-foreground text-sm text-balance">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="bg-muted relative z-10 overflow-hidden rounded-lg shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="aspect-[4/3] w-full">
                <img
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1740&auto=format&fit=crop"
                  alt="Team collaborating in a modern workspace"
                  className="size-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
