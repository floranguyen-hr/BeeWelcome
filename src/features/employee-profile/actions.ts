"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/features/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const feedbackSchema = z.object({
  category: z.enum(["roadmap", "content", "navigation", "accessibility", "other"]),
  message: z.string().trim().min(1).max(2000),
});

export async function submitUxFeedback(formData: FormData) {
  const parsed = feedbackSchema.safeParse({
    category: formData.get("category"),
    message: formData.get("message"),
  });
  if (!parsed.success) redirect("/profile?feedback=invalid");

  await requireRole("employee");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?setup=required");

  const { error } = await supabase.rpc("submit_ux_feedback", {
    p_category: parsed.data.category,
    p_message: parsed.data.message,
    p_page_path: "/profile",
  });
  if (error) redirect("/profile?feedback=error");

  revalidatePath("/profile");
  redirect("/profile?feedback=sent");
}
