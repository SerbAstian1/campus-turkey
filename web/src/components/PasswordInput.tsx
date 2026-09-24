"use client";

import {
  useState,
  type CSSProperties,
  type FocusEvent,
  type InputHTMLAttributes,
} from "react";
import { Icon } from "@/ds";
import { useT } from "@/i18n/context";

export interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type" | "className" | "style"> {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  icon?: string;
  className?: string;
  /** Styles the complete labelled field, matching the design-system Input contract. */
  style?: CSSProperties;
}

/** A password field with an accessible eye/eye-off visibility control. */
export function PasswordInput({
  id,
  label,
  hint,
  error,
  icon = "lock",
  className,
  style,
  disabled,
  required,
  onFocus,
  onBlur,
  ...inputProps
}: PasswordInputProps) {
  const t = useT();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const helpId = hint || error ? `${id}-help` : undefined;
  const toggleLabel = visible ? t("Hide password") : t("Show password");

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    onBlur?.(event);
  };

  return (
    <div
      className={className}
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", ...style }}
    >
      <label
        htmlFor={id}
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "var(--fs-body-sm)",
          fontWeight: "var(--fw-medium)",
          color: "var(--green-800)",
        }}
      >
        {label}
        {required ? <span aria-hidden="true" style={{ color: "var(--status-danger)" }}> *</span> : null}
      </label>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          height: 52,
          padding: "0 10px 0 16px",
          borderRadius: "var(--radius-sm)",
          background: "var(--white)",
          opacity: disabled ? 0.55 : 1,
          transition:
            "border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
          border: `1px solid ${
            error
              ? "var(--status-danger)"
              : focused
                ? "var(--border-brand)"
                : "var(--border-subtle)"
          }`,
          boxShadow: focused ? "0 0 0 3px var(--focus-ring)" : "none",
        }}
      >
        {icon ? <Icon name={icon} size={17} color="var(--neutral-500)" /> : null}
        <input
          {...inputProps}
          id={id}
          type={visible ? "text" : "password"}
          disabled={disabled}
          required={required}
          aria-label={inputProps["aria-label"] ?? label}
          aria-required={required || undefined}
          aria-invalid={error ? true : inputProps["aria-invalid"]}
          aria-describedby={helpId ?? inputProps["aria-describedby"]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={{
            flex: 1,
            minWidth: 0,
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: "var(--font-ui)",
            fontSize: "var(--fs-body)",
            color: "var(--green-900)",
          }}
        />
        <button
          type="button"
          aria-label={toggleLabel}
          aria-controls={id}
          aria-pressed={visible}
          title={toggleLabel}
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setVisible((current) => !current)}
          style={{
            width: 34,
            height: 34,
            flex: "0 0 34px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            border: "none",
            borderRadius: "var(--radius-sm)",
            background: "transparent",
            color: "var(--green-700)",
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          <span aria-hidden="true" style={{ display: "inline-flex" }}>
            <Icon name={visible ? "eye-off" : "eye"} size={19} />
          </span>
        </button>
      </div>

      {error ? (
        <span
          id={helpId}
          role="alert"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: "var(--fs-caption)",
            color: "var(--status-danger)",
          }}
        >
          <Icon name="alert-circle" size={13} />
          {error}
        </span>
      ) : hint ? (
        <span id={helpId} style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
