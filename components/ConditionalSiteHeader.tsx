"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";

/** Site chrome for marketing + auth pages; hidden on admin, control, and full-screen TV routes. */
export function ConditionalSiteHeader() {
  const path = usePathname() ?? "";
  if (
    path.startsWith("/admin") ||
    path.startsWith("/control") ||
    path.startsWith("/screen") ||
    path.startsWith("/display") ||
    path.startsWith("/pair")
  ) {
    return null;
  }
  return <SiteHeader />;
}
