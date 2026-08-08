/**
 * POST /api/translate — keyed provider proxy
 *
 * Auth:  none — public by design. Every visitor uses it, on every page, in 17 languages.
 * Authz: public. Controlled by the rate limit and by the bounded input below.
 *
 *   200  { translations: string[] } — same order and length as the input
 *   400  validation failed (too many strings, a string too long, unknown target)
 *   403  origin check failed
 *   429  rate limited — 120/min per IP
 *   502  provider unreachable or refused after one retry
 *   503  translation is not configured — the client falls back to English
 *
 * This endpoint exists because handoff note 1 is a blocker: the prototype calls an
 * undocumented, unmetered public Google endpoint with no key. It will rate-limit under
 * real traffic and can disappear without notice. Proxying through a keyed provider
 * keeps the key on the server, which is the only place it can safely be.
 *
 * The better answer, per that same note, is to stop needing this endpoint: run the
 * sweep once per language, have a native speaker review it, and ship static locale
 * files. Admissions copy carries commitments about money and deadlines, and machine
 * output is good enough to read but not good enough to sign a contract against. This
 * proxy is the bridge, not the destination.
 */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { env } from "@/server/lib/config";
import { UnavailableError, UpstreamError } from "@/server/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The 17 languages the site offers. An unbounded target is a request-smuggling hole. */
const TARGETS = [
  "ar", "az", "bn", "de", "es", "fa", "fr", "ha", "id",
  "ku", "pt", "ru", "sw", "tr", "ur", "uz", "yo",
] as const;

const translateBody = z.object({
  /**
   * Bounded on both axes. The sweep batches by page, and no page has more than a few
   * hundred distinct strings; 200 per request with a 2000-character ceiling each caps
   * one request at ~400KB of provider spend, which is what stops this proxy from being
   * a way to bill Campus Turkey for someone else's translation work.
   */
  strings: z.array(z.string().max(2000)).min(1).max(200),
  target: z.enum(TARGETS),
  source: z.literal("en").default("en"),
});

const PROVIDER_TIMEOUT_MS = 10_000;

/**
 * Call the provider, with one retry on a transient failure.
 *
 * Translation is idempotent and has no side effect, so a retry is safe here in a way
 * it is not on the payout path. One retry, not three: the client is a visitor waiting
 * for text to appear, and a third attempt costs more in perceived latency than it
 * recovers in success rate.
 */
async function translate(
  strings: string[],
  target: string,
  source: string,
): Promise<string[]> {
  if (env.TRANSLATE_PROVIDER === "disabled" || !env.TRANSLATE_API_KEY || !env.TRANSLATE_ENDPOINT) {
    // 503, not 500. The client's i18n layer treats this as "stay in English", which is
    // the designed degradation — see the fallback in app/public/site/i18n.js.
    throw new UnavailableError(3600, "Translation is not available right now.");
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

    try {
      const response = await fetch(env.TRANSLATE_ENDPOINT, {
        method: "POST",
        signal: controller.signal,
        headers: {
          authorization: `DeepL-Auth-Key ${env.TRANSLATE_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ text: strings, target_lang: target.toUpperCase(), source_lang: source.toUpperCase() }),
      });

      if (response.status >= 500 && attempt === 1) {
        lastError = new Error(`provider returned ${response.status}`);
        continue;
      }

      if (!response.ok) {
        throw new UpstreamError(env.TRANSLATE_PROVIDER, "Translation is briefly unavailable.");
      }

      const result = (await response.json()) as { translations?: Array<{ text: string }> };
      const translations = result.translations?.map((t) => t.text);

      // Length mismatch means the response cannot be zipped back onto the source
      // strings. Returning it would scramble the page — every string shifted by one.
      if (!translations || translations.length !== strings.length) {
        throw new UpstreamError(
          env.TRANSLATE_PROVIDER,
          "Translation is briefly unavailable.",
        );
      }

      return translations;
    } catch (error) {
      if (error instanceof UpstreamError) throw error;
      lastError = error;
      if (attempt === 2) break;
    } finally {
      clearTimeout(timer);
    }
  }

  throw new UpstreamError(env.TRANSLATE_PROVIDER, "Translation is briefly unavailable.", {
    cause: String(lastError),
  });
}

export const POST = route({
  access: { kind: "public" },
  rateLimit: RATE_LIMITS.translate,
  body: translateBody,
  handler: async ({ body }) => {
    const translations = await translate(body.strings, body.target, body.source);
    return { translations };
  },
});
