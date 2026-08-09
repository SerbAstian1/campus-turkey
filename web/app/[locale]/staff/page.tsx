/**
 * /staff — the console.
 *
 * A server component so the session and the role are resolved before any HTML is
 * produced. A client-side guard would ship the console's markup to whoever asked for
 * it and empty it afterwards; this sends a redirect instead.
 *
 * The role is read here and passed down rather than fetched by the console, so the
 * interface never renders in a state where it does not yet know what the reader may do.
 * It is not the access control — every staff endpoint checks the role independently,
 * because a hidden button has never been one.
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/lib/auth";
import { db } from "@/server/lib/db";
import { StaffConsole, type StaffRole } from "@/screens/staff/StaffConsole";

export const runtime = "nodejs";
/* Never cached and never prerendered: the answer depends entirely on who is asking. */
export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/portal");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true, name: true, email: true,
      staffProfile: { select: { department: true } },
    },
  });

  // Signed in, but not staff. Sent to their own area rather than shown a refusal — none
  // of them is doing anything wrong, they are in the wrong place.
  if (user?.role === "PARTNER") redirect("/portal/dashboard");
  if (user?.role === "REPRESENTATIVE") redirect("/portal/representative");
  if (user?.role === "STUDENT") redirect("/portal/student");
  if (!user || (user.role !== "STAFF" && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    redirect("/portal");
  }

  /**
   * The console's own vocabulary, derived from role and department.
   *
   * It still speaks in SUPPORT / FINANCE / ADMIN because that is what the three queues
   * mean to a reviewer — who may read, who may move money, who may approve an
   * application. What changed underneath is where those answers come from: the role
   * column and the Finance department, rather than a `staffRole` enum that duplicated
   * both.
   */
  const consoleRole: StaffRole =
    user.role === "ADMIN" || user.role === "SUPER_ADMIN"
      ? "ADMIN"
      : user.staffProfile?.department === "FINANCE"
        ? "FINANCE"
        : "SUPPORT";

  return (
    <StaffConsole
      role={consoleRole}
      person={user.name ?? user.email}
    />
  );
}
