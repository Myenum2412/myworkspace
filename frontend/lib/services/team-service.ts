export type Team = {
  id: string;
  name: string;
  headUserId?: string;
  memberIds?: string[];
  description?: string;
  orgId?: string;
};

export const teamService = {
  async getAllTeams(): Promise<Team[]> {
    const res = await fetch("/api/teams", { credentials: "include" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || data || [];
  },
};
