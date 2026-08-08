/**
 * The public site's chrome.
 *
 * A route group — the `(site)` folder name never appears in a URL. It exists so the
 * navbar and footer wrap every public page without also wrapping the portal, which is
 * an application with its own navigation.
 */

import { Shell } from "@/app/Shell";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
