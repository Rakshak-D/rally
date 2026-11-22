import type { ReactNode } from "react";

import { AppShell } from "@/components/app/app-shell";
import { requireUser } from "@/lib/auth/current-user";
import { getWorkspaceOptions } from "@/lib/data/dashboard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const [workspaces, supabase] = await Promise.all([
    getWorkspaceOptions(user.id),
    createSupabaseServerClient(),
  ]);
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  const displayName = profile?.display_name || user.email?.split("@")[0] || "Rally member";

  return (
    <AppShell workspaces={workspaces} displayName={displayName} email={user.email ?? ""}>
      {children}
    </AppShell>
  );
}
