/**
 * Tenant isolation, executed rather than argued.
 *
 * The Production Audit records "0 / 13 authorization rules with a negative test" and
 * names it as one of the three Majors blocking a PASS. Every rule here was *read* and
 * believed correct; none had ever been made to deny. That distinction is the whole point
 * of this file — an ownership check written as `where: { partnerId }` and an ownership
 * check written as `where: { id }` look almost identical on the screen and differ by
 * every record in the table.
 *
 * Two partners, built fresh per test. B asks for A's things. Each rule is asserted twice:
 *
 *   - **the denial** — B is refused, and A's data is untouched afterwards
 *   - **the positive control** — A, doing the identical call, succeeds
 *
 * The control is not padding. A test that only asserts "this throws" passes just as
 * happily when the service is broken for everybody, when a fixture is malformed, or when
 * a typo makes every call 404. Several of the assertions below would have been satisfied
 * by a service that simply did not work.
 *
 * **404, not 403**, everywhere it is a lookup. A 403 on a resource that is not yours
 * confirms the resource exists, which is the one fact an outsider enumerating ids is
 * trying to learn. The services say so in their own comments; this is where that claim
 * is checked.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";

import { listMethods, removeMethod } from "@/server/modules/payout-methods/payout-methods.service";
import { getWallet } from "@/server/modules/wallet/wallet.service";
import { listStudents, pipelineCounts } from "@/server/modules/students/students.service";
import { listDocuments, requestUpload, downloadUrl } from "@/server/modules/documents/documents.service";
import { __setStorageForTests, type StorageAdapter } from "@/server/lib/storage";
import { NotFoundError } from "@/server/lib/errors";
import {
  createApplication, createPartner, db, destroyPartner, partnerActor, silentLogger,
  type PartnerFixture,
} from "./fixtures";

const created: PartnerFixture[] = [];

async function partnerWith(options: Parameters<typeof createPartner>[0]) {
  const fixture = await createPartner(options);
  created.push(fixture);
  return fixture;
}

/** Two partners with balances that differ, so a leak between them is visible in a number. */
async function twoPartners() {
  const alice = await partnerWith({ confirmedMinor: 40_000 });
  const bob = await partnerWith({ confirmedMinor: 10_000 });
  return { alice, bob };
}

afterEach(async () => {
  while (created.length > 0) {
    const fixture = created.pop();
    if (fixture) await destroyPartner(fixture);
  }
});

/**
 * A storage adapter that signs nothing.
 *
 * The document tests are about who may reach a row, not about SigV4 — that is proved
 * separately in `signature.test.ts` against AWS's published vectors. Injecting a fake
 * here keeps this file runnable with no bucket and no credentials, which is what stops
 * "we could not test it without infrastructure" becoming the reason ownership goes
 * unchecked again.
 */
const fakeStorage: StorageAdapter = {
  kind: "s3",
  presignUpload: async (key) => `https://storage.invalid/${key}?signed=upload`,
  presignDownload: async (key) => `https://storage.invalid/${key}?signed=download`,
  delete: async () => {},
};

beforeAll(() => __setStorageForTests(fakeStorage));
afterAll(() => __setStorageForTests(null));

describe("payout methods", () => {
  it("does not list another partner's method", async () => {
    const { alice, bob } = await twoPartners();

    const mine = await listMethods(db, bob.partnerId);
    const theirs = await listMethods(db, alice.partnerId);

    // The positive control: both partners do have a method, so an empty list would not
    // be what makes the isolation assertion below pass.
    expect(mine).toHaveLength(1);
    expect(theirs).toHaveLength(1);

    expect(mine.map((m) => m.id)).not.toContain(alice.payoutMethodId);
  });

  it("refuses to archive another partner's method, and leaves it usable", async () => {
    const { alice, bob } = await twoPartners();

    await expect(
      removeMethod(db, bob.partnerId, alice.payoutMethodId, silentLogger()),
    ).rejects.toBeInstanceOf(NotFoundError);

    // The refusal is only worth anything if the row survived it. A service that threw
    // *after* archiving would pass the assertion above and still have destroyed
    // somebody else's payout route.
    const stillThere = await listMethods(db, alice.partnerId);
    expect(stillThere.map((m) => m.id)).toContain(alice.payoutMethodId);

    // The control: Alice can archive her own, so the refusal was about ownership and
    // not about the method being unarchivable.
    await removeMethod(db, alice.partnerId, alice.payoutMethodId, silentLogger());
    expect(await listMethods(db, alice.partnerId)).toHaveLength(0);
  });
});

describe("wallet", () => {
  it("returns only the caller's own balance", async () => {
    const { alice, bob } = await twoPartners();

    const aliceWallet = await getWallet(db, alice.partnerId, silentLogger());
    const bobWallet = await getWallet(db, bob.partnerId, silentLogger());

    // Distinct fixtures, distinct numbers: if the scope were dropped both would read
    // 50,000 and this would fail on both lines rather than neither.
    expect(aliceWallet.balance.availableMinor).toBe(40_000);
    expect(bobWallet.balance.availableMinor).toBe(10_000);

    expect(bobWallet.methods.map((m) => m.id)).not.toContain(alice.payoutMethodId);
  });

  it("does not invent a wallet for an id that is not a partner", async () => {
    await expect(
      getWallet(db, randomUUID(), silentLogger()),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("students", () => {
  it("lists only the caller's own students", async () => {
    const { alice, bob } = await twoPartners();

    const mine = await listStudents(db, bob.partnerId, { limit: 20 });
    const theirs = await listStudents(db, alice.partnerId, { limit: 20 });

    expect(mine.items).toHaveLength(1);
    expect(theirs).toBeTruthy();
    expect(mine.items.map((s) => s.id)).not.toContain(alice.studentId);
  });

  it("counts only the caller's own pipeline", async () => {
    const { alice, bob } = await twoPartners();

    const counts = await pipelineCounts(db, bob.partnerId);
    const registered = counts.find((c) => c.stage === "REGISTERED");

    // One student each. Two here would mean the group-by lost its `where`, which is the
    // classic way an aggregate leaks across tenants while every list stays correct.
    expect(registered?.count).toBe(1);

    const aliceCounts = await pipelineCounts(db, alice.partnerId);
    expect(aliceCounts.find((c) => c.stage === "REGISTERED")?.count).toBe(1);
  });
});

describe("documents", () => {
  /** A document that has finished uploading, created directly so the test owns its state. */
  async function uploadedDocument(applicationId: string, userId: string) {
    return db.document.create({
      data: {
        id: randomUUID(),
        applicationId,
        uploadedByUserId: userId,
        type: "PASSPORT",
        fileName: "passport.pdf",
        storageKey: `applications/${applicationId}/${randomUUID()}.pdf`,
        mimeType: "application/pdf",
        fileSize: 1024,
        status: "PENDING",
        uploadedAt: new Date(),
      },
      select: { id: true },
    });
  }

  it("refuses to list documents on another partner's application", async () => {
    const { alice, bob } = await twoPartners();
    const application = await createApplication(alice);
    await uploadedDocument(application, alice.userId);

    await expect(
      listDocuments(application, partnerActor(bob)),
    ).rejects.toBeInstanceOf(NotFoundError);

    // The control: the owner sees it, so the refusal was ownership and not an empty
    // application or a filter that hides everything.
    const owned = await listDocuments(application, partnerActor(alice));
    expect(owned).toHaveLength(1);
  });

  it("refuses an upload against another partner's application", async () => {
    const { alice, bob } = await twoPartners();
    const application = await createApplication(alice);

    const upload = {
      applicationId: application,
      type: "PASSPORT",
      fileName: "passport.pdf",
      mimeType: "application/pdf",
      fileSize: 2048,
    };

    await expect(
      requestUpload(upload, partnerActor(bob), silentLogger()),
    ).rejects.toBeInstanceOf(NotFoundError);

    // Nothing was written on the way to being refused.
    expect(await db.document.count({ where: { applicationId: application } })).toBe(0);

    // The control: the same call from the owner is accepted and does create the row.
    const issued = await requestUpload(upload, partnerActor(alice), silentLogger());
    expect(issued).toBeTruthy();
    expect(await db.document.count({ where: { applicationId: application } })).toBe(1);
  });

  it("refuses a download of another partner's document", async () => {
    const { alice, bob } = await twoPartners();
    const application = await createApplication(alice);
    const document = await uploadedDocument(application, alice.userId);

    await expect(
      downloadUrl({ documentId: document.id }, partnerActor(bob), silentLogger()),
    ).rejects.toBeInstanceOf(NotFoundError);

    const owned = await downloadUrl(
      { documentId: document.id },
      partnerActor(alice),
      silentLogger(),
    );
    expect(owned.url).toContain("signed=download");
  });

  /**
   * A document id that does not exist and one that exists but is not yours must be
   * indistinguishable. If they were not, an outsider could tell real ids from invented
   * ones by the shape of the refusal, and enumerate the table without ever being
   * allowed to read a row.
   */
  it("answers the same way for a foreign document and a nonexistent one", async () => {
    const { alice, bob } = await twoPartners();
    const application = await createApplication(alice);
    const document = await uploadedDocument(application, alice.userId);

    const foreign = await downloadUrl(
      { documentId: document.id }, partnerActor(bob), silentLogger(),
    ).catch((error: unknown) => error);

    const missing = await downloadUrl(
      { documentId: randomUUID() }, partnerActor(bob), silentLogger(),
    ).catch((error: unknown) => error);

    expect(foreign).toBeInstanceOf(NotFoundError);
    expect(missing).toBeInstanceOf(NotFoundError);
    expect((foreign as NotFoundError).message).toBe((missing as NotFoundError).message);
  });
});
