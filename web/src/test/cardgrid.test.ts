/**
 * Column balancing.
 *
 * The rule in one line: rows should come out even, and the widest even layout wins.
 * These cases are the ones that were visibly wrong before — six cards rendering 4 + 2,
 * nine rendering 4 + 4 + 1.
 */

import { describe, it, expect } from "vitest";
import { balancedColumns } from "@/components/CardGrid";

/** How the rows actually break, so a failure reads as a layout rather than a number. */
const rows = (count: number, columns: number): number[] => {
  const out: number[] = [];
  for (let left = count; left > 0; left -= columns) out.push(Math.min(columns, left));
  return out;
};

describe("balancedColumns", () => {
  it("splits six cards evenly instead of leaving a stub row", () => {
    // The reported case. auto-fit gave 4 + 2 in a four-column space.
    expect(balancedColumns(6, 4)).toBe(3);
    expect(rows(6, balancedColumns(6, 4))).toEqual([3, 3]);
  });

  it("splits nine into three even rows rather than 4 + 4 + 1", () => {
    expect(rows(9, balancedColumns(9, 4))).toEqual([3, 3, 3]);
  });

  it("keeps four across when four fit", () => {
    expect(rows(4, balancedColumns(4, 4))).toEqual([4]);
  });

  it("drops four to 2 + 2 when only three columns fit", () => {
    // 3 + 1 strands a lone card; 2 + 2 is even.
    expect(rows(4, balancedColumns(4, 3))).toEqual([2, 2]);
  });

  it("gives five the closest balance available, preferring the wider row first", () => {
    // Nothing divides five evenly. 3 + 2 strands one cell, so does 2 + 2 + 1;
    // the wider, shorter one wins the tie.
    expect(rows(5, balancedColumns(5, 4))).toEqual([3, 2]);
  });

  it("puts eight in two full rows of four", () => {
    expect(rows(8, balancedColumns(8, 4))).toEqual([4, 4]);
  });

  it("keeps a long list at full width rather than narrowing it to divide evenly", () => {
    // The university directory. Forty cards divide evenly by two, so a fewest-empty
    // -cells metric renders the whole listing two across and loses a third of its
    // width to tidy up a row nobody scrolls to.
    expect(balancedColumns(40, 3)).toBe(3);
    expect(balancedColumns(40, 4)).toBe(4);
  });

  it("does not narrow a ten-card grid to five thin rows", () => {
    // 4 + 4 + 2 beats 2 x 5, even though the latter has no empty cells at all.
    expect(rows(10, balancedColumns(10, 4))).toEqual([4, 4, 2]);
  });

  it("prefers three wide rows to four narrow ones for eight cards in a tight space", () => {
    expect(rows(8, balancedColumns(8, 3))).toEqual([3, 3, 2]);
  });

  it("only ever steps down one column, never further", () => {
    for (let count = 2; count <= 24; count++) {
      for (const cap of [2, 3, 4, 5]) {
        const columns = balancedColumns(count, cap);
        const widest = Math.max(2, Math.min(cap, count));
        expect(columns).toBeGreaterThanOrEqual(Math.max(2, widest - 1));
      }
    }
  });

  it("never collapses a prime count to a single column", () => {
    // The bug this floor exists for: every count is divisible by one, so one column
    // scores zero empty cells and would win outright for 7, 11 or 13.
    for (const count of [7, 11, 13]) {
      expect(balancedColumns(count, 4)).toBeGreaterThanOrEqual(2);
    }
  });

  it("gives seven a full first row rather than seven rows of one", () => {
    expect(balancedColumns(7, 4)).toBe(4);
    expect(rows(7, 4)).toEqual([4, 3]);
  });

  it("never asks for more columns than there are cards", () => {
    for (const count of [1, 2, 3]) {
      expect(balancedColumns(count, 6)).toBeLessThanOrEqual(Math.max(count, 2));
    }
  });

  it("returns a single column for a single card", () => {
    expect(balancedColumns(1, 4)).toBe(1);
    expect(balancedColumns(0, 4)).toBe(1);
  });

  it("respects the cap — cards never get narrower than their minimum", () => {
    for (let count = 2; count <= 20; count++) {
      for (const cap of [2, 3, 4, 5]) {
        expect(balancedColumns(count, cap)).toBeLessThanOrEqual(Math.max(cap, 2));
      }
    }
  });

  it("never strands more empty cells than a full row", () => {
    for (let count = 2; count <= 24; count++) {
      for (const cap of [2, 3, 4, 5]) {
        const columns = balancedColumns(count, cap);
        const remainder = count % columns;
        const empty = remainder === 0 ? 0 : columns - remainder;
        expect(empty).toBeLessThan(columns);
      }
    }
  });
});
