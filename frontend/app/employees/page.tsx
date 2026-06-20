import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import EmployeesPageClient from "./page-client";

export const metadata = { title: "Employees Overview" };

type EmployeeInfo = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  department: string;
  designation: string;
  employmentType: string;
  phone: string;
  branchName: string;
  joiningDate: string;
  avatar: string;
  displayId?: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  location?: string;
  shift?: string;
  sourceOfHire?: string;
  currentExperience?: string;
  totalExperience?: string;
  alternateEmail?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  linkedin?: string;
  github?: string;
  twitter?: string;
  website?: string;
  workExperience?: Array<{ id: string; company?: string; title?: string; from?: string; to?: string; description?: string; relevant?: boolean }>;
  educationDetails?: Array<{ id: string; institute?: string; degree?: string; specialization?: string; completionDate?: string }>;
  dependentDetails?: Array<{ id: string; name?: string; relationship?: string; dob?: string }>;
};

export default async function EmployeesPage() {
  const session = await auth();
  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "",
  };

  let employees: EmployeeInfo[] = [];

  const FAKE_EMPLOYEES: EmployeeInfo[] = [
    { id: "emp_1", name: "Alice Chen", email: "alice@company.com", role: "admin", status: "online", department: "Engineering", designation: "Senior Developer", employmentType: "Full-time", phone: "+1-555-0101", branchName: "San Francisco", joiningDate: "2023-06-01T00:00:00Z", avatar: "", displayId: "EMP001", firstName: "Alice", lastName: "Chen", nickname: "Ali", location: "San Francisco", shift: "Morning", sourceOfHire: "LinkedIn", currentExperience: "3 years", totalExperience: "8 years", alternateEmail: "alice.personal@email.com", address: "123 Market St", city: "San Francisco", state: "CA", country: "USA", zipCode: "94105", linkedin: "https://linkedin.com/in/alicechen", github: "https://github.com/alicechen", twitter: "@alice_chen", website: "https://alicechen.dev", workExperience: [{ id: "we1", company: "TechCo", title: "Full Stack Developer", from: "2020-01", to: "2023-05", description: "Built and maintained web applications using React and Node.js", relevant: true }, { id: "we2", company: "StartupX", title: "Junior Developer", from: "2018-03", to: "2019-12", description: "Frontend development with Vue.js" }], educationDetails: [{ id: "ed1", institute: "MIT", degree: "B.Sc. Computer Science", specialization: "Software Engineering", completionDate: "2018-05" }], dependentDetails: [{ id: "dep1", name: "Tom Chen", relationship: "Spouse", dob: "1990-08-15" }] },
    { id: "emp_2", name: "Marcus Lee", email: "marcus@company.com", role: "member", status: "online", department: "Design", designation: "Lead Designer", employmentType: "Full-time", phone: "+1-555-0102", branchName: "New York", joiningDate: "2023-08-15T00:00:00Z", avatar: "", displayId: "EMP002", firstName: "Marcus", lastName: "Lee", nickname: "Marc", location: "New York", shift: "Morning", sourceOfHire: "Referral", currentExperience: "5 years", totalExperience: "10 years", alternateEmail: "marcus.design@email.com", address: "456 Broadway", city: "New York", state: "NY", country: "USA", zipCode: "10013", linkedin: "https://linkedin.com/in/marcuslee", github: "https://github.com/marcuslee", twitter: "@marcus_design", workExperience: [{ id: "we1", company: "DesignHub", title: "UX Designer", from: "2019-06", to: "2023-07", description: "Led UX design for enterprise SaaS products", relevant: true }], educationDetails: [{ id: "ed1", institute: "RISD", degree: "BFA Graphic Design", specialization: "UI/UX", completionDate: "2016-05" }], dependentDetails: [] },
    { id: "emp_3", name: "Sarah Kim", email: "sarah@company.com", role: "member", status: "away", department: "Marketing", designation: "Marketing Manager", employmentType: "Full-time", phone: "+1-555-0103", branchName: "Chicago", joiningDate: "2024-01-10T00:00:00Z", avatar: "", displayId: "EMP003", firstName: "Sarah", lastName: "Kim", nickname: "Sar", location: "Chicago", shift: "Afternoon", sourceOfHire: "Company Website", currentExperience: "2 years", totalExperience: "6 years", alternateEmail: "sarah.kim@personal.com", address: "789 Michigan Ave", city: "Chicago", state: "IL", country: "USA", zipCode: "60611", linkedin: "https://linkedin.com/in/sarahkim", twitter: "@sarah_mktg", workExperience: [{ id: "we1", company: "MarketPro", title: "Marketing Specialist", from: "2021-03", to: "2023-12", description: "Managed digital marketing campaigns and SEO strategy", relevant: true }], educationDetails: [{ id: "ed1", institute: "Northwestern", degree: "MBA Marketing", specialization: "Digital Marketing", completionDate: "2020-06" }], dependentDetails: [{ id: "dep1", name: "Leo Kim", relationship: "Child", dob: "2022-04-10" }] },
    { id: "emp_4", name: "James Wilson", email: "james@company.com", role: "member", status: "offline", department: "Sales", designation: "Account Executive", employmentType: "Contract", phone: "+1-555-0104", branchName: "Remote", joiningDate: "2024-03-22T00:00:00Z", avatar: "", displayId: "EMP004", firstName: "James", lastName: "Wilson", nickname: "Jay", location: "Remote", shift: "Flexible", sourceOfHire: "LinkedIn", currentExperience: "1 year", totalExperience: "4 years", alternateEmail: "james.w@outlook.com", address: "100 Remote Lane", city: "Austin", state: "TX", country: "USA", zipCode: "73301", linkedin: "https://linkedin.com/in/jameswilson", workExperience: [{ id: "we1", company: "SalesForce Inc", title: "Sales Associate", from: "2022-01", to: "2024-02", description: "B2B sales for enterprise CRM solutions", relevant: true }], educationDetails: [{ id: "ed1", institute: "UT Austin", degree: "BBA Marketing", specialization: "Sales Management", completionDate: "2021-05" }], dependentDetails: [] },
    { id: "emp_5", name: "Priya Patel", email: "priya@company.com", role: "member", status: "online", department: "Engineering", designation: "QA Engineer", employmentType: "Full-time", phone: "+1-555-0105", branchName: "San Francisco", joiningDate: "2024-05-05T00:00:00Z", avatar: "", displayId: "EMP005", firstName: "Priya", lastName: "Patel", nickname: "Pri", location: "San Francisco", shift: "Morning", sourceOfHire: "Referral", currentExperience: "2 years", totalExperience: "5 years", alternateEmail: "priya.p@email.com", address: "200 Oak Ave", city: "San Francisco", state: "CA", country: "USA", zipCode: "94102", linkedin: "https://linkedin.com/in/priyapatel", github: "https://github.com/priyapatel", workExperience: [{ id: "we1", company: "TestLab", title: "QA Analyst", from: "2021-06", to: "2024-04", description: "Automated and manual testing of web applications", relevant: true }], educationDetails: [{ id: "ed1", institute: "UC Berkeley", degree: "M.S. Computer Science", specialization: "Software Testing", completionDate: "2021-05" }], dependentDetails: [{ id: "dep1", name: "Raj Patel", relationship: "Spouse", dob: "1988-11-20" }] },
    { id: "emp_6", name: "Tom Rodriguez", email: "tom@company.com", role: "member", status: "online", department: "Engineering", designation: "Backend Developer", employmentType: "Full-time", phone: "+1-555-0106", branchName: "Austin", joiningDate: "2024-07-12T00:00:00Z", avatar: "", displayId: "EMP006", firstName: "Tom", lastName: "Rodriguez", nickname: "Tommy", location: "Austin", shift: "Morning", sourceOfHire: "LinkedIn", currentExperience: "1 year", totalExperience: "3 years", alternateEmail: "tom.r@email.com", address: "50 Tech Blvd", city: "Austin", state: "TX", country: "USA", zipCode: "73344", linkedin: "https://linkedin.com/in/tomrodriguez", github: "https://github.com/tomrodriguez", twitter: "@tom_dev", workExperience: [{ id: "we1", company: "CloudServe", title: "Junior Backend Developer", from: "2023-01", to: "2024-06", description: "Built REST APIs and microservices with Go and Node.js", relevant: true }], educationDetails: [{ id: "ed1", institute: "Texas A&M", degree: "B.S. Computer Engineering", specialization: "Systems", completionDate: "2022-12" }], dependentDetails: [] },
    { id: "emp_7", name: "Emma Davis", email: "emma@company.com", role: "member", status: "offline", department: "HR", designation: "HR Coordinator", employmentType: "Full-time", phone: "+1-555-0107", branchName: "New York", joiningDate: "2024-09-01T00:00:00Z", avatar: "", displayId: "EMP007", firstName: "Emma", lastName: "Davis", nickname: "Em", location: "New York", shift: "Morning", sourceOfHire: "Company Website", currentExperience: "1 year", totalExperience: "2 years", alternateEmail: "emma.d@email.com", address: "30 Park Ave", city: "New York", state: "NY", country: "USA", zipCode: "10016", linkedin: "https://linkedin.com/in/emmadavies", workExperience: [{ id: "we1", company: "HR Plus", title: "HR Assistant", from: "2023-04", to: "2024-08", description: "Managed employee records and onboarding processes", relevant: true }], educationDetails: [{ id: "ed1", institute: "Cornell", degree: "B.S. Human Resources", specialization: "Organizational Behavior", completionDate: "2023-05" }], dependentDetails: [] },
  ];

  if (session?.user?.id) {
    try {
      const orgMember = await db.collection(collections.orgMembers).findOne({ userId: session.user.id });
      if (orgMember) {
        const allOrgMembers = await db.collection(collections.orgMembers).find({ orgId: orgMember.orgId }).toArray();
        const userIds = allOrgMembers.map((m: Record<string, unknown>) => m.userId);
        const users = await db.collection(collections.users)
          .find({ id: { $in: userIds } })
          .toArray();
        const userMap = new Map(users.map((u: Record<string, unknown>) => [u.id, u]));
        employees = allOrgMembers.map((m: Record<string, unknown>) => {
          const u = userMap.get(m.userId as string) as Record<string, unknown> || {};
          return {
            id: (m.userId as string) || (u.id as string) || "",
            name: (u.name as string) || "Unknown",
            email: (u.email as string) || "",
            role: (m.role as string) || "member",
            status: (u.status as string) || "offline",
            department: (u.department as string) || "",
            designation: (u.designation as string) || "",
            employmentType: (u.employmentType as string) || "",
            phone: (u.phone as string) || "",
            branchName: (u.branchName as string) || "",
            joiningDate: u.joiningDate ? (u.joiningDate as Date).toISOString() : "",
            avatar: (u.image as string) || "",
          };
        });
      }
    } catch {
      employees = [];
    }
  }

  if (employees.length === 0) {
    employees = FAKE_EMPLOYEES;
  }

  return <EmployeesPageClient employees={employees} user={user} />;
}
