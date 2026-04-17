import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function ControlLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/control");
  }
  if (session.user.role !== "ADMIN") {
    const memberships = session.user.orgMemberships ?? [];
    if (memberships.length === 0) {
      redirect("/no-access");
    }
  }
  return <>{children}</>;
}
