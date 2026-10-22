"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/features/auth/session";
import { getSqlPool, sql } from "@/lib/db/sqlserver";

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

  const profile = await requireRole("employee");

  try {
    const pool = await getSqlPool();
    const req = pool.request();
    req.input("Category", sql.NVarChar(40), parsed.data.category);
    req.input("Message", sql.NVarChar(2000), parsed.data.message);
    req.input("PagePath", sql.NVarChar(260), "/profile");
    req.input("ActorId", sql.UniqueIdentifier, profile.id);

    await req.execute("app.sp_SubmitUxFeedback");
  } catch (err) {
    console.error("Lỗi gửi phản hồi UX SQL Server:", err);
    redirect("/profile?feedback=error");
  }

  revalidatePath("/profile");
  redirect("/profile?feedback=sent");
}
