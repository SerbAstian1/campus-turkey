/**
 * Representative application input.
 *
 * The public form's shape, validated once at the boundary. Mirrors the partner
 * application's fields where they mean the same thing and diverges where they do not:
 * `fullName` rather than an organisation plus a contact, because §12 makes a
 * representative a person; `organizationName` optional, because they may not have one.
 */

import { z } from "zod";

export const submitRepresentativeApplicationBody = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
  organizationName: z.string().trim().max(200).optional(),
  country: z.string().trim().min(2, "Tell us which country you are in.").max(80),
  /** Free text: territories are commercial arrangements, not a fixed taxonomy. */
  territory: z.string().trim().max(120).optional(),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
  phone: z.string().trim().min(6).max(32).optional(),
  address: z.string().trim().max(300).optional(),
  message: z.string().trim().max(2000).optional(),
  /**
   * Explicit, and `literal(true)` rather than `boolean`, so an omitted checkbox is a
   * validation failure rather than a quiet `false` that still stores their details.
   */
  consent: z.literal(true, {
    errorMap: () => ({ message: "Please confirm we may contact you about your application." }),
  }),
});

export type SubmitRepresentativeApplicationBody = z.infer<
  typeof submitRepresentativeApplicationBody
>;

/** Staff decision on an application. */
export const reviewRepresentativeApplicationBody = z.object({
  /** Their own job title or standing. Recorded on the profile, shown in the console. */
  territory: z.string().trim().max(120).optional(),
  /** Required on a rejection; the service enforces that, not this schema. */
  note: z.string().trim().min(1).max(1000).optional(),
});

export const listRepresentativeApplicationsQuery = z.object({
  status: z.enum(["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().uuid().optional(),
});
