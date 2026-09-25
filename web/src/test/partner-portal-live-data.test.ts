import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const portal = readFileSync(join(__dirname, "..", "screens", "Portal.tsx"), "utf8");

describe("partner portal account data", () => {
  it("does not mix fixture counts, balances, pipelines, or names into a signed-in account", () => {
    expect(portal).not.toContain("students.length + 32");
    expect(portal).not.toContain("content.kpis.map");
    expect(portal).not.toContain("content.pipeline.map");
    expect(portal).not.toContain("content.actions.map");

    expect(portal).toContain("wallet.pendingMinor");
    expect(portal).toContain("data.pipeline.map");
  });
});
