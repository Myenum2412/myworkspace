import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import { LayoutDashboard, Users, Clock, BarChart3, Shield } from "lucide-react";

const features = [
  {
    icon: LayoutDashboard,
    title: "Project Dashboards",
    description: "Get a bird's-eye view of all your projects with real-time progress tracking and customizable boards.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Work together seamlessly with shared workspaces, comments, and instant notifications across your entire team.",
  },
  {
    icon: Clock,
    title: "Time Tracking",
    description: "Track hours effortlessly with built-in timers, timesheets, and detailed reports to keep every project on budget.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description: "Make data-driven decisions with comprehensive analytics, workload reports, and performance insights.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Keep your data safe with role-based access control, audit logs, and SOC 2 compliant infrastructure.",
  },
  {
    icon: NotificationsActiveIcon,
    title: "Smart Notifications",
    description: "Stay in the loop with intelligent alerts for deadlines, mentions, and project updates across all devices.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-28 safe-paddings">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="heading-responsive text-brand-900 font-bold">
            Everything you need to ship faster
          </h2>
          <p className="mt-4 text-responsive text-brand-600">
            Powerful features designed to streamline your workflow and help your team accomplish more.
          </p>
        </div>

        <div className="mt-16 grid responsive-gap sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative rounded-sm border border-brand-200/60 bg-white p-6 transition-all duration-200 hover:border-brand-300 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-brand-50 transition-colors group-hover:bg-brand-100">
                <feature.icon className="size-6 text-brand-600" />
              </div>
              <h3 className="mt-5 text-base font-semibold text-brand-900 sm:text-lg">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
