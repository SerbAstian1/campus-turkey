/**
 * /portal/representative — the representative's own area.
 *
 * A server component so the role is resolved before any HTML exists. The guard sends a
 * partner to their own dashboard and a staff member to the console rather than showing
 * a refusal: none of them is doing anything wrong, they are in the wrong place.
 *
 * The middleware already turns away anyone with no session cookie, with a real 307. This
 * is the check that knows *which* signed-in person is asking, which the edge cannot.
 */

import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/lib/auth";
import { db } from "@/server/lib/db";
import RepresentativePortal from "@/screens/RepresentativePortal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Representative portal",
  robots: { index: false, follow: false, nocache: true },
};

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/portal");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, representative: { select: { id: true } } },
  });

  if (user?.role !== "REPRESENTATIVE") {
    // Sent where they belong, by role, rather than to a generic error.
    if (user?.role === "PARTNER") redirect("/portal/dashboard");
    if (user?.role === "STAFF" || user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") {
      redirect("/staff");
    }
    redirect("/portal");
  }

  /* Role without a profile: an account mid-onboarding, or one whose profile was removed.
     Either way there is nothing to show, and the portal would render empty counts that
     look like a working account with no students. */
  if (!user.representative) redirect("/portal");

  return <RepresentativePortal />;
}
