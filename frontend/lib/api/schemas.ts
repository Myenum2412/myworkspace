import { z } from "zod";

let _appDataCache: Record<string, { data: unknown }> | null = null;

export function setDataCache(cache: Record<string, { data: unknown }>) {
  _appDataCache = cache;
}

export function getFromCache(url: string): unknown | null {
  return _appDataCache?.[url]?.data ?? null;
}

export function apiResponse<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.boolean().optional(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
    pagination: z
      .object({
        page: z.number(),
        limit: z.number(),
        total: z.number(),
        totalPages: z.number(),
      })
      .optional(),
  });
}

export async function fetchAndValidate<T>(
  url: string,
  schema: z.ZodType<T>,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText} for ${url}`);
  }
  const json = await res.json();
  return schema.parse(json);
}

export async function fetchData<T>(
  url: string,
  dataSchema: z.ZodType<T>,
  options?: RequestInit,
): Promise<T> {
  const cached = _appDataCache?.[url]?.data;
  if (cached !== undefined && cached !== null) {
    try {
      return dataSchema.parse(cached) as T;
    } catch {
    }
  }
  const responseSchema = apiResponse(dataSchema);
  const parsed = await fetchAndValidate(url, responseSchema, options);
  return (parsed.data ?? parsed) as T;
}

export const UserSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  email: z.string().optional(),
  image: z.string().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
  avatar: z.string().optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  orgId: z.string().optional(),
});

export const TaskSchema = z.object({
  id: z.string().optional(),
  _id: z.string().optional(),
  title: z.string().optional(),
  task: z.string().optional(),
  description: z.string().optional(),
  project: z.string().optional(),
  type: z.string().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  assigneeId: z.string().optional(),
  assigneeName: z.string().optional(),
  assigneeAvatar: z.string().optional(),
  creatorId: z.string().optional(),
  creatorName: z.string().optional(),
  creatorAvatar: z.string().optional(),
  dueDate: z.string().optional(),
  startDate: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  orgId: z.string().optional(),
  isSaved: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const ProjectSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  client: z.string().optional(),
  color: z.string().optional(),
  description: z.string().optional(),
  deadline: z.string().nullable().optional(),
  progress: z.number().optional(),
  status: z.string().optional(),
  members: z.array(z.unknown()).optional(),
  createdAt: z.string().optional(),
});

export const ClientSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  username: z.string().optional(),
  company: z.string().optional(),
  projects: z.union([z.number(), z.array(z.unknown())]).optional(),
  status: z.string().optional(),
  clientType: z.string().optional(),
  phone: z.string().optional(),
  mobileNumber: z.string().optional(),
  createdAt: z.string().optional(),
});

export const EmployeeSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  employmentType: z.string().optional(),
  phone: z.string().optional(),
  branchName: z.string().optional(),
  joiningDate: z.string().optional(),
  avatar: z.string().optional(),
});

export const TeamSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  memberCount: z.number().optional(),
  leadName: z.string().optional(),
  members: z.array(z.unknown()).optional(),
  createdAt: z.string().optional(),
});

export const NotificationSchema = z.object({
  id: z.string().optional(),
  _id: z.string().optional(),
  title: z.string().optional(),
  message: z.string().optional(),
  type: z.string().optional(),
  category: z.string().optional(),
  priority: z.string().optional(),
  read: z.boolean().optional(),
  link: z.string().optional(),
  createdAt: z.string().optional(),
});

export const ApprovalSchema = z.object({
  _id: z.string().optional(),
  id: z.string().optional(),
  itemType: z.string().optional(),
  title: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  assigneeName: z.string().optional(),
  creatorName: z.string().optional(),
  description: z.string().optional(),
  createdAt: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  uploaderName: z.string().optional(),
});

export const InvoiceSchema = z.object({
  id: z.string().optional(),
  number: z.string().optional(),
  amountPaid: z.number().optional(),
  currency: z.string().optional(),
  status: z.string().optional(),
  pdfUrl: z.string().optional(),
  hostedUrl: z.string().optional(),
  createdAt: z.string().optional(),
  customerName: z.string().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
});

export const AppointmentSchema = z.object({
  id: z.string().optional(),
  patientName: z.string().optional(),
  mobileNumber: z.string().optional(),
  email: z.string().optional(),
  doctorName: z.string().optional(),
  appointmentDate: z.string().optional(),
  preferredTime: z.string().optional(),
  reasonForVisit: z.string().optional(),
  status: z.string().optional(),
  createdAt: z.string().optional(),
});

export const FileItemSchema = z.object({
  id: z.string().optional(),
  originalName: z.string().optional(),
  name: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  uploaderName: z.string().optional(),
  uploaderId: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  folderId: z.string().nullable().optional(),
  category: z.string().optional(),
  approvalStatus: z.string().optional(),
});

export const SettingsSchema = z.object({
  id: z.string().optional(),
  orgId: z.string().optional(),
  timezone: z.string().optional(),
  dateFormat: z.string().optional(),
  currency: z.string().optional(),
  language: z.string().optional(),
});

export const OrgSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  slug: z.string().optional(),
  logo: z.string().optional(),
  plan: z.string().optional(),
  subscriptionStatus: z.string().optional(),
});

export const ActivitySchema = z.object({
  id: z.string().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  description: z.string().optional(),
  userName: z.string().optional(),
  createdAt: z.string().optional(),
});

export const TimeEntrySchema = z.object({
  id: z.string().optional(),
  userId: z.string().optional(),
  projectId: z.string().optional(),
  taskId: z.string().optional(),
  description: z.string().optional(),
  duration: z.number().optional(),
  date: z.string().optional(),
  createdAt: z.string().optional(),
});

export const StockSchema = z.object({
  id: z.string().optional(),
  itemCode: z.string().optional(),
  productName: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  unit: z.string().optional(),
  openingStock: z.number().optional(),
  stockIn: z.number().optional(),
  stockOut: z.number().optional(),
  availableStock: z.number().optional(),
  status: z.string().optional(),
});

export const AttendanceSchema = z.object({
  id: z.string().optional(),
  userId: z.string().optional(),
  userName: z.string().optional(),
  date: z.string().optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  status: z.string().optional(),
});

export const ContractSchema = z.object({
  id: z.string().optional(),
  fullName: z.string().optional(),
  companyName: z.string().optional(),
  mobileNumber: z.string().optional(),
  emailAddress: z.string().optional(),
  contractorType: z.string().optional(),
  mainTrade: z.string().optional(),
  status: z.string().optional(),
});

export const BlogPostSchema = z.object({
  id: z.string().optional(),
  _id: z.string().optional(),
  title: z.string().optional(),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  author: z.string().optional(),
  publishedAt: z.string().optional(),
  createdAt: z.string().optional(),
  tags: z.array(z.string()).optional(),
  coverImage: z.string().optional(),
});

export const ChatMessageSchema = z.object({
  id: z.string().optional(),
  roomId: z.string().optional(),
  userId: z.string().optional(),
  userName: z.string().optional(),
  text: z.string().optional(),
  timestamp: z.string().optional(),
  type: z.string().optional(),
});

export const ReceiptSchema = z.object({
  id: z.string().optional(),
  receiptNumber: z.string().optional(),
  invoiceNumber: z.string().optional(),
  customerName: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  paymentMethod: z.string().optional(),
  status: z.string().optional(),
  paidAt: z.string().optional(),
  createdAt: z.string().optional(),
});
