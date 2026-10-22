"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminActionClient } from "@/features/auth/admin-action";
import {
  assignJourneySchema,
  manageActivitySchema,
  supportContactSchema,
} from "@/features/admin-operations/schemas";

export async function assignJourney(formData: FormData) {
  const parsed = assignJourneySchema.safeParse({
    employee_id: formData.get("employee_id"),
    template_id: formData.get("template_id"),
    start_date: formData.get("start_date"),
  });
  if (!parsed.success) redirect("/admin/employees?error=invalid");

  const { supabase } = await requireAdminActionClient();
  const { error } = await supabase.rpc("assign_template_to_employee", {
    p_template_id: parsed.data.template_id,
    p_employee_id: parsed.data.employee_id,
    p_start_date: parsed.data.start_date,
  });
  if (error) redirect("/admin/employees?error=assignment");

  revalidatePath("/admin/employees");
  revalidatePath("/admin/dashboard");
  redirect("/admin/employees?assigned=1");
}

export async function manageJourneyActivity(formData: FormData) {
  const parsed = manageActivitySchema.safeParse({
    activity_id: formData.get("activity_id"),
    action: formData.get("action"),
    note: formData.get("note"),
  });
  if (!parsed.success) redirect("/admin/progress?error=invalid");

  const { supabase } = await requireAdminActionClient();
  const { error } = await supabase.rpc("manage_journey_activity", {
    p_activity_id: parsed.data.activity_id,
    p_action: parsed.data.action,
    p_note: parsed.data.note,
  });
  if (error) redirect("/admin/progress?error=update");

  revalidatePath("/admin/progress");
  revalidatePath("/admin/dashboard");
  revalidatePath("/roadmap");
  redirect("/admin/progress?updated=1");
}

export async function saveSupportContact(formData: FormData) {
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

  const { supabase } = await requireAdminActionClient();
  const { error } = await supabase.rpc("upsert_support_contact", {
    p_contact_id: parsed.data.id ?? null,
    p_payload: {
      display_name: parsed.data.display_name,
      support_role: parsed.data.support_role,
      scope_type: parsed.data.scope_type,
      scope_value:
        parsed.data.scope_type === "company" ? null : parsed.data.scope_value,
      contact_email: parsed.data.contact_email,
      contact_phone: parsed.data.contact_phone,
      contact_url: parsed.data.contact_url,
    },
  });
  if (error) redirect("/admin/settings/support?error=save");

  revalidatePath("/admin/settings/support");
  revalidatePath("/support");
  redirect("/admin/settings/support?saved=1");
}

export async function archiveSupportContact(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) {
    redirect("/admin/settings/support?error=invalid");
  }

  const { supabase } = await requireAdminActionClient();
  const { error } = await supabase.rpc("archive_support_contact", {
    p_contact_id: id,
  });
  if (error) redirect("/admin/settings/support?error=archive");

  revalidatePath("/admin/settings/support");
  revalidatePath("/support");
  redirect("/admin/settings/support?archived=1");
}
