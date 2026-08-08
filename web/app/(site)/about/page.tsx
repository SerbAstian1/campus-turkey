/**
 * /about
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
import About from "@/screens/About";

export const metadata: Metadata = pageMetadata({
  title: "About Campus Turkey",
  description: "Who we are, where we work, and the people who will handle your application.",
  path: "/about",
});

export default function Page() {
  return <About />;
}
