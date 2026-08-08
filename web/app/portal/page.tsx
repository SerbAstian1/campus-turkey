/**
 * /portal — the partner sign-in screen.
 *
 * `/portal` is the door and `/portal/dashboard` is the room, matching the prototype's
 * `#/portal` and `#/portal/dashboard`.
 *
 * There is no session check here: this is the page an unauthenticated visitor is
 * supposed to reach. The guard lives on the dashboard.
 */

import PartnerLogin from "@/screens/PartnerLogin";

export default function Page() {
  return <PartnerLogin />;
}
