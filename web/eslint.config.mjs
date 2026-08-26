import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

/**
 * Lint.
 *
 * There was no lint layer at all before this: `next lint` prompted for setup rather
 * than running, so the rules typecheck cannot replicate — the accessibility set and
 * the rules-of-hooks checks — were absent entirely. That was audit finding m4.
 *
 * `next/core-web-vitals` is what carries them: `jsx-a11y` for the markup rules and
 * `react-hooks` for the dependency and call-order rules, which are the two classes of
 * defect that reach production looking like working code. `next/typescript` adds the
 * TypeScript-aware rules on top of a `tsc --noEmit` that already blocks CI.
 *
 * Both configs are still eslintrc-shaped, so `FlatCompat` is the bridge rather than a
 * legacy holdover — it is what Next's own scaffold emits for ESLint 9.
 */
const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const config = [
  {
    /*
     * Build output, coverage reports and the generated Prisma client. Linting
     * generated files reports faults nobody can fix in the file they appear in.
     */
    ignores: [
      ".next/**",
      "out/**",
      "coverage/**",
      "node_modules/**",
      "next-env.d.ts",
      "src/generated/**",
      /*
       * Vendored, already-built assets. `public/ds/_ds_bundle.js` is the design system
       * as shipped and `lucide.min.js` is minified upstream — it exceeds the parser's
       * call stack and crashes the run outright rather than reporting anything.
       */
      "public/**",
    ],
  },

  ...compat.extends("next/core-web-vitals", "next/typescript"),

  {
    rules: {
      /*
       * Off, because this application does not navigate with `next/link` anywhere.
       *
       * The design system renders plain `<a>` elements, and `usePlaceholderLinks()` in
       * `src/app/router.ts` intercepts internal clicks document-wide and hands them to
       * `router.push()`. So these anchors *are* client-side navigation; the rule reads
       * the markup and cannot see the delegated handler. Its advice would also be
       * actively wrong in `app/global-error.tsx`, where the anchor is deliberately a
       * cold load because the router is part of what failed.
       */
      "@next/next/no-html-link-for-pages": "off",

      /*
       * Off, for a decision that was measured rather than assumed. Nothing here uses
       * `next/image`: the brand marks belong to a classic script outside React's
       * control, and the decorative images are positioned backgrounds already cut to a
       * 31KB map and a 25KB mark. The full reasoning, and the condition under which it
       * should be revisited, is in the `images` block of `next.config.ts`.
       */
      "@next/next/no-img-element": "off",

      /*
       * On, and not inherited from either preset. `new Function` is `eval` wearing a
       * constructor, and the two places that legitimately need it — the tests that
       * execute the design system bundle — already carry a disable comment saying so.
       * Enabling the rule is what makes those comments mean something instead of
       * being reported as unused directives.
       */
      "no-new-func": "error",

      /*
       * An unused variable is a fact, not a style preference: it is either a leftover
       * or a mistake about what a function returns. The underscore prefix is the
       * escape hatch, for the positional arguments a signature forces you to name.
       */
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },

  {
    /*
     * Tests and build scripts. `any` is how you construct a deliberately malformed
     * input, and asserting on a stub often needs a cast the production rule would
     * refuse — the point of the test is that the shape is wrong.
     */
    files: ["src/test/**", "tests/**", "scripts/**", "**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
];

export default config;
