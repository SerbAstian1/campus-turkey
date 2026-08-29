/**
 * Keeping the preview deployment out of Google, and the real one in it.
 *
 * Two failures are possible here and they are not equally bad, which is why the default
 * is asymmetric rather than tidy.
 *
 * A preview that gets indexed is embarrassing: a half-finished site appears in results
 * under a `vercel.app` address, competing with the real one and showing clients' work to
 * strangers. Recoverable in a week or two.
 *
 * The real site accidentally carrying `noindex` is the expensive one. This build exists
 * to be found in organic search; deindexing it would remove the entire reason the routing
 * migration happened, and it would do so silently, because a `noindex` page serves a
 * perfectly normal 200 and looks correct in every browser. Nobody notices until the
 * traffic does not arrive.
 *
 * So only the exact string `"off"` disables indexing. Every other value, including the
 * plausible near-misses somebody will eventually type, leaves the site indexable.
 */

import { describe, expect, it } from "vitest";
import { searchIndexingDisabled } from "../../middleware";

describe("withholding a deployment from search engines", () => {
  it("is disabled by exactly one value", () => {
    expect(searchIndexingDisabled("off")).toBe(true);
  });

  it("stays on when the variable is absent", () => {
    // The production case. A platform where nobody set the variable must index.
    expect(searchIndexingDisabled(undefined)).toBe(false);
    expect(searchIndexingDisabled("")).toBe(false);
  });

  it("stays on for every value that merely looks like a refusal", () => {
    /*
     * These are the ones somebody reaches for when they mean "off" and the variable is
     * not in front of them. Each would silently deindex the live site if it were
     * honoured, so each must not be.
     */
    for (const value of ["false", "no", "0", "OFF", "Off", " off", "off ", "disabled", "none"]) {
      expect(searchIndexingDisabled(value), `${JSON.stringify(value)} must not deindex`).toBe(false);
    }
  });

  it("stays on for the value that means on", () => {
    expect(searchIndexingDisabled("on")).toBe(false);
  });
});
