/**
 * /resources
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
import Resources from "@/screens/Resources";

export const metadata: Metadata = pageMetadata({
  title: "Guides and resources",
  description: "Guides, checklists and explainers on applying to Turkish universities, visas and student life.",
  path: "/resources",
});

export default function Page() {
  return <Resources />;
}
