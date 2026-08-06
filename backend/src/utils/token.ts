import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import { ApiError } from "./api-error.js";

export interface TokenPayload {
  sub: string; // user id
  username: string;
  role: string;
  branchId: string | null;
  /** Resolved from the user's role on each request — not stored in the JWT. */
  permissions?: string[];
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  } as SignOptions);
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: "refresh" }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  } as SignOptions);
}

export function verifyAccessToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, env.jwt.accessSecret) as TokenPayload;
  } catch {
    throw ApiError.unauthorized("Invalid or expired token");
  }
}

export function verifyRefreshToken(token: string): { sub: string } {
  try {
    const payload = jwt.verify(token, env.jwt.refreshSecret) as { sub: string; type?: string };
    if (payload.type !== "refresh") throw new Error("Wrong token type");
    return payload;
  } catch {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }
}
