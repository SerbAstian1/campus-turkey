import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/ds", () => ({
  Icon: ({ name }: { name: string }) => React.createElement("span", { "data-icon": name }),
}));

const { ItemOverflowMenu } = await import("@/components/ItemOverflowMenu");

afterEach(cleanup);

describe("ItemOverflowMenu", () => {
  it("keeps item actions hidden until the three-dot trigger is opened", () => {
    render(
      <ItemOverflowMenu
        label="Actions for Amina"
        actions={[{ label: "Rename", icon: "pencil", onSelect: vi.fn() }]}
      />,
    );

    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Actions for Amina" }));
    expect(screen.getByRole("menu", { name: "Actions for Amina" })).toBeTruthy();
  });

  it("runs the selected action once and closes", () => {
    const rename = vi.fn();
    render(
      <ItemOverflowMenu
        label="Student actions"
        actions={[{ label: "Rename", icon: "pencil", onSelect: rename }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Student actions" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));

    expect(rename).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes on Escape and returns focus to its trigger", () => {
    render(
      <ItemOverflowMenu
        label="Application actions"
        actions={[{ label: "Copy number", icon: "copy", onSelect: vi.fn() }]}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Application actions" });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
