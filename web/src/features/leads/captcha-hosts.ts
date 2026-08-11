/**
 * The origins hCaptcha loads from, for the CSP.
 *
 * Separate from `captcha.tsx` because that file is a `"use client"` React component and
 * `middleware.ts` runs on the edge runtime — importing the component there would pull
 * React into the edge bundle, which is the trade `server/lib/reporting.ts` already
 * measured and refused for Sentry.
 *
 * Separate from the middleware for the reason `features/map/tiles.ts` exists: the widget
 * and the policy that permits it have to name the same hosts, and the last time two
 * files were each given their own copy of that answer they drifted, the CSP blocked
 * every tile, and the only symptom was a blank panel and a console warning. A captcha
 * blocked the same way is a lead funnel that returns 403 with no visible cause.
 *
 * Roles, so an entry is never dropped as "probably unused":
 *   js.hcaptcha.com         the API script
 *   newassets.hcaptcha.com  the challenge iframe, its stylesheet and its images
 *   api.hcaptcha.com        the XHR the widget makes while solving
 */

export const HCAPTCHA_SCRIPT_HOSTS = [
  "https://js.hcaptcha.com",
  "https://newassets.hcaptcha.com",
] as const;

export const HCAPTCHA_FRAME_HOSTS = [
  "https://newassets.hcaptcha.com",
  "https://js.hcaptcha.com",
] as const;

export const HCAPTCHA_CONNECT_HOSTS = [
  "https://api.hcaptcha.com",
  "https://newassets.hcaptcha.com",
] as const;

export const HCAPTCHA_STYLE_HOSTS = ["https://newassets.hcaptcha.com"] as const;
