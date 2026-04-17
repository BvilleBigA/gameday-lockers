import { redirect } from "next/navigation";

/** @deprecated Use /admin/displays for pairing and /admin/groups for walls. */
export default function AdminScreensRedirectPage() {
  redirect("/admin/displays");
}
