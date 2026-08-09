/**
 * Upload validation — brief §83.
 *
 * These rules stand between the public internet and a bucket holding passports, so they
 * are tested against the attacks rather than the happy path. Every case below is
 * something somebody actually tries.
 */

import { describe, expect, it } from "vitest";
import {
  ACCEPTED, MAX_BYTES, MIN_BYTES,
  checkUpload, describeRefusal, extensionOf, safeDisplayName, storageKeyFor,
} from "./upload.rules";

const valid = { fileName: "passport.pdf", mimeType: "application/pdf", fileSize: 200_000 };

describe("what is accepted", () => {
  it("accepts a PDF", () => {
    expect(checkUpload(valid)).toEqual({ ok: true, extension: "pdf" });
  });

  it.each([
    ["photo.jpg", "image/jpeg"],
    ["photo.jpeg", "image/jpeg"],
    ["photo.png", "image/png"],
    ["photo.heic", "image/heic"],
    ["photo.webp", "image/webp"],
  ])("accepts %s declared as %s", (fileName, mimeType) => {
    expect(checkUpload({ fileName, mimeType, fileSize: 200_000 }).ok).toBe(true);
  });

  it("ignores charset parameters on the content type", () => {
    // Browsers append these. Refusing them would reject legitimate uploads for a reason
    // nobody could diagnose from the message.
    expect(checkUpload({ ...valid, mimeType: "application/pdf; charset=binary" }).ok).toBe(true);
  });

  it("is case-insensitive about both type and extension", () => {
    expect(checkUpload({ fileName: "PASSPORT.PDF", mimeType: "APPLICATION/PDF", fileSize: 200_000 }).ok).toBe(true);
  });
});

describe("what is refused", () => {
  /**
   * The reason SVG is absent from the allowlist. An SVG is a document that can carry
   * script, and one served from the storage origin is stored cross-site scripting
   * against that origin.
   */
  it("refuses SVG", () => {
    expect(checkUpload({ fileName: "logo.svg", mimeType: "image/svg+xml", fileSize: 5_000 }))
      .toEqual({ ok: false, refusal: { code: "type_not_accepted", mimeType: "image/svg+xml" } });
  });

  it.each([
    ["application/x-msdownload", "virus.exe"],
    ["text/html", "page.html"],
    ["application/zip", "bundle.zip"],
    ["application/javascript", "script.js"],
  ])("refuses %s", (mimeType, fileName) => {
    expect(checkUpload({ fileName, mimeType, fileSize: 5_000 }).ok).toBe(false);
  });

  /**
   * The oldest trick there is: a name that looks like one type and ends as another.
   * `extensionOf` takes the last segment specifically so this fails.
   */
  it("refuses a double extension", () => {
    expect(extensionOf("passport.pdf.exe")).toBe("exe");
    expect(checkUpload({ fileName: "passport.pdf.exe", mimeType: "application/pdf", fileSize: 5_000 }))
      .toEqual({ ok: false, refusal: { code: "extension_mismatch", extension: "exe", mimeType: "application/pdf" } });
  });

  /**
   * Type and extension are checked *against each other*, not independently. Checking
   * them separately lets a file called `.pdf` be declared `image/png` and stored with a
   * name that invites a reviewer to open it as a PDF.
   */
  it("refuses an accepted extension paired with the wrong type", () => {
    expect(checkUpload({ fileName: "passport.pdf", mimeType: "image/png", fileSize: 5_000 }).ok).toBe(false);
    expect(checkUpload({ fileName: "photo.png", mimeType: "application/pdf", fileSize: 5_000 }).ok).toBe(false);
  });

  it("refuses a file with no extension", () => {
    expect(checkUpload({ fileName: "passport", mimeType: "application/pdf", fileSize: 5_000 }))
      .toEqual({ ok: false, refusal: { code: "no_extension" } });
  });

  it("refuses a trailing-dot name", () => {
    expect(extensionOf("passport.")).toBeNull();
  });

  it("refuses a dotfile with no extension", () => {
    // `.htaccess` has its dot at index 0, which is not an extension.
    expect(extensionOf(".htaccess")).toBeNull();
  });

  it("refuses anything over the size cap", () => {
    expect(checkUpload({ ...valid, fileSize: MAX_BYTES + 1 }).ok).toBe(false);
    expect(checkUpload({ ...valid, fileSize: MAX_BYTES }).ok).toBe(true);
  });

  it("refuses an empty or near-empty file", () => {
    expect(checkUpload({ ...valid, fileSize: 0 }).ok).toBe(false);
    expect(checkUpload({ ...valid, fileSize: MIN_BYTES - 1 }).ok).toBe(false);
    expect(checkUpload({ ...valid, fileSize: MIN_BYTES }).ok).toBe(true);
  });
});

describe("the storage key", () => {
  const applicationId = "11111111-1111-1111-1111-111111111111";

  it("contains nothing the client supplied", () => {
    const key = storageKeyFor(applicationId, "pdf");
    expect(key).toMatch(/^applications\/11111111-1111-1111-1111-111111111111\/[0-9a-f-]{36}\.pdf$/);
  });

  it("is different every time, even for the same application and type", () => {
    // Two uploads of the same document must not overwrite each other. A key derived from
    // the filename would.
    expect(storageKeyFor(applicationId, "pdf")).not.toBe(storageKeyFor(applicationId, "pdf"));
  });

  /**
   * Path traversal is impossible rather than filtered: there is no client input in the
   * key to traverse with. This asserts that property directly.
   */
  it("cannot be influenced by a hostile filename", () => {
    const key = storageKeyFor(applicationId, "pdf");
    expect(key).not.toContain("..");
    expect(key.split("/")).toHaveLength(3);
  });
});

describe("the display name", () => {
  it("turns directory separators into hyphens", () => {
    expect(safeDisplayName("../../etc/passwd")).toBe("..-..-etc-passwd");
    expect(safeDisplayName("a/b\\c.pdf")).toBe("a-b-c.pdf");
  });

  /**
   * The first version of this stripped hyphens, because "control characters" had been
   * written as a character class that actually meant space-to-hyphen. Caught before it
   * ran, and pinned here so it cannot come back.
   */
  it("keeps hyphens and spaces the uploader typed", () => {
    expect(safeDisplayName("my-passport-scan.pdf")).toBe("my-passport-scan.pdf");
    expect(safeDisplayName("my passport.pdf")).toBe("my passport.pdf");
  });

  it("removes control characters that would split a header", () => {
    expect(safeDisplayName("pass\nport.pdf")).toBe("passport.pdf");
    expect(safeDisplayName("pass\tport.pdf")).toBe("passport.pdf");
  });

  it("strips quotes, which would close the header's quoted string early", () => {
    expect(safeDisplayName('pass"port.pdf')).toBe("passport.pdf");
  });

  it("falls back rather than returning an empty string", () => {
    expect(safeDisplayName("   ")).toBe("document");
  });

  it("caps the length", () => {
    expect(safeDisplayName("a".repeat(500))).toHaveLength(120);
  });
});

describe("refusal messages", () => {
  it("tells the applicant what to do, not what failed", () => {
    expect(describeRefusal({ code: "type_not_accepted", mimeType: "image/svg+xml" }))
      .toContain("Upload a PDF or a photograph");
    expect(describeRefusal({ code: "too_large", bytes: 99 })).toContain("Photograph the page");
  });
});

describe("the allowlist itself", () => {
  it("maps every accepted type to at least one extension", () => {
    for (const [mimeType, extensions] of Object.entries(ACCEPTED)) {
      expect(extensions.length, mimeType).toBeGreaterThan(0);
    }
  });

  it("contains no type that can carry script", () => {
    const dangerous = ["svg", "html", "xhtml", "xml", "javascript"];
    for (const mimeType of Object.keys(ACCEPTED)) {
      for (const term of dangerous) expect(mimeType).not.toContain(term);
    }
  });
});
