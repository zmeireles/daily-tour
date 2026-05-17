import { generateKeyPair } from "node:crypto";
import { promisify } from "node:util";
import { SignJWT, type JSONWebKeySet, type JWK, exportJWK } from "jose";

const generateKeyPairAsync = promisify(generateKeyPair);

// Stable kid for the test RSA key — matches what the test's local JWKS
// emits, so the owner-auth plugin's jose.jwtVerify picks the right key.
export const TEST_OWNER_KID = "test-authentik-owner-key-1";

export interface AuthentikTestKeypair {
  privateKey: import("node:crypto").KeyObject;
  publicJwk: JWK;
  jwks: JSONWebKeySet;
}

// Generates an RS256 keypair in-memory and returns a JOSE-shaped JWKS
// containing the public half. The owner-auth plugin's test path consumes
// the JWKS via jose.createLocalJWKSet so no network round-trip is needed.
export async function makeAuthentikKeypair(): Promise<AuthentikTestKeypair> {
  const { privateKey, publicKey } = await generateKeyPairAsync("rsa", {
    modulusLength: 2048,
  });
  const publicJwk = await exportJWK(publicKey);
  publicJwk.alg = "RS256";
  publicJwk.use = "sig";
  publicJwk.kid = TEST_OWNER_KID;
  return {
    privateKey,
    publicJwk,
    jwks: { keys: [publicJwk] },
  };
}

interface SignOwnerJwtArgs {
  privateKey: import("node:crypto").KeyObject;
  payload: Record<string, unknown>;
  expSeconds?: number;
  kid?: string;
}

// Signs an RS256 JWT mimicking what Authentik would issue for the
// owner-app provider. Defaults to a 1-hour expiry to match the blueprint.
export async function signOwnerJwt({
  privateKey,
  payload,
  expSeconds,
  kid = TEST_OWNER_KID,
}: SignOwnerJwtArgs): Promise<string> {
  const exp = expSeconds ?? Math.floor(Date.now() / 1000) + 3600;
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", kid })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(privateKey);
}
