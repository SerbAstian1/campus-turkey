/**
 * The representative application queue: who may decide, and what a decision sends.
 *
 * **This queue admits a new principal, which none of the other three do.** A payout moves
 * money that already belongs to somebody; approving here creates a login that will hold a
 * balance, submit leads and be owed commission. The endpoint gates it behind
 * `APPROVE_REPRESENTATIVE_APPLICATION` — admin only — while any staff member may read the
 * queue. An interface that offered the buttons to support staff would be inviting a 403,
 * and worse, implying an authority they do not have.
 *
 * The rejection note is the other rule with teeth. The API refuses a rejection without
 * one, and the note is the entire record of why afterwards, so the button stays inert
 * until there is a reason rather than letting the reviewer discover the rule on submit.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";

const act = vi.fn();
const useRepresentativeApplications = vi.fn();

/**
 * The design system is mocked, and that is a deliberate limit on what this test claims.
 *
 * Its components come from `bind()`, which returns `null` when the bundle is not on
 * `window` — so without this every assertion below would fail against an empty document,
 * which is exactly what happened first. `navbar-partner-login.test.tsx` solves the same
 * problem by evaluating the real bundle, because what it asserts *is* the real Navbar's
 * behaviour. What this file asserts is the queue's: who is offered a decision, and what
 * that decision sends. The button is incidental to both.
 *
 * The stand-ins are real elements rather than empty shells — a real `<button>` so role
 * queries mean something, and a real `<label for>`/`<input id>` pair so the label
 * association is exercised rather than assumed.
 */
vi.mock("@/ds", () => ({
  Button: ({ children, ...rest }: React.ComponentProps<"button">) =>
    React.createElement("button", { type: "button", ...rest }, children),
  Card: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", null, children),
  Icon: () => null,
  Input: ({ id, label, hint, ...rest }: { id: string; label: string; hint?: string } & React.ComponentProps<"input">) =>
    React.createElement("div", null,
      React.createElement("label", { htmlFor: id }, label),
      React.createElement("input", { id, ...rest }),
      hint ? React.createElement("span", null, hint) : null,
    ),
}));

vi.mock("@/features/staff/data", async () => {
  const actual = await vi.importActual<typeof import("@/features/staff/data")>("@/features/staff/data");
  return { ...actual, act, useRepresentativeApplications };
});

const { RepresentativeQueue } = await import("@/screens/staff/RepresentativeQueue");

const application = {
  id: "0f6d5c2e-2f3a-4a1b-9c7d-9a1f2b3c4d5e",
  fullName: "Amina Yusuf",
  organizationName: "Sahel Education Partners",
  country: "Nigeria",
  territory: "West Africa",
  email: "amina@example.com",
  phone: "+234 800 000 0000",
  message: "We place around forty students a year and would like to represent you in Lagos.",
  status: "PENDING" as const,
  reviewNote: null,
  reviewedAt: null,
  createdAt: new Date().toISOString(),
  reviewedBy: null,
};

const feed = (items: unknown[]) => ({ status: "ready", items, reload: vi.fn() });

beforeEach(() => {
  act.mockReset().mockResolvedValue({ ok: true });
  useRepresentativeApplications.mockReset().mockReturnValue(feed([application]));
});
afterEach(cleanup);

describe("who may decide", () => {
  it("shows the applicant to a reader who cannot decide", () => {
    render(<RepresentativeQueue canDecide={false} />);
    expect(screen.getByText("Amina Yusuf")).toBeTruthy();
    expect(screen.getByText(/forty students a year/)).toBeTruthy();
  });

  it("offers no decision buttons to a reader who cannot decide", () => {
    render(<RepresentativeQueue canDecide={false} />);
    // Support and finance read the queue; only an admin gets the buttons.
    expect(screen.queryByRole("button", { name: /approve/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /reject/i })).toBeNull();
  });

  it("offers both decisions to an admin", () => {
    render(<RepresentativeQueue canDecide />);
    expect(screen.getByRole("button", { name: /approve/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /reject/i })).toBeTruthy();
  });
});

describe("deciding", () => {
  it("will not confirm a rejection until a reason is given", async () => {
    render(<RepresentativeQueue canDecide />);
    fireEvent.click(screen.getByRole("button", { name: /^reject$/i }));

    const confirm = screen.getByRole("button", { name: /confirm rejection/i }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/reason/i), { target: { value: "Territory already covered." } });
    await waitFor(() => expect((screen.getByRole("button", { name: /confirm rejection/i }) as HTMLButtonElement).disabled).toBe(false));
  });

  it("sends the reason with a rejection", async () => {
    render(<RepresentativeQueue canDecide />);
    fireEvent.click(screen.getByRole("button", { name: /^reject$/i }));
    fireEvent.change(screen.getByLabelText(/reason/i), { target: { value: "Territory already covered." } });
    fireEvent.click(screen.getByRole("button", { name: /confirm rejection/i }));

    await waitFor(() => expect(act).toHaveBeenCalledOnce());
    const [path, body] = act.mock.calls[0]!;
    expect(path).toBe(`/api/staff/representative-applications/${application.id}/decision`);
    expect(body).toEqual({ decision: "REJECT", note: "Territory already covered." });
  });

  it("sends an approval with the territory, and omits it when blank", async () => {
    render(<RepresentativeQueue canDecide />);
    fireEvent.click(screen.getByRole("button", { name: /^approve$/i }));

    // Prefilled from what the applicant asked for; a reviewer may narrow it.
    fireEvent.change(screen.getByLabelText(/territory/i), { target: { value: "Lagos only" } });
    fireEvent.click(screen.getByRole("button", { name: /confirm approval/i }));
    await waitFor(() => expect(act).toHaveBeenCalledOnce());
    expect(act.mock.calls[0]![1]).toEqual({ decision: "APPROVE", territory: "Lagos only" });

    cleanup();
    act.mockClear();
    render(<RepresentativeQueue canDecide />);
    fireEvent.click(screen.getByRole("button", { name: /^approve$/i }));
    fireEvent.change(screen.getByLabelText(/territory/i), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /confirm approval/i }));
    await waitFor(() => expect(act).toHaveBeenCalledOnce());
    // Whitespace is not a territory; the field is omitted so the server keeps its default.
    expect(act.mock.calls[0]![1]).toEqual({ decision: "APPROVE" });
  });

  it("surfaces the server's refusal rather than a generic failure", async () => {
    act.mockResolvedValue({ ok: false, message: "That application was already decided." });
    render(<RepresentativeQueue canDecide />);
    fireEvent.click(screen.getByRole("button", { name: /^approve$/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm approval/i }));

    // The API writes its refusals for a person to read; repeating one beats inventing one.
    await waitFor(() => expect(screen.getByText(/already decided/i)).toBeTruthy());
  });
});

describe("an application already decided", () => {
  const decided = {
    ...application,
    status: "REJECTED" as const,
    reviewNote: "Territory already covered.",
    reviewedAt: new Date().toISOString(),
    reviewedBy: { name: "Deniz", email: "deniz@campusturkey.org" },
  };

  it("stays in the list, carrying who decided and why", () => {
    useRepresentativeApplications.mockReturnValue(feed([decided]));
    render(<RepresentativeQueue canDecide />);
    // A queue that hides its own history makes the audit log the only way to answer
    // "did we already say no to these people?".
    expect(screen.getByText(/Rejected by Deniz/)).toBeTruthy();
    expect(screen.getByText(/Territory already covered/)).toBeTruthy();
  });

  it("offers no buttons to decide it again", () => {
    useRepresentativeApplications.mockReturnValue(feed([decided]));
    render(<RepresentativeQueue canDecide />);
    expect(screen.queryByRole("button", { name: /^approve$/i })).toBeNull();
  });
});
