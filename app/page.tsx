import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthCookieName, verifyAuthCookieValue } from "@/lib/auth";
import PortalDashboard from "@/components/PortalDashboard";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const cookieName = getAuthCookieName();
  const raw = cookies().get(cookieName)?.value;
  const session = verifyAuthCookieValue(raw);

  if (!session?.email) {
    redirect("/login");
  }

  return <PortalDashboard userEmail={session.email} userName={session.name} />;
}
