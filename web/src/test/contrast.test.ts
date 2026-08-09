/**
 * Contrast of the primary action, asserted rather than remembered.
 *
 * Brief §72 mandates brand green #2EAE6E; §76 mandates contrast compliance. With a white
 * label those requirements contradict each other, and the resolution — a green-900 label
 * with an inverted interaction ramp — is the kind of decision that gets quietly undone by
 * someone tidying tokens who does not know why they are unusual.
 *
 * This reads the real token files rather than restating hex values, so a change to either
 * `public/ds/tokens/colors.css` or the override in `src/styles/tokens.css` is what makes it
 * fail. Restating them here would produce a test that agrees with itself while the product
 * regresses.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** WCAG 2.1 relative luminance. */
function luminance(hex: string): number {
  const channels = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Resolve a token to a hex value, following `var(--other)` indirection.
 *
 * The palette is defined as a scale (`--green-400`) and the semantic names point at it
 * (`--action-primary: var(--green-400)`), so a naive lookup returns the string
 * "var(--green-400)" and every assertion silently passes on NaN.
 */
function resolve(name: string, source: string, depth = 0): string {
  if (depth > 8) throw new Error(`token ${name} does not resolve to a colour`);

  // The *last* declaration wins, because that is what the cascade does and the override
  // file is concatenated after the palette. Taking the first match instead reads the
  // design system's stock value and reports that the override is working when it is not —
  // which is precisely the failure this suite exists to catch, so it must not have it.
  const matches = [...source.matchAll(new RegExp(`--${name}\\s*:\\s*([^;]+);`, "g"))];
  const last = matches.at(-1);
  if (!last?.[1]) throw new Error(`token --${name} not found`);

  const value = last[1].trim();
  const indirect = value.match(/^var\(\s*--([\w-]+)\s*\)$/);
  return indirect?.[1] ? resolve(indirect[1], source, depth + 1) : value;
}

const palette = readFileSync("public/ds/tokens/colors.css", "utf8");
const overrides = readFileSync("src/styles/tokens.css", "utf8");

/** Overrides win, exactly as the cascade resolves them at runtime. */
const tokens = `${palette}\n${overrides}`;

/** WCAG 2.1: 4.5:1 for normal text. Button labels are normal text at 16px — the 3:1
 *  large-text allowance needs 18.66px bold or 24px regular, which no button here uses. */
const AA_NORMAL_TEXT = 4.5;

describe("primary action contrast", () => {
  const label = resolve("text-on-brand", tokens);

  const states: [string, string][] = [
    ["rest", resolve("action-primary", tokens)],
    ["hover", resolve("action-primary-hover", tokens)],
    ["active", resolve("action-primary-active", tokens)],
  ];

  it.each(states)("label on the %s background passes AA for normal text", (_state, background) => {
    expect(contrast(label, background)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it("keeps the brand green itself as the resting fill, per §72", () => {
    expect(resolve("action-primary", tokens).toUpperCase()).toBe("#2EAE6E");
  });

  /**
   * The regression this suite exists for. A white label is the obvious thing to reach for
   * on a green button and it is what the design system ships by default; it measures
   * 2.84:1. If someone restores it, this fails and says why.
   */
  it("refuses a white label on the brand green", () => {
    expect(contrast("#FFFFFF", "#2EAE6E")).toBeLessThan(AA_NORMAL_TEXT);
    expect(label.toUpperCase()).not.toBe("#FFFFFF");
  });

  /**
   * Guards the inverted ramp specifically. Reverting hover to the stock green-600 leaves
   * the resting state passing and breaks only on pointer-over, which no static review and
   * no screenshot would catch.
   */
  it("moves lighter on interaction, not darker", () => {
    const [, rest] = states[0] as [string, string];
    const [, hover] = states[1] as [string, string];
    const [, active] = states[2] as [string, string];

    expect(luminance(hover)).toBeGreaterThan(luminance(rest));
    expect(luminance(active)).toBeGreaterThan(luminance(hover));
  });
});
