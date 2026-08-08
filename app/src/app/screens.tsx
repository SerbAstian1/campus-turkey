/**
 * The route table. Transcribed from the `App` component in the prototype HTML.
 *
 * A plain switch rather than a route matcher, because that is what the prototype has and
 * it is exactly as capable: two segments, no nesting, no loaders.
 *
 * Screens are imported eagerly. The prototype ships one bundle and its transitions are
 * timed against instant screen switches; lazy chunks would put a loading gap in the
 * middle of the page transition on the first visit to each route.
 */

import type { ReactNode } from "react";
import Home from "@/screens/Home";
import Study from "@/screens/Study";
import Service from "@/screens/Service";
import Universities from "@/screens/Universities";
import UniversityDetail from "@/screens/UniversityDetail";
import Partners from "@/screens/Partners";
import Representative from "@/screens/Representative";
import Institution from "@/screens/Institution";
import Apply from "@/screens/Apply";
import PartnerLogin from "@/screens/PartnerLogin";
import PortalDashboard from "@/screens/Portal";
import About from "@/screens/About";
import Contact from "@/screens/Contact";
import Resources from "@/screens/Resources";
import Article from "@/screens/Article";
import { ErrorScreen, ERROR_STATES, type ErrorState } from "@/screens/Errors";

export function renderScreen(name: string, param: string | null): ReactNode {
  switch (name) {
    case "home": return <Home />;
    case "study": return <Study />;
    case "universities": return <Universities />;
    case "university": return <UniversityDetail slug={param} />;
    case "service": return <Service slug={param ?? "medical"} />;
    case "partners": return <Partners />;
    case "representative": return <Representative />;
    case "institutions": return <Institution slug={param ?? "universities"} />;
    case "apply": return <Apply />;
    case "portal": return param === "dashboard" ? <PortalDashboard /> : <PartnerLogin />;
    case "about": return <About />;
    case "contact": return <Contact />;
    case "resources": return <Resources />;
    case "blog": return <Article slug={param} />;
    /* Every error state is addressable, so QA and the client can review them directly. */
    case "error": return <ErrorScreen state={(param && param in ERROR_STATES ? param : "notFound") as ErrorState} />;
    default: return <ErrorScreen state="notFound" />;
  }
}
