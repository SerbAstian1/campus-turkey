"use client";

export interface ReferralDetails {
  name: string;
  universityName?: string;
  program?: string;
}

export type ReferralActionResult = { ok: true } | { ok: false; message: string };

async function mutate(
  endpoint: string,
  method: "PATCH" | "DELETE",
  body?: ReferralDetails,
): Promise<ReferralActionResult> {
  try {
    const response = await fetch(endpoint, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (response.ok) return { ok: true };

    const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
    return {
      ok: false,
      message: payload.error?.message ?? "We could not save that change. Please try again.",
    };
  } catch {
    return { ok: false, message: "We could not reach the server. Check your connection." };
  }
}

export const updateReferral = (endpoint: string, body: ReferralDetails) =>
  mutate(endpoint, "PATCH", body);

export const deleteReferral = (endpoint: string) => mutate(endpoint, "DELETE");
