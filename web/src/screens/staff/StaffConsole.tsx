"use client";

/**
 * The staff console.
 *
 * **Composition — L-Arrangement.** The sidebar anchors the left edge and the page
 * header anchors the top, leaving the lower-right open for the work itself. The eye
 * path is: role and queue counts (top-left) → the selected queue's heading → down the
 * stacked rows to the oldest item. Chosen over a centred or Symmetry layout because a
 * console is never "viewed" — it is worked down, and an L holds persistent navigation
 * without competing with the row the reviewer is reading.
 *
 * Within the queue: **Horizontal Lines** — stacked bands of equal weight. Deliberately
 * not the Diagonal family, whose instability-in-motion reads as urgency; this is a
 * screen where somebody approves payments, and the composition should feel like a
 * ledger, not a feed.
 *
 * This reuses the partner portal's shell geometry (`minmax(240px,264px) 1fr`, the
 * `gradient-brand-deep` sidebar, the sticky column) rather than inventing an admin
 * look. That is the deliberate choice: Campus Turkey already has a visual language for
 * "this is an application, not a page", and a second one would be a second thing to
 * maintain and a second thing for staff to learn.
 */

import { useState, type ReactNode } from "react";
import { BrandDivider, Icon, Logo, ASSETS } from "@/ds";
import { WithdrawalQueue } from "./WithdrawalQueue";
import { CommissionQueue } from "./CommissionQueue";
import { LeadInbox } from "./LeadInbox";

export type StaffRole = "SUPPORT" | "FINANCE" | "ADMIN";

type View = "withdrawals" | "commissions" | "leads";

interface NavItem {
  key: View;
  label: string;
  icon: string;
  /** What this queue is for, in the reviewer's terms. Shown under the heading. */
  lead: string;
  /** Roles that can do more than read here. Support still sees every queue. */
  actionRoles: StaffRole[];
}

const NAV: NavItem[] = [
  {
    key: "withdrawals",
    label: "Payouts",
    icon: "banknote",
    lead: "Requests waiting on a decision. Oldest first, because a partner has been waiting for each of these.",
    actionRoles: ["FINANCE", "ADMIN"],
  },
  {
    key: "commissions",
    label: "Commissions",
    icon: "receipt",
    lead: "What each partner has earned. Confirming a commission is what makes it withdrawable.",
    actionRoles: ["FINANCE", "ADMIN"],
  },
  {
    key: "leads",
    label: "Enquiries",
    icon: "inbox",
    lead: "Everything the public forms have sent. Medical enquiries are held separately.",
    actionRoles: ["SUPPORT", "FINANCE", "ADMIN"],
  },
];

export function StaffConsole({
  role,
  person,
}: {
  role: StaffRole;
  person: string;
}) {
  const [view, setView] = useState<View>("withdrawals");
  const current = NAV.find((n) => n.key === view) ?? NAV[0]!;
  const canAct = current.actionRoles.includes(role);

  return (
    <div
      className="ct-portal"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(240px,264px) 1fr",
        background: "var(--surface-subtle)",
        minHeight: "100dvh",
      }}
    >
      <aside
        className="ct-portal-aside"
        style={{
          position: "sticky",
          top: 0,
          alignSelf: "start",
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-8)",
          padding: "var(--space-8) var(--space-6)",
          background: "var(--gradient-brand-deep)",
          boxSizing: "border-box",
        }}
      >
        <Logo variant="lockup" theme="reversed" height={40} assetBase={ASSETS} />

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "var(--fs-micro)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,.62)",
            }}
          >
            Staff console
          </span>
          <span style={{ color: "var(--white)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-medium)" }}>
            {person}
          </span>
          {/* The role is stated, not implied by which buttons happen to be enabled.
              A reviewer who cannot approve should know that before they try. */}
          <RolePill role={role} />
        </div>

        <BrandDivider theme="dark" />

        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV.map((item) => {
            const active = item.key === view;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setView(item.key)}
                aria-current={active ? "page" : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  // 44px: the WCAG 2.5.5 target-size floor, and this is a control
                  // somebody clicks a hundred times a day.
                  minHeight: 44,
                  padding: "0 var(--space-4)",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--fs-body-sm)",
                  fontWeight: active ? "var(--fw-semibold)" : "var(--fw-regular)",
                  background: active ? "rgba(255,255,255,.12)" : "transparent",
                  color: active ? "var(--white)" : "rgba(255,255,255,.78)",
                }}
              >
                <Icon name={item.icon} size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <a
          href="/portal"
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            color: "rgba(255,255,255,.7)",
            fontSize: "var(--fs-body-sm)",
            fontFamily: "var(--font-ui)",
          }}
        >
          <Icon name="log-out" size={16} />
          Leave the console
        </a>
      </aside>

      <main style={{ padding: "var(--space-10) var(--space-8)", minWidth: 0 }}>
        <header style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-8)" }}>
          <h1
            style={{
              // h2 rather than h1's clamp: a console heading that scales to 3.25rem
              // would out-weigh the rows it labels. Hierarchy here is row-first.
              fontSize: "var(--fs-h2)",
              lineHeight: "var(--lh-heading)",
              letterSpacing: "var(--ls-heading)",
              color: "var(--text-heading)",
              margin: 0,
            }}
          >
            {current.label}
          </h1>
          <p
            style={{
              margin: 0,
              color: "var(--text-body)",
              fontSize: "var(--fs-body-sm)",
              lineHeight: "var(--lh-body)",
              // 45–75 characters. The lead is one sentence and should stay one line of
              // thought, not stretch the width of a 1400px console.
              maxWidth: "62ch",
            }}
          >
            {current.lead}
          </p>
          {!canAct ? <ReadOnlyNotice /> : null}
        </header>

        {view === "withdrawals" ? <WithdrawalQueue canAct={canAct} /> : null}
        {view === "commissions" ? <CommissionQueue canAct={canAct} /> : null}
        {/* Approving an application creates a login that will hold a balance, which is a
            narrower permission than paying an existing partner — ADMIN only, matching the
            endpoint. Passed explicitly rather than derived from `canAct`, because this
            queue's `actionRoles` includes SUPPORT for reading. */}
        {view === "leads" ? <LeadInbox canApprove={role === "ADMIN"} /> : null}
      </main>
    </div>
  );
}

function RolePill({ role }: { role: StaffRole }) {
  return (
    <span
      style={{
        alignSelf: "flex-start",
        padding: "2px 10px",
        borderRadius: "var(--radius-pill)",
        background: "rgba(255,255,255,.14)",
        border: "1px solid rgba(255,255,255,.22)",
        color: "var(--white)",
        fontFamily: "var(--font-ui)",
        fontSize: "var(--fs-micro)",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}
    >
      {role}
    </span>
  );
}

/**
 * Shown to SUPPORT on a queue they can read but not act on.
 *
 * Stated up front rather than discovered by clicking a disabled button. The copy names
 * who *can* act, so the next step is obvious instead of being a dead end.
 */
function ReadOnlyNotice(): ReactNode {
  return (
    <p
      role="note"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        margin: "var(--space-2) 0 0",
        padding: "var(--space-3) var(--space-4)",
        borderRadius: "var(--radius-sm)",
        background: "var(--green-050)",
        border: "1px solid var(--green-100)",
        color: "var(--text-body)",
        fontSize: "var(--fs-body-sm)",
        maxWidth: "62ch",
      }}
    >
      <Icon name="eye" size={16} color="var(--green-600)" />
      You can read this queue. Approving and rejecting is finance's.
    </p>
  );
}
