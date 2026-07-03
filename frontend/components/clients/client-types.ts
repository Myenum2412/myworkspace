import type { Client } from "@/app/clients/columns";
export type { ClientValues } from "@/app/clients/client-form-fields";

export type SessionUser = {
  id?: string;
  name?: string;
  email?: string;
  image?: string;
  role?: string;
};

export type Credentials = {
  username: string;
  email: string;
  password: string;
  loginUrl: string;
};

export type ClientsProps = {
  initialClients: Client[];
  user: SessionUser;
};
