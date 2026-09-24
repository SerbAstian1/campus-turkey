"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/ds";

export interface ItemMenuAction {
  label: string;
  icon: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

/**
 * The shared vertical overflow menu used by portal list items.
 *
 * It deliberately renders ordinary buttons inside an ARIA menu: actions remain usable
 * with a keyboard, Escape returns focus to the trigger, and clicking outside closes it.
 */
export function ItemOverflowMenu({
  label,
  actions,
}: {
  label: string;
  actions: readonly ItemMenuAction[];
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const choose = (action: ItemMenuAction) => {
    if (action.disabled) return;
    setOpen(false);
    action.onSelect();
  };

  return (
    <div ref={root} style={{ position: "relative", flex: "none" }}>
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 40, height: 40, padding: 0, border: "1px solid transparent",
          borderRadius: "var(--radius-circle)", background: open ? "var(--green-050)" : "transparent",
          color: "var(--text-body)", cursor: "pointer",
        }}
      >
        <Icon name="ellipsis-vertical" size={19} />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={label}
          style={{
            position: "absolute", insetInlineEnd: 0, top: "calc(100% + 4px)", zIndex: 80,
            width: 210, padding: 6, border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)", background: "var(--surface-page)",
            boxShadow: "var(--shadow-float)",
          }}
        >
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              disabled={action.disabled}
              onClick={() => choose(action)}
              style={{
                display: "flex", alignItems: "center", gap: "var(--space-3)", width: "100%",
                minHeight: 40, padding: "8px 10px", border: "none", borderRadius: "var(--radius-sm)",
                background: "transparent", cursor: action.disabled ? "not-allowed" : "pointer",
                color: action.danger ? "var(--status-danger)" : "var(--text-heading)",
                opacity: action.disabled ? .5 : 1, textAlign: "start",
                fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)",
              }}
            >
              <Icon name={action.icon} size={16} />
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
