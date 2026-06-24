type CreateEmployeeInput = {
  empId?: string;
  firstName: string;
  lastName?: string;
  nickname?: string | null;
  email: string;
  avatar?: string;
  password?: string;
  department?: string | null;
  designation?: string | null;
  location?: string | null;
  phone?: string | null;
  roleName?: string | null;
  branchName?: string | null;
  shift?: string | null;
  employmentType?: string | null;
  status?: string;
  sourceOfHire?: string | null;
  joiningDate?: string | null;
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
  files?: string[];
};

type UpdateEmployeeInput = Partial<CreateEmployeeInput> & { id: string };

async function apiFetch<T>(url: string, options: RequestInit): Promise<T> {
  const { method = "GET", body } = options;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let errorMessage: string;
    try {
      const errBody = await res.json();
      errorMessage = errBody.error || errBody.message || `HTTP ${res.status}`;
    } catch {
      errorMessage = `HTTP ${res.status}: ${res.statusText}`;
    }
    console.error(`[API ${method} ${url}] Failed with status ${res.status}: ${errorMessage}`);
    throw new Error(errorMessage);
  }

  return res.json();
}

async function createEmployee(data: CreateEmployeeInput): Promise<Record<string, unknown>> {
  console.log(`[API POST /api/employees] Creating employee: ${data.firstName} ${data.lastName} <${data.email}>`);
  return apiFetch("/api/employees", { method: "POST", body: JSON.stringify(data) });
}

async function updateEmployee(data: UpdateEmployeeInput): Promise<Record<string, unknown>> {
  console.log(`[API PUT /api/employees/${data.id}] Updating employee: ${data.firstName} ${data.lastName}`);
  return apiFetch(`/api/employees/${data.id}`, { method: "PUT", body: JSON.stringify(data) });
}

async function getAllEmployees(): Promise<Array<Record<string, unknown>>> {
  const res = await fetch("/api/employees", { credentials: "include" });
  if (!res.ok) {
    console.warn(`[API GET /api/employees] Failed with status ${res.status}`);
    return [];
  }
  const data = await res.json();
  return data.data || data || [];
}

export const employeeService = { createEmployee, updateEmployee, getAllEmployees };
