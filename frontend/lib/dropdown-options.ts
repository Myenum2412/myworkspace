export const DEFAULT_DROPDOWN_OPTIONS = {
  projects: ["Internal", "Client", "Open Source", "Research", "Maintenance"],
  departments: ["Engineering", "Marketing", "Sales", "HR", "Finance", "Operations", "Design", "Support"],
  locations: ["New York", "San Francisco", "London", "Berlin", "Tokyo", "Bangalore", "Remote"],
  designations: ["Software Engineer", "Senior Engineer", "Lead Engineer", "Manager", "Director", "VP", "Associate", "Intern"],
  employmentTypes: ["Full-time", "Part-time", "Contract", "Intern", "Freelance"],
  statuses: ["Active", "Inactive", "Probation"],
  branches: ["Main", "North", "South", "East", "West", "Downtown"],
  shifts: ["Morning", "Afternoon", "Night", "Flexible", "Rotational"],
  sourceOfHires: ["LinkedIn", "Indeed", "Referral", "Company Website", "Agency", "Campus", "Walk-in"],
  countries: ["United States", "Canada", "United Kingdom", "Germany", "India", "Japan", "Australia", "France"],
};

const STORAGE_KEY = "myworkspace_dropdown_options";

export function getDropdownOptions(): Record<string, string[]> {
  if (typeof window === "undefined") return DEFAULT_DROPDOWN_OPTIONS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_DROPDOWN_OPTIONS, ...JSON.parse(stored) };
    }
  } catch {}
  return DEFAULT_DROPDOWN_OPTIONS;
}

export function saveDropdownOptions(options: Record<string, string[]>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
}
