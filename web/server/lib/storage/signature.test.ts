/**
 * SigV4, checked against AWS's published worked example.
 *
 * This is the test that makes hand-rolling the signature a reasonable decision rather
 * than a hopeful one. AWS documents a complete presigned-GET calculation with fixed
 * credentials, a fixed date and an expected signature; a single wrong byte anywhere in
 * the canonical request produces a different hex string, so a match is strong evidence
 * that every step is right.
 *
 * Source: AWS "Signature Version 4 signing process" — the presigned URL example for
 * `GET https://examplebucket.s3.amazonaws.com/test.txt`.
 *
 * The credentials below are AWS's own documentation values. They are not secret, have
 * never been valid, and appear verbatim in the specification.
 */

import { describe, expect, it } from "vitest";
import { amzDate, internals, presign, type PresignInput } from "./signature";

const EXAMPLE = {
  accessKeyId: "AKIAIOSFODNN7EXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  region: "us-east-1",
  host: "examplebucket.s3.amazonaws.com",
  path: "/test.txt",
  at: new Date("2013-05-24T00:00:00Z"),
  expiresIn: 86_400,
};

describe("AWS's documented presigned GET", () => {
  const url = presign({
    method: "GET",
    host: EXAMPLE.host,
    path: EXAMPLE.path,
    region: EXAMPLE.region,
    accessKeyId: EXAMPLE.accessKeyId,
    secretAccessKey: EXAMPLE.secretAccessKey,
    expiresIn: EXAMPLE.expiresIn,
    now: EXAMPLE.at,
  });

  const params = new URL(url).searchParams;

  it("produces the signature AWS documents", () => {
    expect(params.get("X-Amz-Signature")).toBe(
      "aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404",
    );
  });

  it("scopes the credential to the date, region and service", () => {
    expect(params.get("X-Amz-Credential")).toBe(
      "AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request",
    );
  });

  it("uses the algorithm and signed headers the example specifies", () => {
    expect(params.get("X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256");
    expect(params.get("X-Amz-SignedHeaders")).toBe("host");
    expect(params.get("X-Amz-Date")).toBe("20130524T000000Z");
    expect(params.get("X-Amz-Expires")).toBe("86400");
  });

  it("points at the object it signed", () => {
    const parsed = new URL(url);
    expect(parsed.host).toBe(EXAMPLE.host);
    expect(parsed.pathname).toBe("/test.txt");
  });
});

describe("the signing key chain", () => {
  /**
   * AWS documents the intermediate signing key for this date, region and service. Checked
   * separately so that a failure points at the chain rather than at the canonical request.
   */
  it("derives the documented key", () => {
    const key = internals.signingKey(
      EXAMPLE.secretAccessKey, "20130524", "us-east-1", "s3",
    );
    expect(key.toString("hex")).toBe(
      "dbb893acc010964918f1fd433add87c70e8b0db6be30c1fbeafefa5ec6ba8378",
    );
  });
});

describe("canonical encoding", () => {
  it("encodes the characters encodeURIComponent leaves behind", () => {
    // These five are the whole reason `encodeRfc3986` exists. A signature computed with
    // encodeURIComponent alone is valid right up until a filename contains a bracket.
    expect(internals.encodeRfc3986("a!b'c(d)e*f")).toBe("a%21b%27c%28d%29e%2Af");
  });

  it("keeps slashes literal in a path and encodes them in a value", () => {
    expect(internals.encodeRfc3986("/documents/a b.pdf", true)).toBe("/documents/a%20b.pdf");
    expect(internals.encodeRfc3986("a/b")).toBe("a%2Fb");
  });

  it("sorts query parameters by encoded key", () => {
    expect(internals.canonicalQuery({ b: "2", a: "1", C: "3" })).toBe("C=3&a=1&b=2");
  });

  it("encodes both keys and values", () => {
    expect(internals.canonicalQuery({ "a key": "a value" })).toBe("a%20key=a%20value");
  });
});

describe("dates", () => {
  it("formats to the only shape SigV4 accepts", () => {
    expect(amzDate(new Date("2013-05-24T00:00:00.123Z"))).toEqual({
      long: "20130524T000000Z",
      short: "20130524",
    });
  });
});

describe("what changes the signature", () => {
  // Typed as the function's own input rather than inferred from `base`, so that varying
  // `method` or adding `sessionToken` below stays type-correct.
  const base: PresignInput = {
    method: "GET",
    host: EXAMPLE.host,
    path: EXAMPLE.path,
    region: EXAMPLE.region,
    accessKeyId: EXAMPLE.accessKeyId,
    secretAccessKey: EXAMPLE.secretAccessKey,
    expiresIn: EXAMPLE.expiresIn,
    now: EXAMPLE.at,
  };

  const signatureOf = (over: Partial<PresignInput>) =>
    new URL(presign({ ...base, ...over })).searchParams.get("X-Amz-Signature");

  const original = signatureOf({});

  /* Each of these proves a component actually reaches the canonical request. A signature
     that ignored the method would let a presigned GET be replayed as a PUT. */
  it.each([
    ["the method", { method: "PUT" as const }],
    ["the path", { path: "/other.txt" }],
    ["the host", { host: "otherbucket.s3.amazonaws.com" }],
    ["the region", { region: "eu-west-2" }],
    ["the expiry", { expiresIn: 60 }],
    ["the secret", { secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEZ" }],
  ])("changing %s changes the signature", (_name, over) => {
    expect(signatureOf(over)).not.toBe(original);
  });

  it("a session token is signed rather than appended", () => {
    expect(signatureOf({ sessionToken: "temporary" })).not.toBe(original);
  });

  it("is stable for identical input", () => {
    expect(signatureOf({})).toBe(original);
  });
});
