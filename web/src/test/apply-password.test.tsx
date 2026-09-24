import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const submit = vi.fn();

vi.mock("@/ds", () => ({
  Badge: ({ children }: { children?: React.ReactNode }) => React.createElement("span", null, children),
  BrandDivider: () => null,
  Button: ({ children, icon: _icon, variant: _variant, size: _size, ...rest }: React.ComponentProps<"button"> & Record<string, unknown>) =>
    React.createElement("button", rest, children),
  Card: ({ children }: { children?: React.ReactNode }) => React.createElement("div", null, children),
  Checkbox: ({ id, label, description: _description, ...rest }: { id: string; label: string; description?: string } & React.ComponentProps<"input">) =>
    React.createElement("div", null,
      React.createElement("label", { htmlFor: id }, label),
      React.createElement("input", { id, type: "checkbox", ...rest }),
    ),
  Icon: () => null,
  Input: ({ id, label, icon: _icon, hint: _hint, ...rest }: { id: string; label: string; icon?: string; hint?: string } & React.ComponentProps<"input">) =>
    React.createElement("div", null,
      React.createElement("label", { htmlFor: id }, label),
      React.createElement("input", { id, ...rest }),
    ),
  Select: ({ id, label, options = [], ...rest }: { id: string; label: string; options?: readonly string[] } & React.ComponentProps<"select">) =>
    React.createElement("div", null,
      React.createElement("label", { htmlFor: id }, label),
      React.createElement("select", { id, ...rest },
        options.map((option) => React.createElement("option", { key: option }, option)),
      ),
    ),
  StepIndicator: () => null,
  ScrollReveal: ({ children }: { children?: React.ReactNode }) => React.createElement("div", null, children),
}));

vi.mock("@/components/Common", () => ({ BrandMark: () => null }));
vi.mock("@/app/router", () => ({ go: vi.fn() }));
vi.mock("@/features/leads/submit", () => ({
  useLeadSubmit: () => ({ state: { status: "idle" }, submit }),
}));
vi.mock("@/features/leads/captcha", () => ({ CaptchaField: () => null }));
vi.mock("@/i18n/context", () => ({
  useLocale: () => "en",
  useT: () => (message: string, values?: Record<string, unknown>) =>
    values?.["count"] ? message.replace("{count}", String(values["count"])) : message,
}));
vi.mock("@/i18n/options", () => ({
  useTranslatedOptions: (options: readonly string[]) => ({
    options,
    display: (value: string) => value,
    toEnglish: (value: string) => value,
  }),
}));
vi.mock("@/screens/shared", () => ({
  ConsentPrivacyNote: () => null,
  FieldErrors: () => null,
}));

const Apply = (await import("@/screens/Apply")).default;

beforeEach(() => submit.mockReset().mockResolvedValue(true));
afterEach(cleanup);

describe("the main student application password", () => {
  it("asks for a password and refuses to advance when it is too short", () => {
    render(<Apply />);
    expect(screen.getByLabelText(/^Create password$/)).toBeTruthy();
    expect(screen.getByLabelText(/^Confirm password$/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/^Create password$/), { target: { value: "short" } });
    fireEvent.change(screen.getByLabelText(/^Confirm password$/), { target: { value: "short" } });
    fireEvent.submit(document.querySelector("form")!);

    expect(screen.getByRole("alert").textContent).toContain("12");
    expect(screen.queryByLabelText(/^Study level$/)).toBeNull();
  });

  it("submits the chosen password with the STUDY lead", async () => {
    render(<Apply />);
    fireEvent.change(screen.getByLabelText(/^Create password$/), { target: { value: "a-secure-password" } });
    fireEvent.change(screen.getByLabelText(/^Confirm password$/), { target: { value: "a-secure-password" } });

    fireEvent.submit(document.querySelector("form")!);
    fireEvent.submit(document.querySelector("form")!);
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => expect(submit).toHaveBeenCalledOnce());
    expect(submit.mock.calls[0]![2]).toBe("a-secure-password");
  });
});
