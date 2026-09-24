import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const act = vi.fn();
const reload = vi.fn();
const useLeadInbox = vi.fn();

vi.mock("@/ds", () => ({
  Button: ({ children, ...rest }: React.ComponentProps<"button">) =>
    React.createElement("button", { type: "button", ...rest }, children),
  Card: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", null, children),
  Icon: () => null,
  Input: (props: React.ComponentProps<"input">) => React.createElement("input", props),
  Select: (props: React.ComponentProps<"select">) => React.createElement("select", props),
}));

vi.mock("@/features/staff/data", async () => {
  const actual = await vi.importActual<typeof import("@/features/staff/data")>("@/features/staff/data");
  return { ...actual, act, useLeadInbox };
});

const { LeadInbox } = await import("@/screens/staff/LeadInbox");

const now = new Date();
const lead = {
  id: "0f6d5c2e-2f3a-4a1b-9c7d-9a1f2b3c4d5e",
  kind: "CONTACT" as const,
  email: "amina@example.com",
  name: "Amina Yusuf",
  phone: null,
  country: "Nigeria",
  serviceInterest: null,
  status: "NEW" as const,
  assignedToUserId: null,
  consentAt: now.toISOString(),
  retentionUntil: new Date(now.getTime() + 86_400_000).toISOString(),
  createdAt: now.toISOString(),
  inquiryCount: 1,
  latest: {
    id: "1f6d5c2e-2f3a-4a1b-9c7d-9a1f2b3c4d5e",
    type: "CONTACT" as const,
    subject: null,
    message: "Please call me.",
    payload: {},
    status: "OPEN" as const,
    createdAt: now.toISOString(),
    retentionUntil: new Date(now.getTime() + 86_400_000).toISOString(),
  },
};

beforeEach(() => {
  act.mockReset().mockResolvedValue({ ok: true });
  reload.mockReset();
  useLeadInbox.mockReset().mockReturnValue({ status: "ready", items: [lead], reload });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("deleting an enquiry", () => {
  it("confirms, deletes, and reloads the inbox", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<LeadInbox canApprove={false} />);

    fireEvent.click(screen.getByRole("button", { name: `Actions for ${lead.name}` }));
    fireEvent.click(screen.getByRole("menuitem", { name: /delete enquiry/i }));

    await waitFor(() => expect(act).toHaveBeenCalledWith(
      `/api/staff/leads/${lead.id}`,
      undefined,
      "DELETE",
    ));
    await waitFor(() => expect(reload).toHaveBeenCalledOnce());
  });

  it("explains that deleting a converted application also closes its login", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    useLeadInbox.mockReturnValue({
      status: "ready",
      items: [{
        ...lead,
        kind: "STUDY" as const,
        status: "CONVERTED" as const,
        latest: { ...lead.latest, type: "STUDY" as const },
      }],
      reload,
    });
    render(<LeadInbox canApprove={false} />);

    fireEvent.click(screen.getByRole("button", { name: `Actions for ${lead.name}` }));
    fireEvent.click(screen.getByRole("menuitem", { name: /delete application/i }));
    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/login will also be permanently closed/i));
    expect(act).not.toHaveBeenCalled();
  });
});
