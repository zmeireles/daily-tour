import { describe, expect, it } from "vitest";
import { isTrustedProxyHop } from "../lib/trust-proxy.js";

describe("isTrustedProxyHop", () => {
  it.each([
    ["127.0.0.1"],
    ["10.0.3.7"],
    ["172.18.0.4"],
    ["192.168.1.20"],
    ["::1"],
    ["::ffff:172.18.0.4"],
    ["fd00::5"],
  ])("trusts a first-hop peer on a proxy network (%s)", (address) => {
    expect(isTrustedProxyHop(address, 0)).toBe(true);
  });

  it.each([
    ["203.0.113.10"],
    ["8.8.8.8"],
    ["172.32.0.1"],
    ["::ffff:203.0.113.10"],
    ["2001:db8::1"],
  ])("does not trust a public first-hop peer (%s)", (address) => {
    // The case a bare hop count could not catch: a client connecting
    // directly would otherwise have its own X-Forwarded-For believed.
    expect(isTrustedProxyHop(address, 0)).toBe(false);
  });

  it("never trusts beyond the first hop, even from a private address", () => {
    expect(isTrustedProxyHop("10.0.3.7", 1)).toBe(false);
    expect(isTrustedProxyHop("127.0.0.1", 2)).toBe(false);
  });
});
