import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const metadata: Metadata = {
  title: "Admin · Gameday Lockers",
};

function SidebarFallback() {
  return <aside className="w-72 shrink-0 border-r border-black/20 bg-[#222]" aria-hidden />;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin");
  }
  if (session.user.role !== "ADMIN") {
    const memberships = session.user.orgMemberships ?? [];
    if (memberships.length === 0) {
      redirect("/no-access");
    }
  }

  return (
    <div className="flex min-h-dvh w-full bg-white">
      <Suspense fallback={<SidebarFallback />}>
        <AdminSidebar />
      </Suspense>
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col border-l border-slate-200/80">
        <main className="flex-1 px-6 py-8 md:px-10">{children}</main>
      </div>
    </div>
  );
}
