export interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  rate: number;
  unit: string;
  status: string;
  created: string;
}

export const defaultServices: Service[] = [
  { id: "1", name: "Website Development", description: "Custom website design and development", category: "Development", rate: 5000, unit: "Project", status: "Active", created: "2026-01-15" },
  { id: "2", name: "Mobile App Development", description: "iOS and Android app development", category: "Development", rate: 8000, unit: "Project", status: "Active", created: "2026-01-20" },
  { id: "3", name: "UI/UX Design", description: "User interface and experience design", category: "Design", rate: 3000, unit: "Project", status: "Active", created: "2026-02-01" },
  { id: "4", name: "Consulting", description: "Technical consulting per hour", category: "Consulting", rate: 150, unit: "Hour", status: "Active", created: "2026-02-10" },
  { id: "5", name: "Maintenance", description: "Monthly maintenance and support", category: "Support", rate: 500, unit: "Month", status: "Active", created: "2026-03-01" },
  { id: "6", name: "SEO Optimization", description: "Search engine optimization services", category: "Marketing", rate: 1200, unit: "Month", status: "Inactive", created: "2026-03-15" },
];
