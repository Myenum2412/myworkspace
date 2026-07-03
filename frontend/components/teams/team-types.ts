import type { Team } from "@/app/teams/columns";

export type OrgMember = {
  userId: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  designation?: string;
  department?: string;
};

export type TeamMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar: string;
  status: string;
  department: string;
  designation: string;
  role: string;
};

export type TeamDetail = Team & {
  members: TeamMember[];
};

export function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}
