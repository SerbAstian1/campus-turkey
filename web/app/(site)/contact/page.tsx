/**
 * /contact
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
import Contact from "@/screens/Contact";

export const metadata: Metadata = pageMetadata({
  title: "Contact us",
  description: "Talk to someone about studying in Türkiye. Offices, WhatsApp, and a form that reaches a real person.",
  path: "/contact",
});

export default function Page() {
  return <Contact />;
}
