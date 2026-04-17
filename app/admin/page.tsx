"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

function Tile({
  href,
  title,
  subtitle,
  icon,
}: {
  href: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl bg-[#52A88E] p-6 text-center text-white shadow-md transition hover:bg-[#469178] hover:shadow-lg active:scale-[0.99] md:min-h-[168px]"
    >
      <div className="text-white/90 transition group-hover:scale-105">{icon}</div>
      <span className="font-bold uppercase tracking-wide">{title}</span>
      {subtitle ? <span className="text-xs font-medium text-white/85">{subtitle}</span> : null}
    </Link>
  );
}

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const memberships = session?.user?.orgMemberships ?? [];
  const canEditContent =
    isAdmin || memberships.some((m) => m.role === "OWNER" || m.role === "COACH");

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-sm text-slate-500">Dashboard</p>
      <h1 className="mt-1 text-2xl font-bold uppercase tracking-tight text-slate-900 md:text-3xl">
        Control center
      </h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Groups for live walls and mass-send; screens for pairing codes; content library with a folder
        per group.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {canEditContent ? (
          <Tile
            href="/admin/groups"
            title="Groups"
            subtitle="Walls & mass send"
            icon={
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            }
          />
        ) : null}

        <Tile
          href="/admin/displays"
          title="Screens"
          subtitle="Pairing codes"
          icon={
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          }
        />

        {canEditContent ? (
          <Tile
            href="/admin/content"
            title="Content"
            subtitle="Folders & uploads"
            icon={
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
            }
          />
        ) : null}

        <Tile
          href="/control"
          title="Live control"
          subtitle="iPad — switch scenes"
          icon={
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          }
        />

        {isAdmin ? (
          <>
            <Tile
              href="/admin/organizations"
              title="Organizations"
              subtitle="Schools & departments"
              icon={
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              }
            />
            <Tile
              href="/admin/users"
              title="Users"
              subtitle="Platform admins"
              icon={
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              }
            />
          </>
        ) : null}
      </div>

      {canEditContent ? (
        <div className="mt-12 rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">Advanced</p>
          <p className="mt-2">
            <Link href="/admin/displays" className="font-medium text-[#3d7d6c] underline">
              Register pairing codes
            </Link>
            {" · "}
            <Link href="/admin/scenes" className="font-medium text-[#3d7d6c] underline">
              Scenes
            </Link>
            {" · "}
            <Link href="/admin/schedule" className="font-medium text-[#3d7d6c] underline">
              Schedule
            </Link>
            {" · "}
            <Link href="/admin/roster" className="font-medium text-[#3d7d6c] underline">
              Roster
            </Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}
