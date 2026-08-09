/**
 * GET /api/dev/last-code?email=… — the code that was just issued. **Development only.**
 *
 * Auth:  none
 * Authz: none — and that is exactly why the guard below is absolute.
 *
 *   200  { code }        the code, consumed on read
 *   404  { }             no code held, or this endpoint does not exist here
 *
 * This is the affordance that lets the set-password page fill in the code so the flow
 * can be walked without a mail provider. It hands a verification code to whoever asks
 * for it, which in production would mean anyone could verify an address they do not
 * control — so it must be impossible in production rather than merely discouraged.
 *
 * Three things make it impossible, and they are independent:
 *
 *   1. `codesMayBeShownOnScreen()` requires both `NODE_ENV !== "production"` and no
 *      configured mail provider.
 *   2. Production cannot satisfy the second condition either: `config.ts` refuses to
 *      boot with `MAIL_PROVIDER=disabled` in production.
 *   3. Nothing is ever stored unless the same guard passed at write time, so even if
 *      both checks above were somehow defeated, the map would be empty.
 *
 * It answers 404 rather than 403 when disabled. A 403 would confirm the route exists and
 * that something is being withheld; a 404 says only what an absent route says.
 */

import { NextResponse, type NextRequest } from "next/server";
import { codesMayBeShownOnScreen } from "@/server/lib/mail";
import { takeCode } from "@/server/lib/dev-codes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const notFound = () =>
  NextResponse.json({}, { status: 404, headers: { "cache-control": "no-store" } });

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!codesMayBeShownOnScreen()) return notFound();

  const email = request.nextUrl.searchParams.get("email");
  if (!email) return notFound();

  const code = takeCode(email);
  if (!code) return notFound();

  return NextResponse.json(
    { code },
    {
      status: 200,
      headers: {
        // No cache anywhere, by any intermediary. A cached verification code is a
        // verification code with a longer life than it was issued for.
        "cache-control": "no-store, no-cache, must-revalidate, private",
        "x-robots-tag": "noindex, nofollow",
      },
    },
  );
}
