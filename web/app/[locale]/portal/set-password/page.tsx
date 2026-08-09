/**
 * /portal/set-password — where an approved partner chooses their own password.
 *
 * Deliberately public, and deliberately *not* behind the middleware guard that covers
 * `/portal/dashboard`: the person arriving here has an account but no password and no
 * session, so any check for one would lock out precisely the people this page exists
 * for. Nothing here is sensitive — knowing the page exists tells you nothing, and the
 * code emailed to the address is what does the authorising.
 */

import type { Metadata } from "next";
import SetPassword from "@/screens/SetPassword";

export const metadata: Metadata = {
  title: "Set your password",
  /* Not a page that should be found by searching. Anyone who needs it has the link. */
  robots: { index: false, follow: false },
};

export default function Page() {
  return <SetPassword />;
}
