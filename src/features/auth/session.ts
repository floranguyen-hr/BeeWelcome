import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppRole = "hr_admin" | "employee";

export type Profile = {
  id: string;
  email: string;
  display_name: string;
  employee_code: string | null;
  role: AppRole;
  is_active: boolean;
};

export type SessionProfileResult =
  | { status: "unconfigured" }
  | { status: "anonymous" }
  | { status: "unprovisioned" }
  | { status: "unavailable" }
  | { status: "inactive" }
  | { status: "authenticated"; profile: Profile };

export async function getSessionProfile(): Promise<SessionProfileResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { status: "unconfigured" };
  }

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError) {
    return { status: "anonymous" };
  }

  const userId = claimsData?.claims?.sub;
  if (typeof userId !== "string") {
    return { status: "anonymous" };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, employee_code, role, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return { status: "unavailable" };
  }

  if (!data) {
    return { status: "unprovisioned" };
  }

  const profile = data as Profile;
  if (!profile.is_active) {
    return { status: "inactive" };
  }

  return { status: "authenticated", profile };
}

export async function requireRole(role: AppRole): Promise<Profile> {
  const result = await getSessionProfile();

  if (result.status === "unconfigured") {
    redirect("/login?setup=required");
  }

  if (result.status === "anonymous") {
    redirect("/login");
  }

  if (result.status === "unprovisioned" || result.status === "inactive") {
    redirect("/login?account=unavailable");
  }

  if (result.status === "unavailable") {
    throw new Error("Không thể tải hồ sơ tài khoản lúc này.");
  }

  if (result.profile.role !== role) {
    redirect("/unauthorized");
  }

  return result.profile;
}
