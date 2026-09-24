"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Button, Icon, Input } from "@/ds";
import { toast } from "@/app/toast";
import { useT } from "@/i18n/context";
import { deleteReferral, updateReferral } from "@/features/referrals/actions";
import { ItemOverflowMenu } from "./ItemOverflowMenu";

export interface EditableReferral {
  id: string;
  name: string;
  universityName: string;
  program: string;
}

type Mode = "rename" | "edit" | "delete";

export function ReferralActions({
  student,
  endpoint,
  onChanged,
}: {
  student: EditableReferral;
  endpoint: string;
  onChanged: () => void;
}) {
  const t = useT();
  const [mode, setMode] = useState<Mode | null>(null);
  const [form, setForm] = useState({
    name: student.name,
    universityName: student.universityName,
    program: student.program,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  const open = (next: Mode) => {
    setForm({ name: student.name, universityName: student.universityName, program: student.program });
    setError(null);
    setMode(next);
  };

  useEffect(() => {
    if (!mode) return;
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("input,button")?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) setMode(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [mode, busy]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!mode) return;
    setBusy(true);
    setError(null);

    const result = mode === "delete"
      ? await deleteReferral(endpoint)
      : await updateReferral(endpoint, mode === "rename" ? { name: form.name.trim() } : {
          name: form.name.trim(),
          universityName: form.universityName.trim(),
          program: form.program.trim(),
        });

    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMode(null);
    onChanged();
    toast(mode === "delete" ? t("Student deleted.") : t("Student updated."));
  };

  return (
    <>
      <ItemOverflowMenu
        label={t("Actions for {name}", { name: student.name })}
        actions={[
          { label: t("Rename"), icon: "pencil", onSelect: () => open("rename") },
          { label: t("Edit details"), icon: "square-pen", onSelect: () => open("edit") },
          {
            label: t("Copy student ID"), icon: "copy",
            onSelect: () => {
              void navigator.clipboard.writeText(student.id);
              toast(t("Student ID copied."));
            },
          },
          { label: t("Delete"), icon: "trash", danger: true, onSelect: () => open("delete") },
        ]}
      />

      {mode ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`referral-action-${student.id}`}
          style={{ position: "fixed", inset: 0, zIndex: 300, display: "grid", placeItems: "center", padding: "var(--space-5)" }}
        >
          <button
            type="button"
            aria-label={t("Close")}
            disabled={busy}
            onClick={() => setMode(null)}
            style={{ position: "absolute", inset: 0, border: 0, background: "rgba(10,44,30,.46)", backdropFilter: "blur(4px)" }}
          />
          <div
            ref={panel}
            style={{
              position: "relative", width: "min(480px,100%)", padding: "var(--space-8)",
              borderRadius: "var(--radius-lg)", background: "var(--surface-page)", boxShadow: "var(--shadow-float)",
            }}
          >
            <form onSubmit={(event) => void save(event)} style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <h2 id={`referral-action-${student.id}`} style={{ margin: 0, fontSize: "var(--fs-h3)", color: "var(--text-heading)" }}>
                  {mode === "rename" ? t("Rename student") : mode === "edit" ? t("Edit student details") : t("Delete student?")}
                </h2>
                {mode === "delete" ? (
                  <p style={{ margin: 0, color: "var(--text-body)", fontSize: "var(--fs-body-sm)" }}>
                    {t("This permanently removes {name}. Students with an application, commission, or claimed account cannot be deleted.", { name: student.name })}
                  </p>
                ) : null}
              </div>

              {mode !== "delete" ? (
                <>
                  <Input id={`student-name-${student.id}`} label={t("Student name")} required value={form.name}
                    onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} />
                  {mode === "edit" ? (
                    <>
                      <Input id={`student-university-${student.id}`} label={t("University")} required value={form.universityName}
                        onChange={(event) => setForm((value) => ({ ...value, universityName: event.target.value }))} />
                      <Input id={`student-program-${student.id}`} label={t("Program")} required value={form.program}
                        onChange={(event) => setForm((value) => ({ ...value, program: event.target.value }))} />
                    </>
                  ) : null}
                </>
              ) : null}

              {error ? (
                <span role="alert" style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--status-danger)", fontSize: "var(--fs-body-sm)" }}>
                  <Icon name="alert-circle" size={16} />{error}
                </span>
              ) : null}

              <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
                <Button type="submit" variant={mode === "delete" ? "danger" : "primary"} disabled={busy || (mode !== "delete" && !form.name.trim())}>
                  {busy ? t("Working…") : mode === "delete" ? t("Delete student") : t("Save changes")}
                </Button>
                <Button type="button" variant="ghost" disabled={busy} onClick={() => setMode(null)}>{t("Cancel")}</Button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
