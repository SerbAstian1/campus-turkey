/**
 * /portal/student — the student's own area.
 *
 * A server component so the role is resolved before any HTML exists. Unlike the other
 * portals this does **not** require a profile: a student who has signed up but not yet
 * claimed their record is a normal state, and the screen has a form for exactly that.
 * Redirecting them would leave them with an account and nowhere to go.
 */

import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/lib/auth";
import { db } from "@/server/lib/db";
import StudentPortal from "@/screens/StudentPortal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your application",
  robots: { index: false, follow: false, nocache: true },
};

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/portal");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "STUDENT") {
    // Sent where they belong, by role. None of them is doing anything wrong.
    if (user?.role === "PARTNER") redirect("/portal/dashboard");
    if (user?.role === "REPRESENTATIVE") redirect("/portal/representative");
    if (user?.role === "STAFF" || user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") {
      redirect("/staff");
    }
    redirect("/portal");
  }

  return <StudentPortal />;
}
