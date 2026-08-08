/**
 * /apply
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
import Apply from "@/screens/Apply";

export const metadata: Metadata = pageMetadata({
  title: "Start your application",
  description: "Send one application and we place it with the universities that fit. Free to start, no obligation.",
  path: "/apply",
});

export default function Page() {
  return <Apply />;
}
