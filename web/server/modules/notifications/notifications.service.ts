/**
 * Notifications — brief §24, and the missing half of §51.
 *
 * §51 sets the sequence a status change must follow, ending with *create notification,
 * notify relevant parties*. The word that matters is where it sits in that list: inside
 * the same transaction as the change. A notification written after a commit that then
 * failed tells somebody their application moved when it did not, and there is no way to
 * take that back.
 *
 * ## Who gets told
 *
 * An application has up to three interested parties: the student who claimed it, the
 * partner or representative who referred them, and staff. They are not told the same
 * thing. A student reads "your documents have been approved"; their agency reads
 * "Amina Yusuf's documents have been approved". Writing one message for both produces
 * copy that is wrong for at least one of them.
 */

import { randomUUID } from "node:crypto";
import { db, type Db } from "@/server/lib/db";
import type { ApplicationStatus } from "@/server/modules/applications/application.state";

export type NotificationType =
  | "APPLICATION_STATUS"
  | "DOCUMENT_REQUESTED"
  | "DOCUMENT_REVIEWED"
  | "MESSAGE_RECEIVED"
  | "ACCOUNT"
  | "PAYOUT";

export interface NotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Relative path. A database CHECK refuses anything else. */
  href?: string;
}

/** Write several at once. One statement rather than a loop, because these are created
 *  inside a transaction that is holding a row lock. */
export async function notify(entries: NotificationInput[], tx: Db = db): Promise<void> {
  if (entries.length === 0) return;

  await tx.notification.createMany({
    data: entries.map((entry) => ({
      id: randomUUID(),
      userId: entry.userId,
      type: entry.type,
      title: entry.title,
      body: entry.body,
      href: entry.href ?? null,
    })),
  });
}

/**
 * What each status change says, to each audience.
 *
 * Student-facing wording is the applicant's, matching `STATUS_COPY` in the portal.
 * Referrer-facing wording names the student, because an agency tracking forty
 * applications needs to know which one moved.
 *
 * Statuses absent from this map produce no notification. Not every transition is worth
 * an interruption: moving from SUBMITTED to UNDER_REVIEW is Campus Turkey's internal
 * progress, and telling an applicant about it trains them to ignore the next one.
 */
const ANNOUNCEMENTS: Partial<Record<ApplicationStatus, {
  student: { title: string; body: string };
  referrer: (studentName: string) => { title: string; body: string };
}>> = {
  DOCUMENTS_REQUIRED: {
    student: {
      title: "We need some documents",
      body: "Your application is waiting on documents from you. Open it to see what is needed.",
    },
    referrer: (name) => ({
      title: `${name}: documents needed`,
      body: "Their application cannot go further until the requested documents are uploaded.",
    }),
  },
  ADMITTED: {
    student: {
      title: "You have been admitted",
      body: "The university has offered you a place. We will start your visa application next.",
    },
    referrer: (name) => ({
      title: `${name} has been admitted`,
      body: "The university has offered a place. The visa stage begins next.",
    }),
  },
  ADMISSION_REJECTED: {
    student: {
      title: "The university has decided",
      body: "You were not offered a place this time. Your contact will call to discuss other options.",
    },
    referrer: (name) => ({
      title: `${name}: not accepted`,
      body: "The university did not offer a place. Consider an alternative institution.",
    }),
  },
  VISA_APPROVED: {
    student: {
      title: "Your visa has been approved",
      body: "We will help you arrange travel and accommodation.",
    },
    referrer: (name) => ({
      title: `${name}: visa approved`,
      body: "Travel and accommodation arrangements begin next.",
    }),
  },
  VISA_REJECTED: {
    student: {
      title: "Your visa was refused",
      body: "This is not always the end of it. Your contact will call you to talk it through.",
    },
    referrer: (name) => ({
      title: `${name}: visa refused`,
      body: "The consulate refused the application. Campus Turkey will be in touch.",
    }),
  },
  READY_FOR_TRAVEL: {
    student: {
      title: "You are ready to travel",
      body: "Send us your flight details so we can arrange your airport pickup.",
    },
    referrer: (name) => ({
      title: `${name} is ready to travel`,
      body: "Everything is in place. Flight details are the last thing needed.",
    }),
  },
  COMPLETED: {
    student: {
      title: "You are registered",
      body: "Your registration is confirmed. Congratulations.",
    },
    referrer: (name) => ({
      title: `${name} is registered`,
      body: "Their registration at the university is confirmed.",
    }),
  },
};

/**
 * Build the notifications for a status change.
 *
 * Returns them rather than writing them, so the caller can include them in its own
 * transaction. A function that wrote directly would be one `await` away from being called
 * outside the transaction it belongs to.
 */
export async function notificationsForTransition(
  input: { applicationId: string; to: ApplicationStatus },
  tx: Db,
): Promise<NotificationInput[]> {
  const announcement = ANNOUNCEMENTS[input.to];
  if (!announcement) return [];

  const application = await tx.application.findUnique({
    where: { id: input.applicationId },
    select: {
      applicationNumber: true,
      student: {
        select: {
          name: true,
          // The student is only notifiable once they have claimed their record: before
          // that there is no account to notify.
          profile: { select: { userId: true } },
        },
      },
      partner: { select: { userId: true } },
      representative: { select: { userId: true } },
    },
  });
  if (!application) return [];

  const entries: NotificationInput[] = [];

  const studentUserId = application.student.profile?.userId;
  if (studentUserId) {
    entries.push({
      userId: studentUserId,
      type: "APPLICATION_STATUS",
      ...announcement.student,
      href: "/portal/student",
    });
  }

  // Exactly one of these is set — the exclusive-referral constraint guarantees it — so
  // this cannot notify two agencies about one student.
  const referrerUserId = application.partner?.userId ?? application.representative?.userId;
  if (referrerUserId) {
    entries.push({
      userId: referrerUserId,
      type: "APPLICATION_STATUS",
      ...announcement.referrer(application.student.name),
      href: application.partner ? "/portal/partner" : "/portal/representative",
    });
  }

  return entries;
}

export interface ListOptions {
  userId: string;
  unreadOnly?: boolean;
  limit: number;
  cursor?: string;
}

export async function listNotifications(options: ListOptions) {
  const items = await db.notification.findMany({
    where: {
      userId: options.userId,
      ...(options.unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: options.limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    select: { id: true, type: true, title: true, body: true, href: true, readAt: true, createdAt: true },
  });

  const hasMore = items.length > options.limit;
  const page = hasMore ? items.slice(0, options.limit) : items;

  return { items: page, nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null };
}

export async function unreadCount(userId: string): Promise<number> {
  return db.notification.count({ where: { userId, readAt: null } });
}

/**
 * Mark one as read.
 *
 * Scoped by `userId` in the `where` clause rather than fetched and compared, so one
 * person cannot mark another's notification read by guessing its id.
 */
export async function markRead(notificationId: string, userId: string): Promise<void> {
  await db.notification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(userId: string): Promise<number> {
  const result = await db.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}
