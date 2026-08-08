/**
 * A card grid whose rows come out even.
 *
 * The problem it replaces: every card section used
 * `repeat(auto-fit, minmax(280px, 1fr))`, which packs as many columns as will fit and
 * leaves whatever is left over on the last row. Six cards in a four-column space
 * render 4 + 2 — a full row and a stub. Nine render 4 + 4 + 1, which reads as a
 * mistake rather than a layout.
 *
 * `auto-fit` cannot fix this, because it decides the column count from the available
 * width and knows nothing about how many items there are. So the column count is
 * chosen here instead, from both: the widest column count the container can hold, and
 * the count that divides the items most evenly.
 *
 * Six cards become 3 + 3. Nine become 3 + 3 + 3. Seven, which no column count divides
 * evenly, becomes 4 + 3 — the closest balance available.
 *
 * The choice is made at render time from `Children.count`, not from a measurement, so
 * there is no ResizeObserver, no layout shift, and the grid is correct in the HTML
 * before any JavaScript runs. The breakpoints live in `styles/base.css`; this component
 * only supplies the three numbers they read.
 */

import { Children, type CSSProperties, type ReactNode } from "react";

/** `--container-max` (1240px) less the gutter at its `clamp()` ceiling, both sides. */
const CONTENT_WIDTH_WIDE = 1112;
/** Just under the 1000px breakpoint in base.css, less a smaller clamped gutter. */
const CONTENT_WIDTH_MEDIUM = 900;

/**
 * The most columns that fit while every card keeps at least its minimum width.
 * Accounts for the gaps, which at four columns are most of a card's width.
 */
function capacity(minWidth: number, available: number, gap: number): number {
  let columns = 1;
  while ((columns + 1) * minWidth + columns * gap <= available) columns++;
  return columns;
}

/**
 * How many cards land on the last row. A full row scores its own width.
 */
const lastRowFill = (count: number, columns: number): number =>
  count % columns === 0 ? columns : count % columns;

/**
 * How many rows a collection has to be before its last row stops mattering.
 *
 * A stub at the bottom of two or three rows is the thing that looks broken. A stub at
 * the bottom of fourteen is invisible, and narrowing every card in the list to avoid it
 * is a bad trade — which is exactly what happens without this: forty cards divide
 * evenly by two, so a pure balance metric renders the whole university directory two
 * across instead of three.
 */
const LONG_LIST_ROWS = 3;

/**
 * The column count that fills the last row best.
 *
 * The obvious metric — fewest empty cells — is wrong, and wrong in a way that only
 * shows up on real data. Empty cells reward divisibility regardless of width, so forty
 * cards prefer two columns (nothing left over) to three (one left over), and a long
 * directory silently loses a third of its width to tidy up a row nobody scrolls to.
 *
 * Filling the last row is the metric that matches what the eye actually objects to: a
 * lone card sitting under a full row. Six cards go 3 + 3, five go 3 + 2, ten go
 * 4 + 4 + 2, and eight go 3 + 3 + 2 rather than four thin rows of two.
 *
 * Only the widest two column counts are considered. Dropping further to chase a neat
 * division buys evenness with card width, and card width is the thing the layout is
 * for.
 *
 * The floor of two is load-bearing rather than tidy: every count divides by one, so a
 * single column always scores a perfect fill and would win outright for any count no
 * wider layout divides evenly. Seven cards would render one across and seven rows tall
 * on a desktop — perfectly balanced, and not what anybody asked for. Dropping to one
 * column is a decision about viewport width, made by the breakpoint in
 * `styles/base.css`, not here.
 */
export function balancedColumns(count: number, cap: number): number {
  if (count <= 1) return 1;

  const widest = Math.max(2, Math.min(cap, count));

  // Long enough that the last row is lost in the scroll: keep every card as wide as
  // it can be.
  if (count > widest * LONG_LIST_ROWS) return widest;

  const narrower = Math.max(2, widest - 1);

  // `>` not `>=`, so an equal fill keeps the wider layout.
  return lastRowFill(count, narrower) > lastRowFill(count, widest) ? narrower : widest;
}

interface CardGridProps {
  children: ReactNode;
  /** Narrowest a card may be before the grid drops a column. */
  min?: number;
  gap?: string;
  /**
   * Gap in pixels, for the capacity arithmetic only. The rendered gap is `gap`; this is
   * how wide it is assumed to be when deciding how many columns fit.
   */
  gapPx?: number;
  /**
   * Grid cells occupied, when that differs from the number of children — a card
   * carrying `gridColumn: span 2` occupies two. Balancing the children rather than the
   * cells would pick a column count that then wraps anyway.
   */
  cells?: number;
  className?: string;
  style?: CSSProperties;
  id?: string;
}

export function CardGrid({
  children,
  min = 260,
  gap = "var(--space-6)",
  gapPx = 24,
  cells,
  className,
  style,
  id,
}: CardGridProps) {
  const count = cells ?? Children.count(children);

  const wide = balancedColumns(count, capacity(min, CONTENT_WIDTH_WIDE, gapPx));
  const medium = balancedColumns(count, capacity(min, CONTENT_WIDTH_MEDIUM, gapPx));

  return (
    <div
      id={id}
      className={className ? `ct-cardgrid ${className}` : "ct-cardgrid"}
      style={
        {
          "--cg-wide": wide,
          "--cg-medium": medium,
          "--cg-gap": gap,
          ...style,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
