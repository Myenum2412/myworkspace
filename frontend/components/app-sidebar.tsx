import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  LayoutDashboardIcon,
  ListChecksIcon,
  UsersIcon,
  WorkflowIcon,
  ClockIcon,
  FolderIcon,
  Settings2Icon,
  StoreIcon,
} from "lucide-react";

export const defaultNavData = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon className="size-6" />,
      isActive: true,
      items: [
        { title: "Overview", url: "/dashboard" },
        { title: "Reports", url: "/reports" },
      ],
    },
    {
      title: "Task Allocation",
      url: "/overview",
      icon: <ListChecksIcon className="size-6" />,
      items: [
        { title: "All Tasks", url: "/alltasks" },
        { title: "My Tasks", url: "/mytasks" },
        { title: "Saved Tasks", url: "/savedtasks" },
        { title: "Upcoming Tasks", url: "/upcomingtasks" },
      ],
    },
    {
      title: "Employees",
      url: "/employees",
      icon: <UsersIcon className="size-6" />,
      items: [
        { title: "All Employees", url: "/employees" },
        { title: "Add Employee", url: "/addemployees" },
        { title: "Terminated", url: "/terminated" },
        { title: "Departments", url: "/departments" },
      ],
    },
    {
      title: "Projects",
      url: "/projects",
      icon: <WorkflowIcon className="size-6" />,
      items: [
        { title: "All Projects", url: "/projects" },
        { title: "Add Project", url: "/addprojects" },
        { title: "Clients", url: "/clients" },
        { title: "Add Client", url: "/addclients" },
      ],
    },
    {
      title: "Time Tracker",
      url: "/time-tracker",
      icon: <ClockIcon className="size-6" />,
      items: [
        { title: "My Time", url: "/my-time" },
        { title: "Team Time", url: "/team-time" },
        { title: "Time Reports", url: "/time-reports" },
        { title: "Calendar", url: "/calendar" },
      ],
    },
    {
      title: "File Manager",
      url: "/files",
      icon: <FolderIcon className="size-6" />,
      items: [
        { title: "All Files", url: "/files" },
        { title: "Upload File", url: "/upload" },
        { title: "Shared with Me", url: "/shared" },
        { title: "Recycle Bin", url: "/recycle-bin" },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: <Settings2Icon className="size-6" />,
      items: [
        { title: "General", url: "#" },
        { title: "Team", url: "#" },
        { title: "Billing", url: "#" },
        { title: "Limits", url: "#" },
      ],
    },
  ],
  appStore: [
    { name: "Browse Apps", url: "/appstore", icon: <StoreIcon className="size-6" /> },
  ],
};

export interface AppSidebarData {
  navMain: typeof defaultNavData.navMain;
  appStore: typeof defaultNavData.appStore;
}

interface NavUserData {
  name: string;
  email: string;
  avatar: string;
}

export function AppSidebar({
  user,
  data = defaultNavData,
  ...props
}: React.ComponentProps<typeof Sidebar> & { data?: AppSidebarData; user: NavUserData }) {

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-20 border-b justify-center">
        <div className="flex items-center gap-2 px-1 group-data-[collapsible=icon]:justify-center">
          <img
            src="/logo.jpeg"
            alt="MyWorkSpace Logo"
            className="size-8 rounded-lg object-cover shadow-sm shrink-0"
          />
          <h1 className="text-lg font-bold truncate group-data-[collapsible=icon]:hidden">
            My WorkSpace
          </h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain.slice(0, -1)} label="Platform" />
        <NavProjects projects={data.appStore} />
        <NavMain items={data.navMain.slice(-1)} label="Settings" className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
