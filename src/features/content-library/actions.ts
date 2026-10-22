"use server";

import { redirect } from "next/navigation";
import { requireAdminActionClient } from "@/features/auth/admin-action";
import {
  contentFormSchema,
  contentPayload,
} from "@/features/content-library/schemas";

function readContentForm(formData: FormData) {
  const parsed = contentFormSchema.safeParse({
    id: formData.get("id") || undefined,
    slug: formData.get("slug"),
    title: formData.get("title"),
    description: formData.get("description") || "",
    category: formData.get("category") || "general",
    content_type: formData.get("content_type"),
    scope_type: formData.get("scope_type") || "company",
    scope_value: formData.get("scope_value") || null,
    body_text: formData.get("body_text"),
    change_note: formData.get("change_note") || "",
  });

  return parsed;
}

export async function createContentDraft(formData: FormData) {
  const parsed = readContentForm(formData);
  if (!parsed.success) {
    redirect("/admin/content?error=invalid");
  }

  const { supabase } = await requireAdminActionClient();
  const { data, error } = await supabase.rpc("create_content_draft", {
    p_payload: contentPayload(parsed.data),
  });
  if (error || !data) {
    redirect("/admin/content?error=save");
  }

  redirect("/admin/content?created=1");
}

export async function publishContentVersion(formData: FormData) {
  const parsed = readContentForm(formData);
  if (!parsed.success || !parsed.data.id || !parsed.data.change_note) {
    redirect("/admin/content?error=invalid");
  }

  const { supabase } = await requireAdminActionClient();
  const { error } = await supabase.rpc("publish_content", {
    p_content_id: parsed.data.id,
    p_payload: contentPayload(parsed.data),
    p_change_note: parsed.data.change_note,
  });
  if (error) {
    redirect("/admin/content?error=publish");
  }

  redirect("/admin/content?published=1");
}

export async function archiveContent(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string") {
    redirect("/admin/content?error=invalid");
  }

  const { supabase } = await requireAdminActionClient();
  const { error } = await supabase.rpc("archive_content", {
    p_content_id: id,
  });
  if (error) {
    redirect("/admin/content?error=archive");
  }

  redirect("/admin/content?archived=1");
}
