/**
 * Ambient module declarations.
 *
 * The Vite build got `?raw` typing from `vite/client`, which a Next.js project does not
 * include. The suffix still works under Vitest — which is the only place it is used, to
 * read the design system bundle as text for the Navbar test — so it just needs a type.
 */
declare module "*?raw" {
  const contents: string;
  export default contents;
}
