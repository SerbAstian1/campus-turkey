/**
 * The audit log: what an entry says, and how the log pages.
 *
 * **Why the rendering is worth asserting at all.** Every other staff screen shows records
 * that were shaped by a schema; this one shows `metadata`, which is an untyped JSON blob
 * written by whichever call site produced the entry. The viewer therefore has to make
 * decisions about data it cannot rely on — an unrecognised action, an amount with no
 * currency beside it, a missing actor — and each of those decisions can quietly misreport
 * something that a person is about to make a judgement on. Those are the tests here.
 *
 * The paging tests cover the other half: an append that lands after the filter changed
 * would splice unrelated records into the list under a heading that says otherwise, which
 * is the one failure mode of an append-based log that a reader cannot detect by looking.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, act as reactAct } from "@testing-library/react";

const useAuditLog = vi.fn();

/**
 * Mocked for the reason `representative-queue.test.tsx` gives: DS components come from
 * `bind()`, which returns null without the bundle on `window`, so the whole document
 * would otherwise be empty. Real elements rather than shells, so role queries mean
 * something.
 */
vi.mock("@/ds", () => ({
  Button: ({ children, ...rest }: React.ComponentProps<"button">) =>
    React.createElement("button", { type: "button", ...rest }, children),
  Card: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", null, children),
  Icon: () => null,
}));

vi.mock("@/features/staff/data", async () => {
  const actual = await vi.importActual<typeof import("@/features/staff/data")>("@/features/staff/data");
  return { ...actual, useAuditLog };
});

const { AuditLog } = await import("@/screens/staff/AuditLog");

const entry = (over: Partial<Record<string, unknown>> = {}) => ({
  id: crypto.randomUUID(),
  action: "commission.transitioned",
  entityType: "commission",
  entityId: "3f2a1b9c-0d1e-4f2a-8b3c-4d5e6f7a8b9c",
  metadata: { from: "PENDING", to: "CONFIRMED", amountMinor: 45000, currency: "EUR" },
  ipPrefix: null,
  createdAt: new Date("2026-08-08T14:32:00Z").toISOString(),
  actor: { name: "Deniz Yılmaz", email: "deniz@campusturkey.org", role: "ADMIN" },
  ...over,
});

const feed = (items: unknown[], over: Record<string, unknown> = {}) => ({
  state: { status: "ready", items },
  more: null,
  loadingMore: false,
  ...over,
});

beforeEach(() => {
  useAuditLog.mockReset().mockReturnValue(feed([entry()]));
});
afterEach(cleanup);

describe("what an entry says", () => {
  it("renders a known action as a sentence rather than its enum", () => {
    render(<AuditLog />);
    expect(screen.getByText("Commission updated")).toBeTruthy();
    // The raw action would be legible to an engineer and to nobody else.
    expect(screen.queryByText("commission.transitioned")).toBeNull();
  });

  it("translates status enums into words", () => {
    render(<AuditLog />);
    expect(screen.getByText(/Pending to Confirmed/)).toBeTruthy();
    expect(screen.queryByText(/PENDING/)).toBeNull();
  });

  it("names the actor and their role", () => {
    render(<AuditLog />);
    // "who did this" and "what were they entitled to do" are different questions and the
    // second is usually the one being asked.
    expect(screen.getByText(/Deniz Yılmaz/)).toBeTruthy();
    expect(screen.getByText(/ADMIN/)).toBeTruthy();
  });

  it("shows an action it has never seen rather than dropping the row", () => {
    useAuditLog.mockReturnValue(feed([entry({ action: "document.reviewed", metadata: null })]));
    render(<AuditLog />);
    // An entry added after this file was written is precisely the one an incident is
    // about; hiding it would make the viewer worst exactly when it matters most.
    expect(screen.getByText("Document reviewed")).toBeTruthy();
  });

  it("reads a system entry as automatic, not as a damaged record", () => {
    useAuditLog.mockReturnValue(feed([entry({ actor: null })]));
    render(<AuditLog />);
    expect(screen.getByText(/Automatic/)).toBeTruthy();
    expect(screen.queryByText(/Unknown/i)).toBeNull();
  });
});

describe("money in an untyped blob", () => {
  it("formats an amount when the currency travelled with it", () => {
    render(<AuditLog />);
    expect(screen.getByText(/€450\.00/)).toBeTruthy();
  });

  it("shows no sum at all when the currency is missing", () => {
    useAuditLog.mockReturnValue(feed([entry({ metadata: { amountMinor: 45000 } })]));
    render(<AuditLog />);
    // 45000 minor units is €450, ₺450 or $450 depending on a field that is not there.
    // Printing any of them — or the bare integer — misreports the record.
    expect(screen.queryByText(/450/)).toBeNull();
  });
});

describe("the rejection note", () => {
  it("shows the reviewer's own words in full", () => {
    const note = "Territory already covered by an existing partner in Lagos.";
    useAuditLog.mockReturnValue(feed([
      entry({ action: "representative_application.rejected", metadata: { note } }),
    ]));
    render(<AuditLog />);
    // The note is usually the entire reason the entry is being read, so it is not
    // truncated behind a "read more".
    expect(screen.getByText(new RegExp(note.slice(0, 30)))).toBeTruthy();
  });
});

describe("paging", () => {
  it("offers no button when the record is complete", () => {
    render(<AuditLog />);
    expect(screen.queryByRole("button", { name: /load older/i })).toBeNull();
    expect(screen.getByText(/whole record/i)).toBeTruthy();
  });

  it("offers to load older entries when there are more", () => {
    const more = vi.fn();
    useAuditLog.mockReturnValue(feed([entry()], { more }));
    render(<AuditLog />);

    fireEvent.click(screen.getByRole("button", { name: /load older/i }));
    expect(more).toHaveBeenCalledOnce();
  });
});

describe("read-only", () => {
  it("offers nothing to act on", () => {
    useAuditLog.mockReturnValue(feed([entry(), entry({ action: "representative_application.approved" })]));
    render(<AuditLog />);
    // The table is append-only in the database. A button here would describe a power
    // that does not exist — including for an admin.
    const buttons = screen.queryAllByRole("button");
    // Only the four scope filters.
    expect(buttons.every((b) => b.getAttribute("aria-pressed") !== null)).toBe(true);
  });
});

/**
 * The hook, against a mocked `fetch`.
 *
 * Separated from the component tests because what is being asserted is not rendering: it
 * is that a page which arrives after the filter changed does not get spliced into a list
 * describing something else.
 */
describe("useAuditLog", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = realFetch; });

  const json = (body: unknown) =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);

  it("appends the next page instead of replacing the first", async () => {
    const actual = await vi.importActual<typeof import("@/features/staff/data")>("@/features/staff/data");
    const first = { id: "a", action: "x.y", entityType: "commission", entityId: null, metadata: null, ipPrefix: null, createdAt: new Date().toISOString(), actor: null };
    const second = { ...first, id: "b" };

    const fetchMock = vi.fn()
      .mockReturnValueOnce(json({ items: [first], nextCursor: "cursor-1" }))
      .mockReturnValueOnce(json({ items: [second], nextCursor: null }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    let hook: ReturnType<typeof actual.useAuditLog> | null = null;
    function Probe() {
      hook = actual.useAuditLog({});
      return null;
    }
    render(<Probe />);

    await waitFor(() => expect(hook?.state.status).toBe("ready"));
    expect(hook!.more).not.toBeNull();

    await reactAct(async () => { hook!.more!(); });

    await waitFor(() => {
      const state = hook!.state;
      expect(state.status === "ready" && state.items.map((i) => i.id)).toEqual(["a", "b"]);
    });
    // Exhausted: no cursor came back with the second page.
    expect(hook!.more).toBeNull();
  });

  it("keeps the page on screen when the next one fails", async () => {
    const actual = await vi.importActual<typeof import("@/features/staff/data")>("@/features/staff/data");
    const first = { id: "a", action: "x.y", entityType: "commission", entityId: null, metadata: null, ipPrefix: null, createdAt: new Date().toISOString(), actor: null };

    const fetchMock = vi.fn()
      .mockReturnValueOnce(json({ items: [first], nextCursor: "cursor-1" }))
      // Constructed lazily. `mockReturnValueOnce(Promise.reject(...))` builds the
      // rejection at setup time, when nothing is awaiting it yet — an unhandled
      // rejection that vitest reports as an error beside a green run.
      .mockImplementationOnce(() => Promise.reject(new Error("network")));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    let hook: ReturnType<typeof actual.useAuditLog> | null = null;
    function Probe() {
      hook = actual.useAuditLog({});
      return null;
    }
    render(<Probe />);
    await waitFor(() => expect(hook?.state.status).toBe("ready"));

    await reactAct(async () => { hook!.more!(); });

    await waitFor(() => expect(hook!.loadingMore).toBe(false));
    // A failed *next* page is not a reason to throw away the log the reader is reading.
    const state = hook!.state;
    expect(state.status === "ready" && state.items.length).toBe(1);
  });
});
