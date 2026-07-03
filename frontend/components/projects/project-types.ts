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
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  colors: string[];
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
