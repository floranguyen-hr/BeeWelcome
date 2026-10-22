"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/features/auth/session";
import { getSqlPool, sql } from "@/lib/db/sqlserver";

const activityIdSchema = z.string().uuid();

export async function completeJourneyActivity(formData: FormData) {
  const profile = await requireRole("employee");
  const activityId = activityIdSchema.safeParse(formData.get("activity_id"));
  if (!activityId.success) redirect("/roadmap?error=invalid");

  const completionRule = formData.get("completion_rule");
  const payload =
    completionRule === "manual_self_confirmation"
      ? { confirmed: formData.get("confirmed") === "on" }
      : { acknowledged: formData.get("acknowledged") === "on" };

  try {
    const pool = await getSqlPool();
    const req = pool.request();
    req.input("ActivityId", sql.UniqueIdentifier, activityId.data);
    req.input("ActorId", sql.UniqueIdentifier, profile.id);
    req.input("PayloadJson", sql.NVarChar(sql.MAX), JSON.stringify(payload));
    req.output("Completed", sql.Bit);
    req.output("Score", sql.Numeric(5, 4));
    req.output("Passed", sql.Bit);

    await req.execute("app.sp_CompleteJourneyActivity");
  } catch (err) {
    console.error("Lỗi hoàn thành nhiệm vụ SQL Server:", err);
    redirect("/roadmap?error=complete");
  }

  revalidatePath("/roadmap");
  redirect("/roadmap?result=completed");
}

export async function submitJourneyActivity(formData: FormData) {
  const profile = await requireRole("employee");
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

  let completed = false;
  try {
    const pool = await getSqlPool();
    const req = pool.request();
    req.input("ActivityId", sql.UniqueIdentifier, activityId.data);
    req.input("ActorId", sql.UniqueIdentifier, profile.id);
    req.input("PayloadJson", sql.NVarChar(sql.MAX), JSON.stringify(payload));
    req.output("Completed", sql.Bit);
    req.output("Score", sql.Numeric(5, 4));
    req.output("Passed", sql.Bit);

    const result = await req.execute("app.sp_CompleteJourneyActivity");
    completed = Boolean(result.output.Completed);
  } catch (err) {
    console.error("Lỗi nộp bài kiểm tra SQL Server:", err);
    redirect("/roadmap?error=answer");
  }

  revalidatePath("/roadmap");
  if (!completed) redirect("/roadmap?result=retry");
  redirect("/roadmap?result=completed");
}
