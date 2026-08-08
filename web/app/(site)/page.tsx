/**
 * /
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
import Home from "@/screens/Home";

export const metadata: Metadata = {
  ...pageMetadata({
    // `absolute` so the "— Campus Turkey" suffix is not appended. Without it the
    // homepage and /study both render "Study in Türkiye — Campus Turkey", and two
    // pages competing on one title is a self-inflicted ranking problem.
    title: "Campus Turkey — Study in Türkiye",
    description:
      "Study in Türkiye with a guide who has done it before. University placement, visas, accommodation and medical support for students from Africa, the Middle East and South Asia.",
    path: "/",
  }),
  title: { absolute: "Campus Turkey — Study in Türkiye" },
};

export default function Page() {
  return <Home />;
}
