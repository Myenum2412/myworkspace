type CreateEmployeeInput = {
  empId?: string;
  firstName: string;
  lastName?: string;
  email: string;
  avatar?: string;
  password?: string;
  department?: string | null;
  phone?: string | null;
  roleName?: string | null;
  branchName?: string | null;
  employmentType?: string | null;
  status?: string;
  sourceOfHire?: string | null;
  workExperience?: any[];
  educationDetails?: any[];
  dependentDetails?: any[];
  currentExperience?: string | null;
  totalExperience?: string | null;
  alternateEmail?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zipCode?: string | null;
  linkedin?: string | null;
  github?: string | null;
  twitter?: string | null;
  website?: string | null;
};

async function createEmployee(data: CreateEmployeeInput): Promise<Record<string, unknown>> {
  const res = await fetch("/api/employees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to create employee" }));
    throw new Error(err.error || "Failed to create employee");
  }

  return res.json();
}

async function getAllEmployees(): Promise<Array<Record<string, unknown>>> {
  const res = await fetch("/api/employees", { credentials: "include" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || data || [];
}

export const employeeService = { createEmployee, getAllEmployees };
