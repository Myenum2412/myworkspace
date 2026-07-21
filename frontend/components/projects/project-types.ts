export type Project = {
  id: string;
  name: string;
  client: string;
  color: string;
  description: string;
  deadline: string | null;
  tracked: number;
  progress: number;
  access: "Public" | "Private";
  status: "Active" | "Inactive";
  members?: string[];
  headId?: string;
  headName?: string;
  headAvatar?: string;
  priority?: "low" | "medium" | "high" | "critical";
  category?: string;
  budget?: number;
  spent?: number;
  health?: "on-track" | "at-risk" | "delayed";
  startDate?: string | null;
};

export interface Employee {
  id: string;
  name: string;
  email: string;
  image?: string;
}

export interface ProjectListProps {
  projects: Project[];
  loading: boolean;
  onView: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onNewProject: () => void;
}

export interface ProjectCreateFormProps {
  projectName: string;
  onProjectNameChange: (value: string) => void;
  selectedClient: string;
  onSelectedClientChange: (value: string) => void;
  projectDescription: string;
  onProjectDescriptionChange: (value: string) => void;
  projectDeadline: string;
  onProjectDeadlineChange: (value: string) => void;
  projectColor: string;
  onProjectColorChange: (value: string) => void;
  projectMembers: string[];
  onProjectMembersChange: (members: string[]) => void;
  projectPriority: string;
  onProjectPriorityChange: (value: string) => void;
  projectCategory: string;
  onProjectCategoryChange: (value: string) => void;
  projectStartDate: string;
  onProjectStartDateChange: (value: string) => void;
  projectBudget: number;
  onProjectBudgetChange: (value: number) => void;
  projectAttachment: File | null;
  onProjectAttachmentChange: (file: File | null) => void;
  projectAccess: "Public" | "Private";
  onProjectAccessChange: (value: "Public" | "Private") => void;
  projectHealth: string;
  onProjectHealthChange: (value: string) => void;
  submitting: boolean;
  formError: string;
  clientList: string[];
  filteredMembers: Employee[];
  memberSearch: string;
  onMemberSearchChange: (value: string) => void;
  colors: string[];
  onSubmit: () => void;
  onCancel: () => void;
}

export interface ProjectEditFormProps {
  editName: string;
  onEditNameChange: (value: string) => void;
  editClient: string;
  onEditClientChange: (value: string) => void;
  editColor: string;
  onEditColorChange: (value: string) => void;
  editAccess: "Public" | "Private";
  onEditAccessChange: (value: "Public" | "Private") => void;
  editStatus: "Active" | "Inactive";
  onEditStatusChange: (value: "Active" | "Inactive") => void;
  editDescription: string;
  onEditDescriptionChange: (value: string) => void;
  editDeadline: string;
  onEditDeadlineChange: (value: string) => void;
  editPriority: string;
  onEditPriorityChange: (value: string) => void;
  editCategory: string;
  onEditCategoryChange: (value: string) => void;
  editStartDate: string;
  onEditStartDateChange: (value: string) => void;
  editBudget: number;
  onEditBudgetChange: (value: number) => void;
  editHealth: string;
  onEditHealthChange: (value: string) => void;
  editMembers: string[];
  onEditMembersChange: (value: string[]) => void;
  editMemberSearch: string;
  onEditMemberSearchChange: (value: string) => void;
  editAttachment: File | null;
  onEditAttachmentChange: (file: File | null) => void;
  filteredMembers: { id: string; name: string; email: string; image?: string }[];
  clientList: string[];
  colors: string[];
  submitting: boolean;
  formError: string;
  onSubmit: () => void;
  onCancel: () => void;
}

export interface ProjectDeleteDialogProps {
  deleteConfirm: Project | null;
  setDeleteConfirm: (project: Project | null) => void;
  deleting: boolean;
  onDelete: (project: Project) => void;
}

export const PROJECT_COLORS = [
  "#93c5fd", "#fca5a5", "#86efac", "#fcd34d", "#c4b5fd",
  "#f9a8d4", "#67e8f9", "#fdba74", "#6ee7b7", "#a5b4fc",
];

export const PROJECT_PRIORITIES = ["low", "medium", "high", "critical"] as const;
export const PROJECT_CATEGORIES = ["development", "design", "marketing", "research", "operations", "other"] as const;

export type BoardColumn = {
  id: string;
  title: string;
  color: string;
  filter: (p: Project) => boolean;
};
