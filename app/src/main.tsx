/**
 * Entry point.
 *
 * The design system, lucide and the translation runtime are classic scripts that must
 * finish before the first render — every screen is built from design system components,
 * so rendering earlier would paint an empty page and then replace it. The boot screen
 * in index.html covers that window and is removed once React has mounted.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { loadDesignSystem } from "./ds/load";
import { App } from "./app/App";
import "./styles/tokens.css";
import "./styles/base.css";

const container = document.getElementById("root");
if (!container) throw new Error("No #root element to mount into.");

function dismissLoader() {
  const loader = document.getElementById("ct-loader");
  if (!loader) return;
  loader.classList.add("gone");
  window.setTimeout(() => loader.remove(), 600);
}

loadDesignSystem()
  .then(() => {
    createRoot(container).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    /* One frame after mount, so the first paint is the real page rather than the
       loader fading out over an empty root. */
    window.requestAnimationFrame(() => window.setTimeout(dismissLoader, 300));
  })
  .catch((error: unknown) => {
    console.error(error);
    dismissLoader();
    container.innerHTML =
      '<div style="min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui;text-align:center;color:#0A2C1E">' +
      "<div><h1>This page did not load</h1>" +
      "<p>The design system bundle could not be fetched. Run <code>npm run setup</code> from the project root, then reload.</p></div></div>";
  });
