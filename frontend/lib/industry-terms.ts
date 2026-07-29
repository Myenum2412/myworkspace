export type Industry = "construction" | "healthcare";

export type TermKey =
  | "app.name"
  | "nav.dashboard"
  | "nav.overview"
  | "nav.employees"
  | "nav.projects"
  | "nav.clients"
  | "nav.approvals"
  | "nav.timeTracker"
  | "nav.fileManager"
  | "nav.billing"
  | "nav.engagement"
  | "nav.inventory"
  | "nav.reworks"
  | "nav.reports"
  | "nav.settings"
  | "nav.photography"
  | "nav.addons"
  | "nav.tasks"
  | "nav.time"
  | "nav.team"
  | "nav.invoices"
  | "nav.members"
  | "nav.audit"
  | "nav.security"
  | "nav.plans"
  | "nav.organization"
  | "page.dashboard.title"
  | "page.dashboard.totalTasks"
  | "page.dashboard.inProgress"
  | "page.dashboard.overdue"
  | "page.dashboard.today"
  | "page.dashboard.pendingApproval"
  | "page.dashboard.projects"
  | "page.dashboard.upcomingDeadlines"
  | "page.dashboard.topProgressProjects"
  | "page.dashboard.activeProjects"
  | "page.dashboard.teamMembers"
  | "page.dashboard.recentClients"
  | "page.dashboard.pendingPayments"
  | "page.dashboard.newTask"
  | "page.dashboard.searchPlaceholder"
  | "page.projects.title"
  | "page.projects.allProjects"
  | "page.projects.searchPlaceholder"
  | "page.projects.newProject"
  | "page.projects.contractors"
  | "page.projects.statsTotal"
  | "page.projects.statsTotalSub"
  | "page.projects.statsCompleted"
  | "page.projects.statsCompletedSub"
  | "page.projects.statsAvgProgress"
  | "page.projects.statsAvgProgressSub"
  | "page.projects.statsInProgressSub"
  | "page.projects.statsOverdueSub"
  | "common.completed"
  | "common.sno"
  | "common.color"
  | "common.priority"
  | "common.category"
  | "common.description"
  | "common.deadline"
  | "common.tracked"
  | "common.progress"
  | "common.access"
  | "page.projects.columnClient"
  | "page.clients.title"
  | "page.clients.addClient"
  | "page.clients.searchPlaceholder"
  | "page.clients.addCustomer"
  | "page.clients.editClient"
  | "page.employees.title"
  | "page.employees.addEmployee"
  | "page.settings.title"
  | "page.settings.description"
  | "page.settings.workspaceIndustry"
  | "page.settings.workspaceIndustryDesc"
  | "common.save"
  | "common.cancel"
  | "common.delete"
  | "common.edit"
  | "common.view"
  | "common.search"
  | "common.name"
  | "common.email"
  | "common.status"
  | "common.actions"
  | "common.active"
  | "common.inactive"
  | "common.loading"
  | "common.noResults"
  | "notif.category.projects"
  | "notif.category.tasks"
  | "notif.category.files"
  | "notif.category.approvals"
  | "notif.category.employees"
  | "notif.category.clients"
  | "notif.category.billing"
  | "nav.staffList"
  | "nav.staffTasks"
  | "nav.staffTimesheet"
  | "nav.staffUpcomingTasks"
  | "nav.staffTimeOff"
  | "nav.staffPerformance"
  | "nav.staffActivity"
  | "nav.staffSettings"
  | "nav.staffAdd"
  | "nav.clientFiles"
  | "nav.clientBills"
  | "page.staffs.title"
  | "page.staffs.list"
  | "page.staffs.tasks"
  | "page.staffs.timesheet"
  | "page.staffs.upcomingTasks"
  | "page.staffs.activity"
  | "page.staffs.reworks"
  | "page.staffs.settings"
  | "page.staffs.addStaff"
  | "page.staffs.timeOff"
  | "page.staffs.performance"
  | "page.staffs.goals"
  | "page.client.dashboard"
  | "page.client.bills"
  | "page.client.recentFiles";

const terms: Record<Industry, Record<TermKey, string>> = {
  construction: {
    "app.name": "My WorkSpace",
    "nav.dashboard": "Dashboard",
    "nav.overview": "Assign Tasks",
    "nav.employees": "Employees",
    "nav.projects": "Projects",
    "nav.clients": "Clients",
    "nav.approvals": "Approvals",
    "nav.timeTracker": "Time Tracker",
    "nav.fileManager": "File Manager",
    "nav.billing": "Billing",
    "nav.engagement": "Interaction Followups",
    "nav.inventory": "Inventory",
    "nav.reworks": "Reworks",
    "nav.reports": "Reports",
    "nav.settings": "Settings",
    "nav.photography": "Photography",
    "nav.addons": "Addons",
    "nav.tasks": "Tasks",
    "nav.time": "Time",
    "nav.team": "Team",
    "nav.invoices": "Invoices",
    "nav.members": "Members",
    "nav.audit": "Audit Logs",
    "nav.security": "Security",
    "nav.plans": "Plans",
    "nav.organization": "Organization",
    "page.dashboard.title": "Dashboard Overview",
    "page.dashboard.totalTasks": "Total Tasks",
    "page.dashboard.inProgress": "In Progress",
    "page.dashboard.overdue": "Overdue",
    "page.dashboard.today": "Today",
    "page.dashboard.pendingApproval": "Pending Approval",
    "page.dashboard.projects": "Projects",
    "page.dashboard.upcomingDeadlines": "Upcoming Deadlines",
    "page.dashboard.topProgressProjects": "Top Progress Projects",
    "page.dashboard.activeProjects": "Active Projects",
    "page.dashboard.teamMembers": "Team Members",
    "page.dashboard.recentClients": "Recent Clients",
    "page.dashboard.pendingPayments": "Pending Payments",
    "page.dashboard.newTask": "New Task",
    "page.dashboard.searchPlaceholder": "Search tasks, projects...",
    "page.projects.title": "Projects",
    "page.projects.allProjects": "All Projects",
    "page.projects.searchPlaceholder": "Search projects...",
    "page.projects.newProject": "New Project",
    "page.projects.contractors": "Contractors",
    "page.projects.statsTotal": "Total Projects",
    "page.projects.statsTotalSub": "All projects",
    "page.projects.statsCompleted": "Completed",
    "page.projects.statsCompletedSub": "100% done",
    "page.projects.statsAvgProgress": "Avg Progress",
    "page.projects.statsAvgProgressSub": "Overall progress",
    "page.projects.statsInProgressSub": "Partially done",
    "page.projects.statsOverdueSub": "Past deadline",
    "common.completed": "Completed",
    "common.sno": "S.No",
    "common.color": "Color",
    "common.priority": "Priority",
    "common.category": "Category",
    "common.description": "Description",
    "common.deadline": "Deadline",
    "common.tracked": "Tracked",
    "common.progress": "Progress",
    "common.access": "Access",
    "page.projects.columnClient": "Client",
    "page.clients.title": "Clients",
    "page.clients.addClient": "Add Client",
    "page.clients.searchPlaceholder": "Search clients...",
    "page.clients.addCustomer": "Add New Customer",
    "page.clients.editClient": "Edit Client",
    "page.employees.title": "Employees",
    "page.employees.addEmployee": "Add Employee",
    "page.settings.title": "Settings",
    "page.settings.description": "Manage your account, billing, and team settings.",
    "page.settings.workspaceIndustry": "Workspace Industry",
    "page.settings.workspaceIndustryDesc": "Select the industry for your workspace. This customizes the terminology used across the application.",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.view": "View",
    "common.search": "Search",
    "common.name": "Name",
    "common.email": "Email",
    "common.status": "Status",
    "common.actions": "Actions",
    "common.active": "Active",
    "common.inactive": "Inactive",
    "common.loading": "Loading...",
    "common.noResults": "No results found.",
    "notif.category.projects": "Projects",
    "notif.category.tasks": "Tasks",
    "notif.category.files": "Files",
    "notif.category.approvals": "Approvals",
    "notif.category.employees": "HR & Employees",
    "notif.category.clients": "Clients",
    "notif.category.billing": "Billing",
    "nav.staffList": "Staff List",
    "nav.staffTasks": "My Tasks",
    "nav.staffTimesheet": "Time Sheet",
    "nav.staffUpcomingTasks": "Upcoming Tasks",
    "nav.staffTimeOff": "Time Off",
    "nav.staffPerformance": "Performance",
    "nav.staffActivity": "Activity",
    "nav.staffSettings": "Staff Settings",
    "nav.staffAdd": "Add Staff",
    "nav.clientFiles": "File Management",
    "nav.clientBills": "Bills",
    "page.staffs.title": "Staff",
    "page.staffs.list": "Staff List",
    "page.staffs.tasks": "My Tasks",
    "page.staffs.timesheet": "Weekly Timesheet",
    "page.staffs.upcomingTasks": "Upcoming Tasks",
    "page.staffs.activity": "Activity",
    "page.staffs.reworks": "Reworks",
    "page.staffs.settings": "Staff Settings",
    "page.staffs.addStaff": "Add Staff",
    "page.staffs.timeOff": "Time Off",
    "page.staffs.performance": "Performance",
    "page.staffs.goals": "Goals",
    "page.client.dashboard": "Client Portal",
    "page.client.bills": "Bills",
    "page.client.recentFiles": "Recent Files",
  },
  healthcare: {
    "app.name": "MediCare Hub",
    "nav.dashboard": "Dashboard",
    "nav.overview": "Assign Tasks",
    "nav.employees": "Doctors & Staff",
    "nav.projects": "Patients",
    "nav.clients": "Patient Details",
    "nav.approvals": "Approvals",
    "nav.timeTracker": "Time Tracker",
    "nav.fileManager": "Medical Records",
    "nav.billing": "Billing",
    "nav.engagement": "Followups",
    "nav.inventory": "Pharmacy",
    "nav.reworks": "Reworks",
    "nav.reports": "Reports",
    "nav.settings": "Settings",
    "nav.photography": "Imaging",
    "nav.addons": "Addons",
    "nav.tasks": "Appointments",
    "nav.time": "Schedule",
    "nav.team": "Departments",
    "nav.invoices": "Invoices",
    "nav.members": "Members",
    "nav.audit": "Audit Logs",
    "nav.security": "Security",
    "nav.plans": "Plans",
    "nav.organization": "Organization",
    "page.dashboard.title": "Clinical Overview",
    "page.dashboard.totalTasks": "Total Appointments",
    "page.dashboard.inProgress": "In Consultation",
    "page.dashboard.overdue": "Overdue",
    "page.dashboard.today": "Today",
    "page.dashboard.pendingApproval": "Pending Approval",
    "page.dashboard.projects": "Departments",
    "page.dashboard.upcomingDeadlines": "Upcoming Appointments",
    "page.dashboard.topProgressProjects": "Top Departments",
    "page.dashboard.activeProjects": "Active Departments",
    "page.dashboard.teamMembers": "Medical Staff",
    "page.dashboard.recentClients": "Recent Patients",
    "page.dashboard.pendingPayments": "Pending Payments",
    "page.dashboard.newTask": "New Appointment",
    "page.dashboard.searchPlaceholder": "Search patients, appointments...",
    "page.projects.title": "Patients",
    "page.projects.allProjects": "All Patients",
    "page.projects.searchPlaceholder": "Search patients...",
    "page.projects.newProject": "New Patient",
    "page.projects.contractors": "Specialists",
    "page.projects.statsTotal": "Total Patients",
    "page.projects.statsTotalSub": "All patients",
    "page.projects.statsCompleted": "Discharged",
    "page.projects.statsCompletedSub": "Recovered",
    "page.projects.statsAvgProgress": "Avg Recovery",
    "page.projects.statsAvgProgressSub": "Overall progress",
    "page.projects.statsInProgressSub": "Undergoing treatment",
    "page.projects.statsOverdueSub": "Requires attention",
    "common.completed": "Completed",
    "common.sno": "S.No",
    "common.color": "Color",
    "common.priority": "Priority",
    "common.category": "Category",
    "common.description": "Description",
    "common.deadline": "Deadline",
    "common.tracked": "Tracked",
    "common.progress": "Progress",
    "common.access": "Access",
    "page.projects.columnClient": "Patient",
    "page.clients.title": "Patient Details",
    "page.clients.addClient": "Add Patient",
    "page.clients.searchPlaceholder": "Search patients...",
    "page.clients.addCustomer": "Add New Patient",
    "page.clients.editClient": "Edit Patient",
    "page.employees.title": "Doctors & Staff",
    "page.employees.addEmployee": "Add Staff",
    "page.settings.title": "Settings",
    "page.settings.description": "Manage your account, billing, and clinical settings.",
    "page.settings.workspaceIndustry": "Workspace Industry",
    "page.settings.workspaceIndustryDesc": "Select the industry for your workspace. This customizes the terminology used across the application.",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.view": "View",
    "common.search": "Search",
    "common.name": "Name",
    "common.email": "Email",
    "common.status": "Status",
    "common.actions": "Actions",
    "common.active": "Active",
    "common.inactive": "Inactive",
    "common.loading": "Loading...",
    "common.noResults": "No results found.",
    "notif.category.projects": "Departments",
    "notif.category.tasks": "Appointments",
    "notif.category.files": "Medical Records",
    "notif.category.approvals": "Approvals",
    "notif.category.employees": "HR & Staff",
    "notif.category.clients": "Patients",
    "notif.category.billing": "Billing",
    "nav.staffList": "Staff Roster",
    "nav.staffTasks": "My Appointments",
    "nav.staffTimesheet": "Schedule",
    "nav.staffUpcomingTasks": "Upcoming Appointments",
    "nav.staffTimeOff": "Leave",
    "nav.staffPerformance": "Clinical Performance",
    "nav.staffActivity": "Activity Log",
    "nav.staffSettings": "Staff Settings",
    "nav.staffAdd": "Add Staff",
    "nav.clientFiles": "Medical Records",
    "nav.clientBills": "Invoices",
    "page.staffs.title": "Staff Dashboard",
    "page.staffs.list": "Staff Roster",
    "page.staffs.tasks": "My Appointments",
    "page.staffs.timesheet": "Weekly Schedule",
    "page.staffs.upcomingTasks": "Upcoming Appointments",
    "page.staffs.activity": "Activity Log",
    "page.staffs.reworks": "Revisions",
    "page.staffs.settings": "Staff Settings",
    "page.staffs.addStaff": "Add Staff",
    "page.staffs.timeOff": "Leave",
    "page.staffs.performance": "Clinical Performance",
    "page.staffs.goals": "Clinical Goals",
    "page.client.dashboard": "Patient Portal",
    "page.client.bills": "Invoices",
    "page.client.recentFiles": "Recent Records",
  },
};

export const INDUSTRIES: { value: Industry; label: string }[] = [
  { value: "construction", label: "Construction" },
  { value: "healthcare", label: "Doctor/Healthcare" },
];

export const DEFAULT_INDUSTRY: Industry = "construction";

export function getTerms(industry: Industry): Record<TermKey, string> {
  return terms[industry] || terms[DEFAULT_INDUSTRY];
}

const tCache = new Map<string, Record<TermKey, string>>();

export function t(industry: Industry, key: TermKey): string {
  const lang = getTerms(industry);
  return lang[key] || terms[DEFAULT_INDUSTRY][key] || key;
}

export function createT(industry: Industry): (key: TermKey) => string {
  return (key: TermKey) => t(industry, key);
}
