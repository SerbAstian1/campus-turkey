import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PasswordInput } from "@/components/PasswordInput";
import { LocaleProvider } from "@/i18n/context";

afterEach(cleanup);

describe("password visibility control", () => {
  it("reveals and hides the same password without changing its value", () => {
    render(<PasswordInput id="password" label="Password" defaultValue="secret-value" />);

    const input = screen.getByLabelText("Password") as HTMLInputElement;
    expect(input.type).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input.type).toBe("text");
    expect(input.value).toBe("secret-value");

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input.type).toBe("password");
    expect(input.value).toBe("secret-value");
  });

  it("uses the translated accessible labels", () => {
    render(
      <LocaleProvider
        locale="fr"
        messages={{
          "Show password": "Afficher le mot de passe",
          "Hide password": "Masquer le mot de passe",
        }}
      >
        <PasswordInput id="mot-de-passe" label="Mot de passe" />
      </LocaleProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Afficher le mot de passe" }));
    expect(screen.getByRole("button", { name: "Masquer le mot de passe" })).toBeTruthy();
  });

  it("does not submit its containing form when the eye button is clicked", () => {
    const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={submit}>
        <PasswordInput id="form-password" label="Password" />
      </form>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(submit).not.toHaveBeenCalled();
  });
});
