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

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, partner: { select: { id: true } } },
  });

  /*
   * The role router, and why it belongs on this page in particular.
   *
   * **Every successful sign-in lands here.** `PartnerLogin` navigates to
   * `portal/dashboard` unconditionally, because the browser has no role to branch on —
   * the session is only resolved server-side, which is here. So this is not one guarded
   * page among several; it is the junction the whole portal passes through.
   *
   * It previously checked for a `Partner` row and sent everyone else to `/portal`. But
   * `/portal` has no session check by design — it is the door — so it simply re-rendered
   * the login form. A representative, student or staff member therefore signed in
   * successfully and arrived back at a blank login page with no error, which is
   * indistinguishable from a failed password, and trying again looped forever.
   *
   * `portal/representative` and `portal/student` both route every role correctly. This
   * page, the only one that had to, did not.
   */
  if (user?.role === "REPRESENTATIVE") redirect("/portal/representative");
  if (user?.role === "STUDENT") redirect("/portal/student");
  if (user?.role === "STAFF" || user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") {
    redirect("/staff");
  }

  /* A PARTNER role with no partner row: an account mid-onboarding, or one whose profile
     was removed. The dashboard is built entirely from one partner's records, so there is
     nothing to render — and unlike the cases above there is nowhere better to send them. */
  if (!user?.partner) redirect("/portal");

  return <PortalDashboard />;
}
