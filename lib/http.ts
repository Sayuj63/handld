import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code = "api_error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (msg: string) => new ApiError(400, msg, "bad_request");
export const unauthorized = (msg = "Not authenticated") => new ApiError(401, msg, "unauthorized");
export const forbidden = (msg = "You don't have permission to do that") =>
  new ApiError(403, msg, "forbidden");
export const notFound = (msg = "Not found") => new ApiError(404, msg, "not_found");
export const tooMany = (msg = "Rate limit exceeded — try again shortly") =>
  new ApiError(429, msg, "rate_limited");

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

import type { NextRequest } from "next/server";

export type RouteParams = Record<string, string | string[]>;

export type RouteHandler = (
  req: NextRequest,
  ctx: { params: Promise<RouteParams> },
) => Promise<Response>;

/**
 * Wrap a route handler with unified error handling:
 *  - ApiError → matching status + JSON body
 *  - ZodError → 400 with field errors
 *  - anything else → 500 (logged)
 */
export function route(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
      }
      if (err instanceof ZodError) {
        const issues = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
        return NextResponse.json(
          { error: "Invalid input", code: "validation_error", issues },
          { status: 400 },
        );
      }
      console.error("[api] unhandled error:", err);
      return NextResponse.json(
        { error: "Something went wrong", code: "internal_error" },
        { status: 500 },
      );
    }
  };
}
