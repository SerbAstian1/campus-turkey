/**
 * The staff console.
 *
 * Outside the `(site)` group, like the portal: this is an application, and the
 * marketing chrome would be noise around a payout queue.
 *
 * English only, deliberately. The console is used by Campus Turkey's own staff, and
 * seventeen translations of "Send to provider" is sixteen more chances for a mistranslated
 * verb to cause somebody to move money they meant to hold. The locale segment still
 * exists because every route lives under it; it just does not change what staff read.
 */

import type { Metadata } from "next";
import { NavigationBridge } from "../portal/NavigationBridge";

export const metadata: Metadata = {
  title: "Staff console",
  /* Belt and braces with the `x-robots-tag` header. A console URL in a search result
     is worse than useless — it is an invitation. */
  robots: { index: false, follow: false, nocache: true },
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <NavigationBridge>{children}</NavigationBridge>;
}
