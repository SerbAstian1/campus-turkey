/**
 * The role chooser on the sign-in page: what it changes, and what it must not pretend to.
 *
 * **The property worth defending.** `disableSignUp` is on, so no form on this page can
 * create an account for anybody. Three roles submit something a human reads; staff
 * accounts are opened internally and have no intake at all. This page has already shipped
 * the opposite once, with a "Create partner account" button that navigated and stored
 * nothing, so an applicant believed they had an account and could not sign in. A staff
 * registration form that quietly did nothing would be the same bug wearing a new hat, so
 * the tests below assert the absence of a form, not merely the presence of a message.
 *
 * **What the chooser deliberately does not do.** Authentication is by email and password;
 * the account's role lives in the database and is authoritative there. Picking "Student"
 * while holding a staff account signs you in and sends you to the staff console. The
 * chooser therefore changes the *copy* beside the sign-in form and never the credentials
 * or the outcome, and that is asserted here rather than left as an intention in a comment.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";

const go = vi.fn();
const signInWithPassword = vi.fn();
const submits: Record<string, ReturnType<typeof vi.fn>> = {};

/**
 * Real elements, for the reason the other screen tests give: DS components come from
 * `bind()` and return null without the bundle on `window`, which renders an empty
 * document and passes every negative assertion for the wrong reason.
 */
vi.mock("@/ds", () => ({
  ASSETS: "/assets",
  BrandDivider: () => null,
  Logo: () => null,
  Icon: () => null,
  Button: ({ children, fullWidth: _f, variant: _v, size: _s, icon: _i, ...rest }: React.ComponentProps<"button"> & Record<string, unknown>) =>
    React.createElement("button", { type: "button", ...rest }, children),
  Card: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", null, children),
  Checkbox: ({ id, label, ...rest }: { id: string; label: string } & React.ComponentProps<"input">) =>
    React.createElement("div", null,
      React.createElement("label", { htmlFor: id }, label),
      React.createElement("input", { id, type: "checkbox", ...rest }),
    ),
  Input: ({ id, label, icon: _icon, ...rest }: { id: string; label: string; icon?: string } & React.ComponentProps<"input">) =>
    React.createElement("div", null,
      React.createElement("label", { htmlFor: id }, label),
      React.createElement("input", { id, ...rest }),
    ),
  Select: ({ id, label, options = [], ...rest }: { id: string; label: string; options?: string[] } & React.ComponentProps<"select">) =>
    React.createElement("div", null,
      React.createElement("label", { htmlFor: id }, label),
      React.createElement("select", { id, ...rest },
        options.map((o) => React.createElement("option", { key: o, value: o }, o)),
      ),
    ),
}));

vi.mock("@/app/router", () => ({
  go,
  useHref: () => (route: string) => `/${route}`,
}));

vi.mock("@/features/auth/client", () => ({
  signInWithPassword: (...args: unknown[]) => signInWithPassword(...args),
}));

/** One recorded submit per lead kind, so a test can say which intake actually fired. */
vi.mock("@/features/leads/submit", () => ({
  useLeadSubmit: (kind: string) => {
    submits[kind] ??= vi.fn().mockResolvedValue(true);
    return { state: { status: "idle" }, submit: submits[kind]! };
  },
}));

/**
 * Stubbed so "the representative form is the real one" is assertable without dragging in
 * its own submit path. What matters here is that this page renders *that* component
 * rather than a second copy of the same fields.
 */
vi.mock("@/screens/RepresentativeForm", () => ({
  RepresentativeForm: () =>
    React.createElement("div", { "data-testid": "representative-form" }, "representative application"),
}));

vi.mock("@/i18n/context", () => ({ useT: () => (s: string) => s }));

const PartnerLogin = (await import("@/screens/PartnerLogin")).default;

const pickRole = (name: RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const openRegister = () => fireEvent.click(screen.getByRole("button", { name: /^Register$/ }));

beforeEach(() => {
  go.mockReset();
  signInWithPassword.mockReset().mockResolvedValue({ ok: true });
  for (const key of Object.keys(submits)) delete submits[key];
});
afterEach(cleanup);

describe("the chooser", () => {
  it("offers all four kinds of account holder", () => {
    render(<PartnerLogin />);
    for (const role of [/^Student$/, /^Partner$/, /^Representative$/, /^Staff$/]) {
      expect(screen.getByRole("button", { name: role })).toBeTruthy();
    }
  });

  it("marks the chosen role as pressed, and only that one", () => {
    render(<PartnerLogin />);
    pickRole(/^Staff$/);

    expect(screen.getByRole("button", { name: /^Staff$/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /^Student$/ }).getAttribute("aria-pressed")).toBe("false");
  });
});

describe("registering, per role", () => {
  it("gives staff no form at all", () => {
    render(<PartnerLogin />);
    pickRole(/^Staff$/);
    openRegister();

    expect(screen.getByText(/Staff accounts are created for you/)).toBeTruthy();
    // The absence is the assertion. A form that silently created nothing is the exact
    // failure this page shipped once before.
    expect(document.querySelector("form")).toBeNull();
    expect(screen.queryByRole("button", { name: /send/i })).toBeNull();
  });

  it("renders the real representative application rather than a second copy", () => {
    render(<PartnerLogin />);
    pickRole(/^Representative$/);
    openRegister();

    // Reusing the component is what keeps these fields from drifting away from the ones
    // the staff queue reads.
    expect(screen.getByTestId("representative-form")).toBeTruthy();
  });

  it("asks a partner about their organisation", () => {
    render(<PartnerLogin />);
    pickRole(/^Partner$/);
    openRegister();

    expect(screen.getByLabelText(/Organisation name/)).toBeTruthy();
    expect(screen.queryByLabelText(/What do you want to study/)).toBeNull();
  });

  it("asks a student what they want to study", () => {
    render(<PartnerLogin />);
    pickRole(/^Student$/);
    openRegister();

    expect(screen.getByLabelText(/What do you want to study/)).toBeTruthy();
    expect(screen.queryByLabelText(/Organisation name/)).toBeNull();
  });

  it("submits a student enquiry as a STUDY lead with the level the API accepts", async () => {
    render(<PartnerLogin />);
    pickRole(/^Student$/);
    openRegister();

    fireEvent.change(screen.getByLabelText(/Your full name/), { target: { value: "Amina Yusuf" } });
    fireEvent.change(screen.getByLabelText(/Email address/), { target: { value: "amina@example.com" } });
    fireEvent.change(screen.getByLabelText(/Level you are applying for/), { target: { value: "Master's degree" } });
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => expect(submits.STUDY).toHaveBeenCalledOnce());
    const [payload] = submits.STUDY!.mock.calls[0]!;
    // The schema takes an enum, not the label. Sending "Master's degree" would be
    // rejected, and sending undefined would silently lose the answer.
    expect(payload).toMatchObject({ name: "Amina Yusuf", email: "amina@example.com", level: "master" });
    // Blank optionals are omitted rather than sent as empty strings.
    expect(payload).not.toHaveProperty("phone");
  });

  it("does not submit a partner lead when the student form is the one on screen", async () => {
    render(<PartnerLogin />);
    pickRole(/^Student$/);
    openRegister();

    fireEvent.change(screen.getByLabelText(/Your full name/), { target: { value: "Amina" } });
    fireEvent.change(screen.getByLabelText(/Email address/), { target: { value: "amina@example.com" } });
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => expect(submits.STUDY).toHaveBeenCalledOnce());
    // The partner hook exists either way, because hooks cannot be conditional; what
    // matters is that submitting the student form never fires the partner intake.
    expect(submits.PARTNER).not.toHaveBeenCalled();
  });
});

describe("signing in is the same for everyone", () => {
  it("asks every role for exactly one email and one password", () => {
    for (const role of [/^Student$/, /^Partner$/, /^Representative$/, /^Staff$/]) {
      render(<PartnerLogin />);
      pickRole(role);

      expect(screen.getByLabelText(/Email address/)).toBeTruthy();
      expect(screen.getByLabelText(/Password/)).toBeTruthy();
      cleanup();
    }
  });

  it("says where each role is about to land", () => {
    render(<PartnerLogin />);
    expect(screen.getByText(/your student portal/)).toBeTruthy();

    pickRole(/^Staff$/);
    expect(screen.getByText(/the staff console/)).toBeTruthy();

    pickRole(/^Representative$/);
    expect(screen.getByText(/your representative portal/)).toBeTruthy();
  });

  it("does not gate the credentials on the chosen role", async () => {
    render(<PartnerLogin />);
    // A staff member who left the chooser on "Student" still signs in. The account's
    // real role decides where they go, and the junction resolves that server-side.
    pickRole(/^Student$/);

    fireEvent.change(screen.getByLabelText(/Email address/), { target: { value: "deniz@campusturkey.org" } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: "correct horse" } });
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => expect(signInWithPassword).toHaveBeenCalledOnce());
    expect(signInWithPassword).toHaveBeenCalledWith("deniz@campusturkey.org", "correct horse");
    // One destination for all four; the dashboard forwards by the real role.
    await waitFor(() => expect(go).toHaveBeenCalledWith("portal/dashboard"));
  });
});
