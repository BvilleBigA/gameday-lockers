"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-r-md border-l-4 py-2.5 pl-3 pr-2 text-sm font-semibold uppercase tracking-wide transition-colors ${
        active
          ? "border-[#c4a052] bg-[#c4a052]/20 text-[#f2f0ec]"
          : "border-transparent text-slate-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}

export function AdminSidebar() {
  const { data: session } = useSession();

  async function handleSignOut() {
    await signOut({ redirect: false });
    if (typeof window !== "undefined") {
      window.location.assign("/");
    }
  }

  const isAdmin = session?.user?.role === "ADMIN";
  const memberships = session?.user?.orgMemberships ?? [];
  const canEditContent =
    isAdmin || memberships.some((m) => m.role === "OWNER" || m.role === "COACH");
  const canManageOrg = isAdmin || memberships.some((m) => m.role === "OWNER");
  const pathname = usePathname();

  const groupsActive = pathname.startsWith("/admin/groups");
  const screensActive = pathname.startsWith("/admin/displays");
  const contentActive = pathname.startsWith("/admin/content");

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-[#2a2826] bg-[#0e0e10] text-white">
      <div className="border-b border-white/10 px-4 py-6">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#c4a052] text-[10px] font-bold leading-tight tracking-tight text-black shadow-inner">
            GL
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#c4a052]">Gameday</p>
            <p className="text-sm font-bold uppercase tracking-wide text-white">Lockers</p>
          </div>
        </Link>
        <p className="mt-3 text-[11px] leading-snug text-slate-500">
          Groups, screens, and your content library.
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto p-3 pb-8">
        <div>
          <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Main
          </p>
          <div className="space-y-0.5">
            <NavLink href="/admin" active={pathname === "/admin"}>
              Dashboard
            </NavLink>
            {canEditContent ? (
              <NavLink href="/admin/groups" active={groupsActive}>
                Groups
              </NavLink>
            ) : null}
            <NavLink href="/admin/displays" active={screensActive}>
              Screens
            </NavLink>
            {canEditContent ? (
              <NavLink href="/admin/content" active={contentActive}>
                Content
              </NavLink>
            ) : null}
          </div>
        </div>

        <div>
          <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            More
          </p>
          <div className="space-y-0.5">
            {isAdmin ? (
              <>
                <NavLink href="/admin/organizations" active={pathname.startsWith("/admin/organizations")}>
                  Organizations
                </NavLink>
                <NavLink href="/admin/users" active={pathname.startsWith("/admin/users")}>
                  Users
                </NavLink>
              </>
            ) : null}
            {canManageOrg ? (
              <NavLink href="/admin/organization" active={pathname.startsWith("/admin/organization")}>
                Org invites
              </NavLink>
            ) : null}
            <NavLink href="/control" active={pathname === "/control"}>
              Live control (iPad)
            </NavLink>
          </div>
        </div>
      </nav>

      <div className="space-y-3 border-t border-white/10 p-4">
        {session?.user?.email ? (
          <p className="truncate text-[11px] text-slate-500" title={session.user.email}>
            {session.user.email}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="block w-full rounded-md border border-white/15 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-300 hover:bg-white/5"
        >
          Sign out
        </button>
        <Link
          href="/"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-[#c4a052]"
        >
          ← Public site
        </Link>
      </div>
    </aside>
  );
}
