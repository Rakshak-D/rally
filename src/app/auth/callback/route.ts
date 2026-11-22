import { NextResponse, type NextRequest } from "next/server";

import { getSiteUrl, safeInternalPath } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const destination = safeInternalPath(request.nextUrl.searchParams.get("next"));
  const appOrigin = getSiteUrl();

  if (!code) {
    return NextResponse.redirect(new URL("/sign-in?status=link-invalid", appOrigin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/sign-in?status=link-expired", appOrigin));
  }

  return NextResponse.redirect(new URL(destination, appOrigin));
}
