export const CLIENT_BASE_FOLDER = "Clients";

export const MODULE_FOLDER_MAP: Record<string, string> = {
  client: "Attachments",
  project: "Projects",
  task: "Projects",
  invoice: "Invoices",
  quotation: "Quotations",
  contract: "Contracts",
  drawing: "Drawings",
  image: "Images",
  report: "Reports",
  email: "Attachments",
  transmittal: "Attachments",
  rfi: "Attachments",
  general: "Other",
  other: "Other",
};

export const CLIENT_SUBFOLDERS = [
  "Documents",
  "Contracts",
  "Invoices",
  "Quotations",
  "Projects",
  "Drawings",
  "Images",
  "Reports",
  "Attachments",
  "Other",
];

export function getSubfolderForModule(moduleName?: string): string {
  if (!moduleName) return "Other";
  const key = moduleName.toLowerCase().trim();
  return MODULE_FOLDER_MAP[key] || "Other";
}
