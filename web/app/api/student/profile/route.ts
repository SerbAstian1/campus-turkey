/** PATCH /api/student/profile — update the signed-in student's own profile. */

import { z } from "zod";
import { route } from "@/server/http/handler";
import { requireUser } from "@/server/http/session";
import { RATE_LIMITS } from "@/server/lib/ratelimit";
import { db } from "@/server/lib/db";
import { ForbiddenError, ValidationError } from "@/server/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const optionalText = (minimum: number, maximum: number) =>
  z.union([z.string().trim().min(minimum).max(maximum), z.null()]).optional();

const updateBody = z.object({
  firstName: z.string().trim().min(1).max(120).optional(),
  lastName: z.string().trim().max(120).optional(),
  nationality: z.string().trim().min(2).max(120).optional(),
  countryOfResidence: z.string().trim().min(2).max(120).optional(),
  phone: optionalText(6, 32),
  address: optionalText(3, 300),
  dateOfBirth: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date."),
    z.null(),
  ]).optional(),
}).refine((body) => Object.keys(body).length > 0, "Choose at least one detail to update.");

const PROFILE_FIELDS = {
  firstName: true,
  lastName: true,
  phone: true,
  dateOfBirth: true,
  nationality: true,
  countryOfResidence: true,
  address: true,
} as const;

export const PATCH = route({
  access: { kind: "permission", require: ["UPDATE_OWN_PROFILE"] },
  rateLimit: RATE_LIMITS.partnerWrite,
  body: updateBody,
  handler: async ({ body, session, log }) => {
    const user = requireUser(session);
    const current = await db.studentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!current) throw new ForbiddenError("Claim your student record first.");

    const dateOfBirth = body.dateOfBirth === undefined
      ? undefined
      : body.dateOfBirth === null
        ? null
        : new Date(`${body.dateOfBirth}T00:00:00.000Z`);

    if (dateOfBirth instanceof Date && (Number.isNaN(dateOfBirth.getTime()) || dateOfBirth > new Date())) {
      throw new ValidationError({ dateOfBirth: ["Enter a date of birth that is not in the future."] });
    }

    const nextFirstName = body.firstName ?? current.firstName;
    const nextLastName = body.lastName ?? current.lastName;

    const updated = await db.$transaction(async (tx) => {
      const profile = await tx.studentProfile.update({
        where: { id: current.id },
        data: {
          ...body,
          ...(dateOfBirth !== undefined ? { dateOfBirth } : {}),
        },
        select: PROFILE_FIELDS,
      });

      if (body.firstName !== undefined || body.lastName !== undefined) {
        await tx.user.update({
          where: { id: user.id },
          data: { name: `${nextFirstName} ${nextLastName}`.trim() },
        });
      }

      return profile;
    });

    log.audit("student.profile_updated", {
      profileId: current.id,
      actorUserId: user.id,
      fields: Object.keys(body),
    });

    return updated;
  },
});
