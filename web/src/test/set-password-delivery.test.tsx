import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const requestSetupCode = vi.fn();
const setPasswordWithCode = vi.fn();
const signInWithPassword = vi.fn();

vi.mock("@/ds", () => ({
  ASSETS: "/assets",
  BrandDivider: () => null,
  Icon: () => null,
  Logo: () => null,
  Button: ({ children, fullWidth: _fullWidth, variant: _variant, size: _size, icon: _icon, ...props }:
    React.ComponentProps<"button"> & Record<string, unknown>) =>
    React.createElement("button", props, children),
  Input: ({ id, label, icon: _icon, hint: _hint, ...props }:
    { id: string; label: string; icon?: string; hint?: string } & React.ComponentProps<"input">) =>
    React.createElement("div", null,
      React.createElement("label", { htmlFor: id }, label),
      React.createElement("input", { id, ...props }),
    ),
}));

vi.mock("@/app/router", () => ({ go: vi.fn() }));
vi.mock("@/i18n/context", () => ({
  useT: () => (message: string, values?: Record<string, unknown>) =>
    values?.["count"] ? message.replace("{count}", String(values["count"])) : message,
}));
vi.mock("@/features/auth/client", () => ({
  requestSetupCode: (...args: unknown[]) => requestSetupCode(...args),
  setPasswordWithCode: (...args: unknown[]) => setPasswordWithCode(...args),
  signInWithPassword: (...args: unknown[]) => signInWithPassword(...args),
}));

const SetPassword = (await import("@/screens/SetPassword")).default;

beforeEach(() => {
  requestSetupCode.mockReset().mockResolvedValue({ ok: true });
  setPasswordWithCode.mockReset().mockResolvedValue({ ok: true });
  signInWithPassword.mockReset().mockResolvedValue({ ok: false });
});
afterEach(cleanup);

describe("verification-code delivery", () => {
  it("starts sending before asking the applicant to choose a password", async () => {
    render(<SetPassword />);

    expect(screen.queryByLabelText("New password")).toBeNull();
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "applicant@example.com" },
    });
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => expect(requestSetupCode).toHaveBeenCalledWith("applicant@example.com"));
    expect(await screen.findByLabelText("New password")).toBeTruthy();
    expect(screen.getByLabelText("Email address")).toBeDisabled();
  });

  it("keeps the password and confirmation flow on the same page", async () => {
    render(<SetPassword />);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "applicant@example.com" },
    });
    fireEvent.submit(document.querySelector("form")!);

    fireEvent.change(await screen.findByLabelText("New password"), {
      target: { value: "a-secure-password" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "a-secure-password" },
    });
    fireEvent.change(screen.getByLabelText("Confirmation code"), {
      target: { value: "123456" },
    });
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() =>
      expect(setPasswordWithCode).toHaveBeenCalledWith(
        "applicant@example.com",
        "123456",
        "a-secure-password",
      ),
    );
  });

  it("can resend without hiding the password fields again", async () => {
    render(<SetPassword />);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "applicant@example.com" },
    });
    fireEvent.submit(document.querySelector("form")!);

    await screen.findByLabelText("New password");
    fireEvent.click(screen.getByRole("button", { name: "Send another code" }));

    await waitFor(() => expect(requestSetupCode).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText("New password")).toBeTruthy();
  });
});
