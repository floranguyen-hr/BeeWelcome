"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/features/auth/session";
import { getSqlPool, sql } from "@/lib/db/sqlserver";
import {
  assignJourneySchema,
  manageActivitySchema,
  supportContactSchema,
} from "@/features/admin-operations/schemas";

export async function assignJourney(formData: FormData) {
  const admin = await requireRole("hr_admin");

  const parsed = assignJourneySchema.safeParse({
    employee_id: formData.get("employee_id"),
    template_id: formData.get("template_id"),
    start_date: formData.get("start_date"),
  });
  if (!parsed.success) redirect("/admin/employees?error=invalid");

  try {
    const pool = await getSqlPool();
    const req = pool.request();
    req.input("TemplateId", sql.UniqueIdentifier, parsed.data.template_id);
    req.input("EmployeeId", sql.UniqueIdentifier, parsed.data.employee_id);
    req.input("StartDate", sql.Date, parsed.data.start_date);
    req.input("ActorId", sql.UniqueIdentifier, admin.id);
    req.output("JourneyId", sql.UniqueIdentifier);

    await req.execute("app.sp_AssignTemplateToEmployee");
  } catch (err) {
    console.error("Lỗi gán hành trình SQL Server:", err);
    redirect("/admin/employees?error=assignment");
  }

  revalidatePath("/admin/employees");
  revalidatePath("/admin/dashboard");
  redirect("/admin/employees?assigned=1");
}

export async function manageJourneyActivity(formData: FormData) {
  const admin = await requireRole("hr_admin");

  const parsed = manageActivitySchema.safeParse({
    activity_id: formData.get("activity_id"),
    action: formData.get("action"),
    note: formData.get("note"),
  });
  if (!parsed.success) redirect("/admin/progress?error=invalid");

  try {
    const pool = await getSqlPool();
    const req = pool.request();
    req.input("ActivityId", sql.UniqueIdentifier, parsed.data.activity_id);
    req.input("Action", sql.NVarChar(20), parsed.data.action);
    req.input("Note", sql.NVarChar(500), parsed.data.note);
    req.input("ActorId", sql.UniqueIdentifier, admin.id);

    await req.execute("app.sp_ManageJourneyActivity");
  } catch (err) {
    console.error("Lỗi cập nhật tiến độ SQL Server:", err);
    redirect("/admin/progress?error=update");
  }

  revalidatePath("/admin/progress");
  revalidatePath("/admin/dashboard");
  revalidatePath("/roadmap");
  redirect("/admin/progress?updated=1");
}

export async function saveSupportContact(formData: FormData) {
  const admin = await requireRole("hr_admin");

  const parsed = supportContactSchema.safeParse({
    id: formData.get("id") || undefined,
    display_name: formData.get("display_name"),
    support_role: formData.get("support_role"),
    scope_type: formData.get("scope_type"),
    scope_value: formData.get("scope_value") || null,
    contact_email: formData.get("contact_email") || "",
    contact_phone: formData.get("contact_phone") || "",
    contact_url: formData.get("contact_url") || "",
  });
  if (!parsed.success) redirect("/admin/settings/support?error=invalid");

  try {
    const pool = await getSqlPool();
    const req = pool.request();
    req.input("ContactId", sql.UniqueIdentifier, parsed.data.id || null);
    req.input("DisplayName", sql.NVarChar(120), parsed.data.display_name);
    req.input("SupportRole", sql.NVarChar(120), parsed.data.support_role);
    req.input("ScopeType", sql.NVarChar(30), parsed.data.scope_type);
    req.input(
      "ScopeValue",
      sql.NVarChar(160),
      parsed.data.scope_type === "company" ? null : parsed.data.scope_value,
    );
    req.input("ContactEmail", sql.NVarChar(320), parsed.data.contact_email || null);
    req.input("ContactPhone", sql.NVarChar(80), parsed.data.contact_phone || null);
    req.input("ContactUrl", sql.NVarChar(1000), parsed.data.contact_url || null);
    req.input("ActorId", sql.UniqueIdentifier, admin.id);
    req.output("ResultContactId", sql.UniqueIdentifier);

    await req.execute("app.sp_UpsertSupportContact");
  } catch (err) {
    console.error("Lỗi lưu liên hệ hỗ trợ SQL Server:", err);
    redirect("/admin/settings/support?error=save");
  }

  revalidatePath("/admin/settings/support");
  revalidatePath("/support");
  redirect("/admin/settings/support?saved=1");
}

export async function archiveSupportContact(formData: FormData) {
  const admin = await requireRole("hr_admin");

  const id = formData.get("id");
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) {
    redirect("/admin/settings/support?error=invalid");
  }

  try {
    const pool = await getSqlPool();
    const req = pool.request();
    req.input("ContactId", sql.UniqueIdentifier, id);
    req.input("ActorId", sql.UniqueIdentifier, admin.id);

    await req.execute("app.sp_ArchiveSupportContact");
  } catch (err) {
    console.error("Lỗi lưu trữ liên hệ SQL Server:", err);
    redirect("/admin/settings/support?error=archive");
  }

  revalidatePath("/admin/settings/support");
  revalidatePath("/support");
  redirect("/admin/settings/support?archived=1");
}
