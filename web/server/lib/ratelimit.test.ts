/**
 * Rate limit keying, and the IP truncation used on stored leads.
 *
 * Trusting the wrong header is how a rate limiter is bypassed by setting one, so the
 * parsing rules get tests even though they are four lines long.
 */

import { describe, it, expect } from "vitest";
import { clientIp, ipPrefix, RATE_LIMITS } from "./ratelimit";

const headers = (init: Record<string, string>) => new Headers(init);

describe("clientIp", () => {
  it("takes the leftmost entry of x-forwarded-for", () => {
    // The leftmost is the original client; everything after is a proxy in the chain.
    expect(clientIp(headers({ "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178" })))
      .toBe("203.0.113.7");
  });

  it("trims whitespace", () => {
    expect(clientIp(headers({ "x-forwarded-for": "  203.0.113.7 , 70.41.3.18" }))).toBe("203.0.113.7");
  });

  it("handles a single-entry header", () => {
    expect(clientIp(headers({ "x-forwarded-for": "203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip", () => {
    expect(clientIp(headers({ "x-real-ip": "198.51.100.3" }))).toBe("198.51.100.3");
  });

  it("prefers x-forwarded-for when both are present", () => {
    expect(clientIp(headers({ "x-forwarded-for": "203.0.113.7", "x-real-ip": "198.51.100.3" })))
      .toBe("203.0.113.7");
  });

  it("returns null when neither header is present", () => {
    expect(clientIp(headers({}))).toBeNull();
  });

  it("returns null rather than an empty string for a blank header", () => {
    // An empty identifier would key every anonymous request to the same bucket, which
    // is a self-inflicted denial of service.
    expect(clientIp(headers({ "x-forwarded-for": "" }))).toBeNull();
    expect(clientIp(headers({ "x-forwarded-for": "   " }))).toBeNull();
  });
});

describe("ipPrefix", () => {
  it("truncates IPv4 to /24", () => {
    expect(ipPrefix("203.0.113.44")).toBe("203.0.113.0/24");
  });

  it("truncates IPv6 to /48", () => {
    expect(ipPrefix("2001:db8:85a3:8d3:1319:8a2e:370:7348")).toBe("2001:db8:85a3::/48");
  });

  it("drops the final octet, so the stored value cannot identify one connection", () => {
    expect(ipPrefix("198.51.100.1")).toBe(ipPrefix("198.51.100.254"));
  });

  it("returns null for null", () => {
    expect(ipPrefix(null)).toBeNull();
  });

  it("returns null for a malformed address rather than storing a fragment", () => {
    for (const input of ["", "not-an-ip", "203.0.113", "203.0.113.44.9", "2001:db8"]) {
      expect(ipPrefix(input)).toBeNull();
    }
  });
});

describe("the policy table", () => {
  it("limits auth more strictly than authenticated reads", () => {
    // Credential stuffing targets the sign-in endpoint. If this inverts, the strictest
    // limit is on the wrong door.
    const authPerHour = (RATE_LIMITS.auth.perIp!.limit / RATE_LIMITS.auth.perIp!.windowSeconds) * 3600;
    const readPerHour =
      (RATE_LIMITS.partnerRead.perIp!.limit / RATE_LIMITS.partnerRead.perIp!.windowSeconds) * 3600;
    expect(authPerHour).toBeLessThan(readPerHour);
  });

  it("limits withdrawals more strictly than ordinary partner writes", () => {
    const withdrawPerHour =
      (RATE_LIMITS.withdrawals.perUser!.limit / RATE_LIMITS.withdrawals.perUser!.windowSeconds) * 3600;
    const writePerHour =
      (RATE_LIMITS.partnerWrite.perUser!.limit / RATE_LIMITS.partnerWrite.perUser!.windowSeconds) * 3600;
    expect(withdrawPerHour).toBeLessThan(writePerHour);
  });

  it("gives every authenticated policy a per-user limit as well as a per-IP one", () => {
    // Without the per-user limit, one account behind a shared NAT can spend everyone
    // else's budget.
    for (const policy of [RATE_LIMITS.partnerRead, RATE_LIMITS.partnerWrite, RATE_LIMITS.withdrawals]) {
      expect(policy.perUser).not.toBeNull();
      expect(policy.perIp).not.toBeNull();
    }
  });

  it("gives every public policy an IP limit", () => {
    for (const policy of [RATE_LIMITS.auth, RATE_LIMITS.leads, RATE_LIMITS.translate]) {
      expect(policy.perIp).not.toBeNull();
    }
  });

  it("keeps every policy name unique, since the name is the Redis key prefix", () => {
    const names = Object.values(RATE_LIMITS).map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
