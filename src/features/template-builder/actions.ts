"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminActionClient } from "@/features/auth/admin-action";
import {
  milestoneFormSchema,
  milestoneCommandSchema,
  milestoneUpdateSchema,
  templateFormSchema,
  templateItemCommandSchema,
  templateItemFormSchema,
  templateItemUpdateSchema,
  templateUpdateApplySchema,
  templatePayload,
} from "@/features/template-builder/schemas";

function readTemplate(formData: FormData) {
  return templateFormSchema.safeParse({
    id: formData.get("id") || undefined,
    slug: formData.get("slug"),
    name: formData.get("name"),
    description: formData.get("description") || "",
    scope_type: formData.get("scope_type") || "company",
    scope_value: formData.get("scope_value") || null,
  });
}

function numericField(formData: FormData, name: string, emptyAsNull = false) {
  const value = formData.get(name);
  if (emptyAsNull && (value === null || value === "")) {
    return null;
  }
  return Number(value);
}

export async function createTemplateDraft(formData: FormData) {
  const parsed = readTemplate(formData);
  if (!parsed.success) {
    redirect("/admin/templates?error=invalid");
  }

  const { supabase } = await requireAdminActionClient();
  const { data, error } = await supabase.rpc("create_template_draft", {
    p_payload: templatePayload(parsed.data),
  });
  if (error || !data) {
    redirect("/admin/templates?error=save");
  }

  redirect("/admin/templates/" + data);
}

export async function updateTemplateDraft(formData: FormData) {
  const parsed = readTemplate(formData);
  if (!parsed.success || !parsed.data.id) {
    redirect("/admin/templates?error=invalid");
  }

  const { supabase } = await requireAdminActionClient();
  const { error } = await supabase.rpc("update_template_draft", {
    p_template_id: parsed.data.id,
    p_payload: templatePayload(parsed.data),
  });
  if (error) {
    redirect("/admin/templates/" + parsed.data.id + "?error=save");
  }

  redirect("/admin/templates/" + parsed.data.id + "?saved=1");
}

export async function addTemplateMilestone(formData: FormData) {
  const parsed = milestoneFormSchema.safeParse({
    template_id: formData.get("template_id"),
    name: formData.get("name"),
    sequence: numericField(formData, "sequence"),
    available_offset_days: numericField(formData, "available_offset_days"),
  });
  if (!parsed.success) {
    redirect("/admin/templates?error=invalid");
  }

  const { supabase } = await requireAdminActionClient();
  const { error } = await supabase.rpc("add_template_milestone", {
    p_template_id: parsed.data.template_id,
    p_name: parsed.data.name,
    p_sequence: parsed.data.sequence,
    p_available_offset_days: parsed.data.available_offset_days,
  });
  const destination = "/admin/templates/" + parsed.data.template_id;
  if (error) {
    redirect(destination + "?error=milestone");
  }
  redirect(destination + "?milestone=1");
}

export async function addTemplateItem(formData: FormData) {
  const parsed = templateItemFormSchema.safeParse({
    milestone_id: formData.get("milestone_id"),
    content_id: formData.get("content_id"),
    sequence: numericField(formData, "sequence"),
    is_required: formData.get("is_required") === "on",
    available_offset_days: numericField(formData, "available_offset_days"),
    due_offset_days: numericField(formData, "due_offset_days", true),
    completion_rule: formData.get("completion_rule"),
    include_in_progress: formData.get("include_in_progress") === "on",
  });
  if (!parsed.success) {
    redirect("/admin/templates?error=invalid");
  }

  const { supabase } = await requireAdminActionClient();
  const { data: milestone } = await supabase
    .from("milestones")
    .select("template_id")
    .eq("id", parsed.data.milestone_id)
    .maybeSingle();
  if (!milestone?.template_id) {
    redirect("/admin/templates?error=milestone");
  }

  const { error } = await supabase.rpc("add_template_item", {
    p_milestone_id: parsed.data.milestone_id,
    p_content_id: parsed.data.content_id,
    p_sequence: parsed.data.sequence,
    p_is_required: parsed.data.is_required,
    p_available_offset_days: parsed.data.available_offset_days,
    p_due_offset_days: parsed.data.due_offset_days,
    p_completion_rule: parsed.data.completion_rule,
    p_include_in_progress: parsed.data.include_in_progress,
    p_settings: {},
  });
  const destination = "/admin/templates/" + milestone.template_id;
  if (error) {
    redirect(destination + "?error=item");
  }
  redirect(destination + "?item=1");
}

export async function updateTemplateMilestone(formData: FormData) {
  const parsed = milestoneUpdateSchema.safeParse({
    id: formData.get("id"),
    template_id: formData.get("template_id"),
    name: formData.get("name"),
    available_offset_days: numericField(formData, "available_offset_days"),
  });
  if (!parsed.success) {
    redirect("/admin/templates?error=invalid");
  }

  const { supabase } = await requireAdminActionClient();
  const { error } = await supabase.rpc("update_template_milestone", {
    p_milestone_id: parsed.data.id,
    p_name: parsed.data.name,
    p_available_offset_days: parsed.data.available_offset_days,
  });
  const destination = "/admin/templates/" + parsed.data.template_id;
  if (error) {
    redirect(destination + "?error=milestone");
  }
  redirect(destination + "?saved=1");
}

export async function moveTemplateMilestone(formData: FormData) {
  const parsed = milestoneCommandSchema.safeParse({
    id: formData.get("id"),
    template_id: formData.get("template_id"),
    direction: formData.get("direction"),
  });
  if (!parsed.success || !parsed.data.direction) {
    redirect("/admin/templates?error=invalid");
  }
  const { supabase } = await requireAdminActionClient();
  const { error } = await supabase.rpc("move_template_milestone", {
    p_milestone_id: parsed.data.id,
    p_direction: parsed.data.direction,
  });
  const destination = "/admin/templates/" + parsed.data.template_id;
  if (error) {
    redirect(destination + "?error=milestone");
  }
  redirect(destination + "?saved=1");
}

export async function removeTemplateMilestone(formData: FormData) {
  const parsed = milestoneCommandSchema.safeParse({
    id: formData.get("id"),
    template_id: formData.get("template_id"),
  });
  if (!parsed.success) {
    redirect("/admin/templates?error=invalid");
  }
  const { supabase } = await requireAdminActionClient();
  const { error } = await supabase.rpc("remove_template_milestone", {
    p_milestone_id: parsed.data.id,
  });
  const destination = "/admin/templates/" + parsed.data.template_id;
  if (error) {
    redirect(destination + "?error=milestone");
  }
  redirect(destination + "?removed=1");
}

export async function updateTemplateItem(formData: FormData) {
  const parsed = templateItemUpdateSchema.safeParse({
    id: formData.get("id"),
    template_id: formData.get("template_id"),
    is_required: formData.get("is_required") === "on",
    available_offset_days: numericField(formData, "available_offset_days"),
    due_offset_days: numericField(formData, "due_offset_days", true),
    completion_rule: formData.get("completion_rule"),
    include_in_progress: formData.get("include_in_progress") === "on",
  });
  if (!parsed.success) {
    redirect("/admin/templates?error=invalid");
  }
  const { supabase } = await requireAdminActionClient();
  const { error } = await supabase.rpc("update_template_item", {
    p_item_id: parsed.data.id,
    p_is_required: parsed.data.is_required,
    p_available_offset_days: parsed.data.available_offset_days,
    p_due_offset_days: parsed.data.due_offset_days,
    p_completion_rule: parsed.data.completion_rule,
    p_include_in_progress: parsed.data.include_in_progress,
  });
  const destination = "/admin/templates/" + parsed.data.template_id;
  if (error) {
    redirect(destination + "?error=item");
  }
  redirect(destination + "?saved=1");
}

export async function moveTemplateItem(formData: FormData) {
  const parsed = templateItemCommandSchema.safeParse({
    id: formData.get("id"),
    template_id: formData.get("template_id"),
    direction: formData.get("direction"),
  });
  if (!parsed.success || !parsed.data.direction) {
    redirect("/admin/templates?error=invalid");
  }
  const { supabase } = await requireAdminActionClient();
  const { error } = await supabase.rpc("move_template_item", {
    p_item_id: parsed.data.id,
    p_direction: parsed.data.direction,
  });
  const destination = "/admin/templates/" + parsed.data.template_id;
  if (error) {
    redirect(destination + "?error=item");
  }
  redirect(destination + "?saved=1");
}

export async function removeTemplateItem(formData: FormData) {
  const parsed = templateItemCommandSchema.safeParse({
    id: formData.get("id"),
    template_id: formData.get("template_id"),
  });
  if (!parsed.success) {
    redirect("/admin/templates?error=invalid");
  }
  const { supabase } = await requireAdminActionClient();
  const { error } = await supabase.rpc("remove_template_item", {
    p_item_id: parsed.data.id,
  });
  const destination = "/admin/templates/" + parsed.data.template_id;
  if (error) {
    redirect(destination + "?error=item");
  }
  redirect(destination + "?removed=1");
}

export async function publishTemplate(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string") {
    redirect("/admin/templates?error=invalid");
  }

  const { supabase } = await requireAdminActionClient();
  const { error } = await supabase.rpc("publish_template", {
    p_template_id: id,
  });
  if (error) {
    redirect("/admin/templates/" + id + "?error=publish");
  }
  redirect("/admin/templates/" + id + "?published=1");
}

export async function reopenTemplateDraft(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string") {
    redirect("/admin/templates?error=invalid");
  }
  const { supabase } = await requireAdminActionClient();
  const { error } = await supabase.rpc("reopen_template_draft", {
    p_template_id: id,
  });
  if (error) {
    redirect("/admin/templates/" + id + "?error=reopen");
  }
  redirect("/admin/templates/" + id + "?draft=1");
}

export async function applyTemplateUpdate(formData: FormData) {
  const parsed = templateUpdateApplySchema.safeParse({
    template_id: formData.get("template_id"),
    journey_id: formData.get("journey_id"),
    expected_to_version: formData.get("expected_to_version"),
  });
  if (!parsed.success) {
    redirect("/admin/templates?error=invalid");
  }

  const { supabase } = await requireAdminActionClient();
  const { error } = await supabase.rpc("apply_template_update_to_journey", {
    p_journey_id: parsed.data.journey_id,
    p_expected_to_version: parsed.data.expected_to_version,
  });
  const destination = "/admin/templates/" + parsed.data.template_id;
  if (error) {
    redirect(destination + "?error=apply");
  }

  revalidatePath(destination);
  revalidatePath("/admin/progress");
  revalidatePath("/admin/dashboard");
  revalidatePath("/roadmap");
  redirect(destination + "?applied=1");
}

export async function archiveTemplate(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string") {
    redirect("/admin/templates?error=invalid");
  }
  const { supabase } = await requireAdminActionClient();
  const { error } = await supabase.rpc("archive_template", {
    p_template_id: id,
  });
  if (error) {
    redirect("/admin/templates/" + id + "?error=archive");
  }
  redirect("/admin/templates?archived=1");
}
