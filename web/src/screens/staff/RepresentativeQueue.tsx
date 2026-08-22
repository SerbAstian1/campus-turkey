"use client";

/**
 * The representative application queue.
 *
 * **The decision here is not like the other three.** A payout moves money that already
 * belongs to somebody; approving an application creates a principal — a login that will
 * hold a balance, submit leads and be owed commission. It is the only queue in this
 * console that admits someone new to the system, which is why the endpoint gates it behind
 * `APPROVE_REPRESENTATIVE_APPLICATION` rather than the general staff permission, and why
 * reading the queue and deciding on it are separate rights.
 *
 * So the row carries everything the decision rests on before the reviewer commits: who is
 * applying, for which organisation and territory, how to reach them, and what they wrote.
 * `message` is the applicant's own account of themselves and is the part a reviewer
 * actually weighs, so it is not truncated behind a "read more" — a decision made on half a
 * sentence is a decision made badly.
 *
 * Rejection requires a note, and the note is the whole of what can be said about the
 * decision afterwards. The API refuses a rejection without one; asking for it here turns a
 * server-side 400 into a field that is already filled in. Approval takes an optional
 * territory, which overrides what the applicant asked for — a reviewer who knows the
 * region is already covered can narrow it at the point of approving.
 *
 * A decided application stays in the list rather than vanishing. Who decided, when, and on
 * what note is the record, and a queue that hides its own history makes the audit log the
 * only place to answer "did we already say no to these people?".
 */

import { useState } from "react";
import { Button, Card, Icon, Input } from "@/ds";
import {
  act, when, waiting,
  useRepresentativeApplications,
  type QueueRepresentativeApplication,
  type RepresentativeApplicationStatus,
} from "@/features/staff/data";
import { QueueState, StatusDot } from "./shared";

/** Only an undecided application can be decided. Mirrors the server, which answers 409
 *  for anything else — this only avoids offering a button that will be refused. */
const DECIDABLE: RepresentativeApplicationStatus[] = ["PENDING", "UNDER_REVIEW"];

/** What each outcome actually does, in the reviewer's terms. "Approve" alone does not say
 *  that an account is created and an email goes out. */
const CONSEQUENCE = {
  APPROVE: "Creates their login and emails an invitation. They set their own password.",
  REJECT: "Closes the application. The note is what explains the decision later.",
} as const;

export function RepresentativeQueue({ canDecide }: { canDecide: boolean }) {
  const queue = useRepresentativeApplications();

  if (queue.status !== "ready") {
    return <QueueState feed={queue} empty="" />;
  }

  if (queue.items.length === 0) {
    return (
      <QueueState
        feed={queue}
        empty="No representative applications yet. When somebody applies through the partnership form, it appears here."
      />
    );
  }

  // Counted rather than filtered away: the decided ones stay visible as the record, but
  // a reviewer opening the console wants to know how many are actually waiting.
  const undecided = queue.items.filter((a) => DECIDABLE.includes(a.status));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      {undecided.length > 0 ? (
        <p style={{ margin: 0, color: "var(--text-body)", fontSize: "var(--fs-body-sm)" }}>
          <strong style={{ color: "var(--text-heading)" }}>{undecided.length}</strong>{" "}
          {undecided.length === 1 ? "application is" : "applications are"} waiting on a decision.
        </p>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {queue.items.map((application) => (
          <ApplicationRow
            key={application.id}
            application={application}
            canDecide={canDecide}
            onDecided={queue.reload}
          />
        ))}
      </div>
    </div>
  );
}

function ApplicationRow({
  application, canDecide, onDecided,
}: {
  application: QueueRepresentativeApplication;
  canDecide: boolean;
  onDecided: () => void;
}) {
  const [choice, setChoice] = useState<"APPROVE" | "REJECT" | null>(null);
  const [territory, setTerritory] = useState(application.territory ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decidable = DECIDABLE.includes(application.status);
  // A rejection without a reason is refused by the API, so the button stays inert until
  // there is one rather than letting the reviewer discover it on submit.
  const ready = choice === "APPROVE" || (choice === "REJECT" && note.trim().length > 0);

  async function submit() {
    if (!choice || !ready) return;
    setBusy(true);
    setError(null);

    const body = choice === "APPROVE"
      ? { decision: "APPROVE", ...(territory.trim() ? { territory: territory.trim() } : {}) }
      : { decision: "REJECT", note: note.trim() };

    const result = await act(
      `/api/staff/representative-applications/${application.id}/decision`,
      body,
    );

    setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    setChoice(null);
    onDecided();
  }

  return (
    <Card padding="var(--space-6)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-4)", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-h4)", color: "var(--text-heading)" }}>
            {application.fullName}
          </span>
          <span style={{ color: "var(--text-body)", fontSize: "var(--fs-body-sm)" }}>
            {[application.organizationName, application.country].filter(Boolean).join(" · ") || "No organisation given"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <StatusDot status={application.status} />
          <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-caption)", whiteSpace: "nowrap" }}>
            {decidable ? waiting(application.createdAt) : when(application.createdAt)}
          </span>
        </div>
      </div>

      <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "var(--space-4)", margin: 0 }}>
        <Field label="Email" value={application.email} />
        <Field label="Phone" value={application.phone ?? "Not given"} />
        <Field label="Territory requested" value={application.territory ?? "Not specified"} />
      </dl>

      {application.message ? (
        <p style={{
          margin: 0, padding: "var(--space-4)", background: "var(--surface-subtle)",
          borderRadius: "var(--radius-md)", color: "var(--text-body)",
          fontSize: "var(--fs-body-sm)", lineHeight: "var(--lh-body)", whiteSpace: "pre-wrap",
        }}>
          {application.message}
        </p>
      ) : null}

      {/* The record of a decision already made. Shown for the same reason the row stays in
          the list: "we rejected them in March, and here is why" is the question this
          answers without opening the audit log. */}
      {!decidable ? (
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--fs-caption)" }}>
          {application.status === "APPROVED" ? "Approved" : "Rejected"}
          {application.reviewedBy ? ` by ${application.reviewedBy.name ?? application.reviewedBy.email}` : ""}
          {application.reviewedAt ? ` on ${when(application.reviewedAt)}` : ""}
          {application.reviewNote ? `. ${application.reviewNote}` : ""}
        </p>
      ) : null}

      {decidable && canDecide ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", borderTop: "1px solid var(--border-subtle)", paddingTop: "var(--space-4)" }}>
          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <Button
              variant={choice === "APPROVE" ? "primary" : "secondary"}
              onClick={() => { setChoice(choice === "APPROVE" ? null : "APPROVE"); setError(null); }}
            >
              Approve
            </Button>
            <Button
              variant={choice === "REJECT" ? "primary" : "ghost"}
              onClick={() => { setChoice(choice === "REJECT" ? null : "REJECT"); setError(null); }}
            >
              Reject
            </Button>
          </div>

          {choice ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-caption)" }}>
                {CONSEQUENCE[choice]}
              </span>

              {choice === "APPROVE" ? (
                <Input
                  id={`territory-${application.id}`}
                  label="Territory"
                  hint="Optional. Overrides what they asked for."
                  value={territory}
                  onChange={(e) => setTerritory(e.target.value)}
                  placeholder="Leave as requested, or narrow it"
                />
              ) : (
                <Input
                  id={`reason-${application.id}`}
                  label="Reason"
                  hint="Required to reject. This is what explains the decision later."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Say why, so the decision can be explained later"
                />
              )}

              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
                <Button variant="primary" disabled={!ready || busy} onClick={() => void submit()}>
                  {busy ? "Working…" : choice === "APPROVE" ? "Confirm approval" : "Confirm rejection"}
                </Button>
                {error ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--danger-600, #b3261e)", fontSize: "var(--fs-body-sm)" }}>
                    <Icon name="alert-circle" size={16} />{error}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
      <dt className="ct-eyebrow" style={{ color: "var(--text-muted)" }}>{label}</dt>
      <dd style={{ margin: 0, color: "var(--text-body)", fontSize: "var(--fs-body-sm)", overflowWrap: "anywhere" }}>
        {value}
      </dd>
    </div>
  );
}
