"use client";

/**
 * The representative portal's data layer.
 *
 * Every endpoint it calls is scoped server-side to `session.representative.id`. Nothing
 * here sends a representative id, and nothing here could: the id is not in this module.
 * That is the same arrangement the partner portal has, and it is why §89's isolation
 * requirement is a property of the system rather than a rule each query has to honour.
 */

import { useCallback, useEffect, useState } from "react";

export type Stage = "ENQUIRY" | "DOCUMENTS" | "SUBMITTED" | "OFFER" | "VISA" | "REGISTERED";

export interface ReferredStudent {
  id: string;
  name: string;
  universityName: string;
  program: string;
  stage: Stage;
  updatedAt: string;
}

export interface RepresentativeProfile {
  id: string;
  fullName: string;
  organizationName: string | null;
  country: string;
  email: string;
  phone: string | null;
  address: string | null;
  territory: string | null;
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "CLOSED";
  since: string;
}

export type Feed<T> =
  | { status: "loading" }
  | { status: "failed"; message: string; reload: () => void }
  | { status: "ready"; items: T[]; reload: () => void };

function useFeed<T>(url: string): Feed<T> {
  const [state, setState] = useState<{ status: "loading" | "failed" | "ready"; items?: T[]; message?: string }>({
    status: "loading",
  });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const response = await fetch(url);
      if (!response.ok) {
        setState({
          status: "failed",
          message:
            response.status === 403
              ? "Your account does not have access to this."
              : "We could not load that. Try again in a moment.",
        });
        return;
      }
      const body = (await response.json()) as { items?: T[] };
      setState({ status: "ready", items: body.items ?? [] });
    } catch {
      setState({ status: "failed", message: "We could not reach the server." });
    }
  }, [url]);

  useEffect(() => { void load(); }, [load]);

  if (state.status === "loading") return { status: "loading" };
  if (state.status === "failed") {
    return { status: "failed", message: state.message ?? "Something went wrong.", reload: () => void load() };
  }
  return { status: "ready", items: state.items ?? [], reload: () => void load() };
}

export const useReferredStudents = () => useFeed<ReferredStudent>("/api/representative/students");

export function useRepresentativeProfile() {
  const [profile, setProfile] = useState<RepresentativeProfile | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/representative/profile");
        if (response.ok) setProfile((await response.json()) as RepresentativeProfile);
      } catch {
        // The dashboard renders without it; the header falls back to a neutral greeting.
      }
    })();
  }, []);

  return profile;
}

export interface ReferralInput {
  name: string;
  universitySlug: string;
  universityName: string;
  program: string;
}

export type ReferralResult = { ok: true } | { ok: false; message: string };

export async function referStudent(input: ReferralInput): Promise<ReferralResult> {
  try {
    const response = await fetch("/api/representative/students", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });

    if (response.ok) return { ok: true };

    const body = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
    return {
      ok: false,
      message: body.error?.message ?? "We could not register that student. Please try again.",
    };
  } catch {
    return { ok: false, message: "We could not reach the server. Check your connection." };
  }
}

/** Short, absolute dates. "2 days ago" forces arithmetic on someone scanning a list. */
export function when(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric", month: "short", year: "numeric",
  });
}
