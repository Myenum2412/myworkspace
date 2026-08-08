"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { type Tour, TourProvider, useTour } from "@/components/ui/tour";
import { completeTourAction } from "@/lib/actions/tour";

const TOUR_STORAGE_KEY = "product_tour_completed";

const tours: Tour[] = [
  {
    id: "welcome-tour",
    steps: [
      {
        id: "step-dashboard",
        title: "Welcome to MyWorkspace",
        content:
          "Let us walk you through the key areas of your new workspace. You will visit the main sections — Dashboard, Staff, Clients, Projects, and more.",
        side: "bottom",
        sideOffset: 8,
        align: "center",
      },
      {
        id: "step-stats",
        title: "Dashboard Overview",
        content:
          "Your dashboard shows key metrics at a glance — total tasks, overdue items, pending approvals, and team activity.",
        side: "top",
        sideOffset: 8,
        align: "center",
        nextRoute: "/employees",
      },
      {
        id: "step-employees",
        title: "Employee Management",
        content:
          "Manage your team members here. Add new employees, assign roles, organize into teams, and track their status.",
        side: "bottom",
        sideOffset: 8,
        align: "center",
        nextRoute: "/staffs",
      },
      {
        id: "step-staffs",
        title: "Staff Overview",
        content:
          "Get a high-level view of your staff — employee count, teams, and quick access to individual profiles.",
        side: "bottom",
        sideOffset: 8,
        align: "center",
        nextRoute: "/staffs/list",
      },
      {
        id: "step-staffs-list",
        title: "Staff Directory",
        content:
          "Browse the full staff directory. View profiles, contact info, roles, and access detailed records for each team member.",
        side: "bottom",
        sideOffset: 8,
        align: "center",
        nextRoute: "/projects",
      },
      {
        id: "step-projects",
        title: "Projects & Clients",
        content:
          "Track all your projects in one place. Monitor progress, deadlines, budgets, and client relationships side by side.",
        side: "bottom",
        sideOffset: 8,
        align: "center",
        nextRoute: "/clients",
      },
      {
        id: "step-clients",
        title: "Client Management",
        content:
          "Manage your client base — add new clients, track communications, view history, and manage engagements.",
        side: "bottom",
        sideOffset: 8,
        align: "center",
        nextRoute: "/time-tracker",
      },
      {
        id: "step-time-tracker",
        title: "Time Tracking",
        content:
          "Log and monitor time spent on tasks and projects. View reports, approve timesheets, and track billable hours.",
        side: "top",
        sideOffset: 8,
        align: "center",
        nextRoute: "/files",
      },
      {
        id: "step-files",
        title: "File Manager",
        content:
          "Store, organize, and share files with your team. Supports folders, version history, previews, and secure sharing.",
        side: "bottom",
        sideOffset: 8,
        align: "center",
        nextRoute: "/billing",
      },
      {
        id: "step-billing",
        title: "Billing & Invoices",
        content:
          "Handle all financial operations — create invoices, manage subscriptions, track payments, and generate receipts.",
        side: "bottom",
        sideOffset: 8,
        align: "center",
        nextRoute: "/settings",
      },
      {
        id: "step-settings",
        title: "Workspace Settings",
        content:
          "Configure your workspace preferences — profile, team settings, notifications, integrations, and security options.",
        side: "bottom",
        sideOffset: 8,
        align: "center",
        nextRoute: "/orgmenu",
      },
      {
        id: "step-orgmenu",
        title: "Organization Admin",
        content:
          "This is your organization control panel. Manage members, roles, security, audit logs, plans, and overall org settings.",
        side: "bottom",
        sideOffset: 8,
        align: "center",
      },
    ],
  },
];

function TourAutoStarter() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { start } = useTour();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!session?.user) return;
    if (pathname !== "/dashboard") return;

    const tourCompleted = session.user.tourCompleted;

    if (tourCompleted === true || tourCompleted === undefined) return;
    if (startedRef.current) return;

    if (typeof window !== "undefined") {
      localStorage.removeItem(TOUR_STORAGE_KEY);
    }

    startedRef.current = true;
    const timer = setTimeout(() => {
      start("welcome-tour");
    }, 500);
    return () => clearTimeout(timer);
  }, [session?.user?.id, session?.user?.tourCompleted, pathname, start]);

  return null;
}

function TourFinishHandler() {
  const finishInFlight = useRef(false);

  const handleFinish = async () => {
    if (finishInFlight.current) return;
    finishInFlight.current = true;
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    await completeTourAction();
  };

  return handleFinish;
}

export function ProductTourProvider({ children }: { children: React.ReactNode }) {
  const handleFinish = TourFinishHandler();

  return (
    <TourProvider tours={tours} onFinish={handleFinish}>
      <TourAutoStarter />
      {children}
    </TourProvider>
  );
}
