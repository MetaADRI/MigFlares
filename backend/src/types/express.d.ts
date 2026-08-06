import type { TokenPayload } from "../utils/token.js";

declare global {
  namespace Express {
    interface Request {
      /** Authenticated user populated by the auth middleware. */
      user?: TokenPayload;
    }
  }
}

export {};
