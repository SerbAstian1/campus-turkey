/**
 * /portal/dashboard — the partner's own records.
 *
 * The one authenticated page on the site, and the guard is the whole reason it is a
 * server component: the session is resolved before any HTML is produced, so an
 * unauthenticated visitor is redirected rather than shown a dashboard shell that then
 * empties itself. A guard that runs after render is a guard that leaks a layout.
 *
 * This is not the only check. Every partner endpoint independently scopes its queries
 * to `session.partner.id` — a hidden page is not an access control, and if this
 * redirect were removed tomorrow the API would still refuse.
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/lib/auth";
import { db } from "@/server/lib/db";
import PortalDashboard from "@/screens/Portal";

export const runtime = "nodejs";
/* Never cached and never prerendered: the answer depends on who is asking. */
export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });

  // Not signed in at all — back to the door.
  if (!session?.user) redirect("/portal");

  // Signed in, but a staff account rather than a partner. The dashboard is built
  // entirely from one partner's records and has nothing to render for them.
  const partner = await db.partner.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!partner) redirect("/portal");

  return <PortalDashboard />;
}
