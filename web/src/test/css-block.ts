/**
 * Reading a rule body out of `styles/base.css` by brace matching.
 *
 * **This exists because the obvious regex does not terminate.**
 *
 * `responsive-selectors.test.ts` originally extracted the phone breakpoint with
 *
 *     /@media \(max-width:760px\)\{([^}]*\}?)*?\}\}/
 *
 * `([^}]*\}?)*?` is two quantifiers over the same span, one of them able to match
 * nothing. For every `}` in the input the engine has two ways to account for it —
 * inside `[^}]*`'s next iteration, or as the optional `\}` — and it tries them in
 * both orders before giving up on that path. That is exponential in the number of
 * braces after the match point, not linear.
 *
 * Measured on this file: the safe alternative runs in 0ms and the nested one had
 * not returned after two minutes. It was not slow, it was non-terminating, and
 * because the failure mode is a spinning regex rather than a rejected promise,
 * `--testTimeout` did not fire and neither did Ctrl-C on the parent process. The
 * consequence was that `npm test` never reached its summary at all, so the one
 * test guarding the responsive rules was also the reason no test result could be
 * read. A guard that cannot run is not a guard.
 *
 * So the body is found by counting braces, which is linear and always terminates.
 * Counting is also the only version that is actually correct: this stylesheet
 * nests — `@media` inside a comment-free block, media blocks inside media blocks
 * at the 768px breakpoint — so any regex bounded by the first `}` or by a newline
 * silently returns a truncated rule and then asserts against the wrong text.
 */

export interface CssBlock {
  /** The full text from the opening selector through its closing brace. */
  text: string;
  /** Everything between the outermost braces. */
  body: string;
  /** Character offset of the opening brace, for error messages. */
  start: number;
}

/**
 * The body of the first at-rule or rule whose prelude contains `prelude`.
 *
 * `prelude` is matched as a substring, not a pattern, so the caller passes the
 * literal text it expects to find — `@media (max-width:768px)` — and cannot
 * accidentally introduce an unescaped `.` or a stray group.
 *
 * Returns `null` when the prelude is absent or its braces do not balance, so a
 * caller asserting on the result fails with a readable message rather than
 * silently testing an empty string.
 */
export function cssBlock(source: string, prelude: string): CssBlock | null {
  const at = source.indexOf(prelude);
  if (at === -1) return null;

  // The prelude is followed by a declaration block, so the first `{` after it
  // opens the block. `indexOf` from `at` is linear and cannot backtrack.
  const open = source.indexOf("{", at + prelude.length);
  if (open === -1) return null;

  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const c = source[i];
    // Braces inside a comment or a string do not nest, and this stylesheet has
    // both — long explanatory comments carry example selectors. Skipping the
    // comment is what keeps a `}` in prose from ending the block early.
    if (c === "/" && source[i + 1] === "*") {
      const close = source.indexOf("*/", i + 2);
      if (close === -1) return null;
      i = close + 1;
      continue;
    }
    if (c === '"' || c === "'") {
      // Same reason: a brace inside a quoted value is not a block delimiter.
      const close = source.indexOf(c, i + 1);
      if (close === -1) return null;
      i = close;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      return { text: source.slice(at, i + 1), body: source.slice(open + 1, i), start: open };
    }
  }
  return null;
}

/** Every block whose prelude contains `prelude`, in source order. */
export function cssBlocks(source: string, prelude: string): CssBlock[] {
  const found: CssBlock[] = [];
  let from = 0;
  for (;;) {
    const at = source.indexOf(prelude, from);
    if (at === -1) return found;
    const block = cssBlock(source.slice(at), prelude);
    if (!block) return found;
    found.push(block);
    from = at + block.text.length;
  }
}
