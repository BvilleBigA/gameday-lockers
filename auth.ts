import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { SessionOrgMembership } from "@/types/next-auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).toLowerCase().trim();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const ok = await compare(String(credentials.password), user.passwordHash);
        if (!ok) return null;
        const orgMemberships = await prisma.organizationMember.findMany({
          where: { userId: user.id },
          include: { organization: { select: { id: true, name: true } } },
        });
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
          orgMemberships: orgMemberships.map((m) => ({
            organizationId: m.organizationId,
            organizationName: m.organization.name,
            role: m.role,
          })),
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.orgMemberships = user.orgMemberships ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? token.sub ?? "";
        session.user.role = (token.role as string) ?? "USER";
        session.user.orgMemberships = Array.isArray(token.orgMemberships)
          ? (token.orgMemberships as SessionOrgMembership[])
          : [];
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
