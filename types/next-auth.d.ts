import type { DefaultSession } from "next-auth";

export type SessionOrgMembership = {
  organizationId: number;
  organizationName: string;
  role: string;
};

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: string;
      orgMemberships: SessionOrgMembership[];
    };
  }

  interface User {
    role: string;
    orgMemberships?: SessionOrgMembership[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    orgMemberships?: SessionOrgMembership[];
  }
}
