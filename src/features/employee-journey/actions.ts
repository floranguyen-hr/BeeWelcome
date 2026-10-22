"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/features/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const activityIdSchema = z.string().uuid();

async function getEmployeeClient() {
  await requireRole("employee");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?setup=required");
  return supabase;
}

export async function completeJourneyActivity(formData: FormData) {
  const activityId = activityIdSchema.safeParse(formData.get("activity_id"));
  if (!activityId.success) redirect("/roadmap?error=invalid");

  const completionRule = formData.get("completion_rule");
  const payload =
    completionRule === "manual_self_confirmation"
      ? { confirmed: formData.get("confirmed") === "on" }
      : { acknowledged: formData.get("acknowledged") === "on" };

  const supabase = await getEmployeeClient();
  const { error } = await supabase.rpc("complete_journey_activity", {
    p_activity_id: activityId.data,
    p_payload: payload,
  });
  if (error) redirect("/roadmap?error=complete");

  revalidatePath("/roadmap");
  redirect("/roadmap?result=completed");
}

export async function submitJourneyActivity(formData: FormData) {
  const activityId = activityIdSchema.safeParse(formData.get("activity_id"));
  if (!activityId.success) redirect("/roadmap?error=invalid");

  const completionRule = formData.get("completion_rule");
  let payload: Record<string, unknown>;
  if (
    completionRule === "quiz_participation" ||
    completionRule === "quiz_pass_required"
  ) {
    const answerIndex = z.coerce.number().int().min(0).max(9).safeParse(
      formData.get("answer_index"),
    );
    if (!answerIndex.success) redirect("/roadmap?error=answer");
    payload = { answer_index: answerIndex.data };
  } else if (completionRule === "form_submission") {
    const answers: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("answer_") && typeof value === "string") {
        answers[key.slice("answer_".length)] = value.trim();
      }
    }
    if (Object.keys(answers).length === 0) {
      redirect("/roadmap?error=answer");
    }
    payload = { answers };
  } else {
    redirect("/roadmap?error=invalid");
  }

  const supabase = await getEmployeeClient();
  const { data, error } = await supabase.rpc("complete_journey_activity", {
    p_activity_id: activityId.data,
    p_payload: payload,
  });
  if (error) redirect("/roadmap?error=answer");

  revalidatePath("/roadmap");
  const result = data as { completed?: boolean } | null;
  if (result?.completed === false) redirect("/roadmap?result=retry");
  redirect("/roadmap?result=completed");
}
