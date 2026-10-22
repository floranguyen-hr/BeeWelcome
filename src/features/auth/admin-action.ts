import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/features/auth/session";

export async function requireAdminActionClient() {
  const session = await getSessionProfile();
  if (session.status !== "authenticated" || session.profile.role !== "hr_admin") {
    redirect("/unauthorized");
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect("/login?setup=required");
  }

  return { supabase, profile: session.profile };
}
