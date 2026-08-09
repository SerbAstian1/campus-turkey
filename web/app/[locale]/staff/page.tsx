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
    select: { staffRole: true, name: true, email: true },
  });

  // Signed in, but a partner rather than staff. Sent to their own portal rather than
  // shown a refusal — they are not doing anything wrong, they are in the wrong place.
  if (!user?.staffRole) redirect("/portal/dashboard");

  return (
    <StaffConsole
      role={user.staffRole as StaffRole}
      person={user.name ?? user.email}
    />
  );
}
