"use client";

/**
 * The student portal's data layer.
 *
 * Every endpoint is scoped server-side to the caller's own profile. Nothing here sends a
 * student id, because there is no student id in this module to send.
 */

import { useCallback, useEffect, useState } from "react";

export type ApplicationStatus =
  | "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "DOCUMENTS_REQUIRED" | "DOCUMENTS_REVIEW"
  | "APPLICATION_PROCESSING" | "UNIVERSITY_SUBMITTED" | "ADMISSION_PENDING" | "ADMITTED"
  | "ADMISSION_REJECTED" | "VISA_PROCESS" | "VISA_APPROVED" | "VISA_REJECTED"
  | "READY_FOR_TRAVEL" | "COMPLETED" | "CANCELLED";

export interface StudentApplication {
  id: string;
  applicationNumber: string;
  status: ApplicationStatus;
  submittedAt: string | null;
  updatedAt: string;
  university: { slug: string; name: string; city: string } | null;
  program: { name: string; degreeLevel: string } | null;
}

export interface StudentProfile {
  firstName: string;
  lastName: string;
  phone: string | null;
  nationality: string;
  countryOfResidence: string;
  dateOfBirth: string | null;
  address: string | null;
}

/**
 * What each status means to the applicant, and what they should do about it.
 *
 * §55 requires the dashboard to answer three questions: where am I, what happened, what
 * do I need to do next. The third is the one systems usually omit, and it is the only one
 * that changes the applicant's behaviour — so every status has an explicit next action
 * here, including the ones where the honest answer is "nothing, wait".
 *
 * Written in the applicant's terms, not the system's. Nobody outside this building knows
 * what APPLICATION_PROCESSING means.
 */
export const STATUS_COPY: Record<ApplicationStatus, { label: string; meaning: string; next: string }> = {
  DRAFT: {
    label: "Not sent yet",
    meaning: "You have started this application but not submitted it.",
    next: "Choose a university and submit when you are ready.",
  },
  SUBMITTED: {
    label: "Received",
    meaning: "We have your application and it is in the queue.",
    next: "Nothing right now. We will be in touch within one working day.",
  },
  UNDER_REVIEW: {
    label: "Being reviewed",
    meaning: "Someone at Campus Turkey is reading your application.",
    next: "Nothing right now. Watch for a request for documents.",
  },
  DOCUMENTS_REQUIRED: {
    label: "Documents needed",
    meaning: "We need documents from you before this can go further.",
    next: "Upload what has been asked for. This is the only thing holding it up.",
  },
  DOCUMENTS_REVIEW: {
    label: "Checking your documents",
    meaning: "We have your documents and are checking them.",
    next: "Nothing right now. We will tell you if anything needs replacing.",
  },
  APPLICATION_PROCESSING: {
    label: "Preparing your application",
    meaning: "We are putting your file together for the university.",
    next: "Nothing right now.",
  },
  UNIVERSITY_SUBMITTED: {
    label: "Sent to the university",
    meaning: "Your application is with the university.",
    next: "Nothing right now. Universities usually take a few weeks.",
  },
  ADMISSION_PENDING: {
    label: "Waiting for a decision",
    meaning: "The university is deciding.",
    next: "Nothing right now. We will call you as soon as we hear.",
  },
  ADMITTED: {
    label: "Admitted",
    meaning: "You have been accepted.",
    next: "We will start your visa application. Have your passport ready.",
  },
  ADMISSION_REJECTED: {
    label: "Not accepted",
    meaning: "The university did not offer you a place this time.",
    next: "Talk to your contact about applying somewhere else.",
  },
  VISA_PROCESS: {
    label: "Visa in progress",
    meaning: "Your student visa application is under way.",
    next: "Attend any appointment you are given. We will tell you when.",
  },
  VISA_APPROVED: {
    label: "Visa approved",
    meaning: "Your visa has been granted.",
    next: "We will help you book travel and accommodation.",
  },
  VISA_REJECTED: {
    label: "Visa refused",
    meaning: "The consulate refused this application.",
    next: "Speak to your contact. A refusal is not always the end of it.",
  },
  READY_FOR_TRAVEL: {
    label: "Ready to travel",
    meaning: "Everything is in place.",
    next: "Send us your flight details so we can arrange your airport pickup.",
  },
  COMPLETED: {
    label: "Registered",
    meaning: "You are registered at your university.",
    next: "Nothing. Congratulations.",
  },
  CANCELLED: {
    label: "Cancelled",
    meaning: "This application was withdrawn.",
    next: "Talk to your contact if you want to start again.",
  },
};

/** Statuses where the applicant is the one holding things up. Drives the emphasis on the
 *  dashboard: everything else is "we are working on it". */
export const NEEDS_STUDENT: ApplicationStatus[] = ["DRAFT", "DOCUMENTS_REQUIRED", "READY_FOR_TRAVEL"];

export type DashboardState =
  | { status: "loading" }
  | { status: "unclaimed"; message: string }
  | { status: "failed"; message: string; reload: () => void }
  | { status: "ready"; profile: StudentProfile | null; applications: StudentApplication[]; reload: () => void };

export function useStudentDashboard(): DashboardState {
  const [state, setState] = useState<DashboardState>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/student/dashboard");

      if (response.ok) {
        const body = (await response.json()) as { profile: StudentProfile | null; applications: StudentApplication[] };
        setState({ status: "ready", ...body, reload: () => void load() });
        return;
      }

      /* 403 here means a signed-in student who has not claimed a record yet. That is a
         normal state with its own screen, not an error — telling them "forbidden" when
         the answer is "enter your code" would be actively unhelpful. */
      if (response.status === 403) {
        const body = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
        setState({
          status: "unclaimed",
          message: body.error?.message ?? "Claim your student record to see your application.",
        });
        return;
      }

      setState({ status: "failed", message: "We could not load your application.", reload: () => void load() });
    } catch {
      setState({ status: "failed", message: "We could not reach the server.", reload: () => void load() });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return state;
}

export type ClaimResult = { ok: true; studentName: string } | { ok: false; message: string };

export async function claimRecord(input: {
  claimCode: string;
  firstName: string;
  lastName: string;
  nationality: string;
  countryOfResidence: string;
  phone?: string;
}): Promise<ClaimResult> {
  try {
    const response = await fetch("/api/student/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });

    if (response.ok) {
      const body = (await response.json()) as { studentName: string };
      return { ok: true, studentName: body.studentName };
    }

    const body = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
    return {
      ok: false,
      message: body.error?.message ?? "We could not use that code. Check it and try again.",
    };
  } catch {
    return { ok: false, message: "We could not reach the server. Check your connection." };
  }
}

export function when(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
