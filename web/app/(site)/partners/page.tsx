/**
 * /partners
 *
 * A server component whose only job is metadata. The screen itself is EDSAI's and is a
 * client component, because every design system component it renders needs the browser
 * global that `_ds_bundle.js` installs — see app/providers.tsx.
 *
 * The metadata below is emitted in the server's HTML, which is what makes this
 * migration worth doing: title, description and canonical are readable without running
 * any JavaScript. Handoff note 6.
 */

import type { Metadata } from "next";
import { pageMetadata } from "@/server/lib/seo";
import Partners from "@/screens/Partners";

export const metadata: Metadata = pageMetadata({
  title: "Become a partner",
  description: "Refer students to Turkish universities and earn commission on every confirmed registration.",
  path: "/partners",
});

export default function Page() {
  return <Partners />;
}
