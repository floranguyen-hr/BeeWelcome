"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/features/auth/session";
import { getSqlPool, sql } from "@/lib/db/sqlserver";
import {
  milestoneFormSchema,
  milestoneCommandSchema,
  milestoneUpdateSchema,
  templateFormSchema,
  templateItemCommandSchema,
  templateItemFormSchema,
  templateItemUpdateSchema,
  templateUpdateApplySchema,
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
  await requireRole("hr_admin");
  const parsed = readTemplate(formData);
  if (!parsed.success) {
    redirect("/admin/templates?error=invalid");
  }

  const newId = crypto.randomUUID();

  try {
    const pool = await getSqlPool();
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, newId)
      .input("slug", sql.NVarChar(120), parsed.data.slug)
      .input("name", sql.NVarChar(160), parsed.data.name)
      .input("description", sql.NVarChar(2000), parsed.data.description || "")
      .input("scopeType", sql.NVarChar(30), parsed.data.scope_type || "company")
      .input("scopeValue", sql.NVarChar(160), parsed.data.scope_value || null)
      .query(`
        INSERT INTO app.Templates (Id, Slug, Name, Description, ScopeType, ScopeValue, Status, VersionNumber)
        VALUES (@id, @slug, @name, @description, @scopeType, @scopeValue, N'draft', 1)
      `);
  } catch (err) {
    console.error("Lỗi tạo template:", err);
    redirect("/admin/templates?error=save");
  }

  redirect("/admin/templates/" + newId);
}

export async function updateTemplateDraft(formData: FormData) {
  await requireRole("hr_admin");
  const parsed = readTemplate(formData);
  if (!parsed.success || !parsed.data.id) {
    redirect("/admin/templates?error=invalid");
  }

  try {
    const pool = await getSqlPool();
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, parsed.data.id)
      .input("slug", sql.NVarChar(120), parsed.data.slug)
      .input("name", sql.NVarChar(160), parsed.data.name)
      .input("description", sql.NVarChar(2000), parsed.data.description || "")
      .input("scopeType", sql.NVarChar(30), parsed.data.scope_type || "company")
      .input("scopeValue", sql.NVarChar(160), parsed.data.scope_value || null)
      .query(`
        UPDATE app.Templates
        SET Slug = @slug, Name = @name, Description = @description, ScopeType = @scopeType, ScopeValue = @scopeValue, UpdatedAt = SYSUTCDATETIME()
        WHERE Id = @id AND Status = N'draft'
      `);
  } catch (err) {
    console.error("Lỗi cập nhật template:", err);
    redirect("/admin/templates/" + parsed.data.id + "?error=save");
  }

  redirect("/admin/templates/" + parsed.data.id + "?saved=1");
}

export async function addTemplateMilestone(formData: FormData) {
  await requireRole("hr_admin");
  const parsed = milestoneFormSchema.safeParse({
    template_id: formData.get("template_id"),
    name: formData.get("name"),
    sequence: numericField(formData, "sequence"),
    available_offset_days: numericField(formData, "available_offset_days"),
  });
  if (!parsed.success) {
    redirect("/admin/templates?error=invalid");
  }

  const newMilestoneId = crypto.randomUUID();

  try {
    const pool = await getSqlPool();
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, newMilestoneId)
      .input("templateId", sql.UniqueIdentifier, parsed.data.template_id)
      .input("name", sql.NVarChar(120), parsed.data.name)
      .input("sequence", sql.Int, parsed.data.sequence)
      .input("availableOffsetDays", sql.Int, parsed.data.available_offset_days)
      .query(`
        INSERT INTO app.Milestones (Id, TemplateId, Name, Sequence, AvailableOffsetDays, IsActive)
        VALUES (@id, @templateId, @name, @sequence, @availableOffsetDays, 1)
      `);
  } catch (err) {
    console.error("Lỗi thêm milestone:", err);
    redirect("/admin/templates/" + parsed.data.template_id + "?error=milestone");
  }

  redirect("/admin/templates/" + parsed.data.template_id + "?milestone=1");
}

export async function addTemplateItem(formData: FormData) {
  await requireRole("hr_admin");
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

  let templateId = "";
  try {
    const pool = await getSqlPool();
    const mRes = await pool
      .request()
      .input("milestoneId", sql.UniqueIdentifier, parsed.data.milestone_id)
      .query(`SELECT TemplateId FROM app.Milestones WHERE Id = @milestoneId`);

    if (mRes.recordset.length === 0) {
      redirect("/admin/templates?error=milestone");
    }
    templateId = String(mRes.recordset[0].TemplateId);

    const newItemId = crypto.randomUUID();
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, newItemId)
      .input("milestoneId", sql.UniqueIdentifier, parsed.data.milestone_id)
      .input("contentId", sql.UniqueIdentifier, parsed.data.content_id)
      .input("sequence", sql.Int, parsed.data.sequence)
      .input("isRequired", sql.Bit, parsed.data.is_required)
      .input("availableOffsetDays", sql.Int, parsed.data.available_offset_days)
      .input("dueOffsetDays", sql.Int, parsed.data.due_offset_days)
      .input("completionRule", sql.NVarChar(50), parsed.data.completion_rule)
      .input("includeInProgress", sql.Bit, parsed.data.include_in_progress)
      .query(`
        INSERT INTO app.TemplateItems (Id, MilestoneId, ContentId, Sequence, IsRequired, AvailableOffsetDays, DueOffsetDays, CompletionRule, IncludeInProgress, IsActive)
        VALUES (@id, @milestoneId, @contentId, @sequence, @isRequired, @availableOffsetDays, @dueOffsetDays, @completionRule, @includeInProgress, 1)
      `);
  } catch (err) {
    console.error("Lỗi thêm template item:", err);
    redirect("/admin/templates/" + templateId + "?error=item");
  }

  redirect("/admin/templates/" + templateId + "?item=1");
}

export async function updateTemplateMilestone(formData: FormData) {
  await requireRole("hr_admin");
  const parsed = milestoneUpdateSchema.safeParse({
    id: formData.get("id"),
    template_id: formData.get("template_id"),
    name: formData.get("name"),
    available_offset_days: numericField(formData, "available_offset_days"),
  });
  if (!parsed.success) {
    redirect("/admin/templates?error=invalid");
  }

  try {
    const pool = await getSqlPool();
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, parsed.data.id)
      .input("name", sql.NVarChar(120), parsed.data.name)
      .input("availableOffsetDays", sql.Int, parsed.data.available_offset_days)
      .query(`
        UPDATE app.Milestones
        SET Name = @name, AvailableOffsetDays = @availableOffsetDays
        WHERE Id = @id
      `);
  } catch (err) {
    console.error("Lỗi cập nhật milestone:", err);
    redirect("/admin/templates/" + parsed.data.template_id + "?error=milestone");
  }

  redirect("/admin/templates/" + parsed.data.template_id + "?saved=1");
}

export async function moveTemplateMilestone(formData: FormData) {
  await requireRole("hr_admin");
  const parsed = milestoneCommandSchema.safeParse({
    id: formData.get("id"),
    template_id: formData.get("template_id"),
    direction: formData.get("direction"),
  });
  if (!parsed.success || !parsed.data.direction) {
    redirect("/admin/templates?error=invalid");
  }

  try {
    const pool = await getSqlPool();
    const delta = parsed.data.direction === "up" ? -1 : 1;
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, parsed.data.id)
      .input("delta", sql.Int, delta)
      .query(`
        UPDATE app.Milestones
        SET Sequence = Sequence + @delta
        WHERE Id = @id
      `);
  } catch (err) {
    console.error("Lỗi di chuyển milestone:", err);
  }

  redirect("/admin/templates/" + parsed.data.template_id + "?saved=1");
}

export async function removeTemplateMilestone(formData: FormData) {
  await requireRole("hr_admin");
  const parsed = milestoneCommandSchema.safeParse({
    id: formData.get("id"),
    template_id: formData.get("template_id"),
  });
  if (!parsed.success) {
    redirect("/admin/templates?error=invalid");
  }

  try {
    const pool = await getSqlPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      await new sql.Request(tx)
        .input("milestoneId", sql.UniqueIdentifier, parsed.data.id)
        .query(`DELETE FROM app.TemplateItems WHERE MilestoneId = @milestoneId`);
      await new sql.Request(tx)
        .input("id", sql.UniqueIdentifier, parsed.data.id)
        .query(`DELETE FROM app.Milestones WHERE Id = @id`);
      await tx.commit();
    } catch (txErr) {
      await tx.rollback();
      throw txErr;
    }
  } catch (err) {
    console.error("Lỗi xóa milestone:", err);
    redirect("/admin/templates/" + parsed.data.template_id + "?error=milestone");
  }

  redirect("/admin/templates/" + parsed.data.template_id + "?removed=1");
}

export async function updateTemplateItem(formData: FormData) {
  await requireRole("hr_admin");
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

  try {
    const pool = await getSqlPool();
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, parsed.data.id)
      .input("isRequired", sql.Bit, parsed.data.is_required)
      .input("availableOffsetDays", sql.Int, parsed.data.available_offset_days)
      .input("dueOffsetDays", sql.Int, parsed.data.due_offset_days)
      .input("completionRule", sql.NVarChar(50), parsed.data.completion_rule)
      .input("includeInProgress", sql.Bit, parsed.data.include_in_progress)
      .query(`
        UPDATE app.TemplateItems
        SET IsRequired = @isRequired,
            AvailableOffsetDays = @availableOffsetDays,
            DueOffsetDays = @dueOffsetDays,
            CompletionRule = @completionRule,
            IncludeInProgress = @includeInProgress
        WHERE Id = @id
      `);
  } catch (err) {
    console.error("Lỗi cập nhật template item:", err);
    redirect("/admin/templates/" + parsed.data.template_id + "?error=item");
  }

  redirect("/admin/templates/" + parsed.data.template_id + "?saved=1");
}

export async function moveTemplateItem(formData: FormData) {
  await requireRole("hr_admin");
  const parsed = templateItemCommandSchema.safeParse({
    id: formData.get("id"),
    template_id: formData.get("template_id"),
    direction: formData.get("direction"),
  });
  if (!parsed.success || !parsed.data.direction) {
    redirect("/admin/templates?error=invalid");
  }

  try {
    const pool = await getSqlPool();
    const delta = parsed.data.direction === "up" ? -1 : 1;
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, parsed.data.id)
      .input("delta", sql.Int, delta)
      .query(`UPDATE app.TemplateItems SET Sequence = Sequence + @delta WHERE Id = @id`);
  } catch (err) {
    console.error("Lỗi di chuyển template item:", err);
  }

  redirect("/admin/templates/" + parsed.data.template_id + "?saved=1");
}

export async function removeTemplateItem(formData: FormData) {
  await requireRole("hr_admin");
  const parsed = templateItemCommandSchema.safeParse({
    id: formData.get("id"),
    template_id: formData.get("template_id"),
  });
  if (!parsed.success) {
    redirect("/admin/templates?error=invalid");
  }

  try {
    const pool = await getSqlPool();
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, parsed.data.id)
      .query(`DELETE FROM app.TemplateItems WHERE Id = @id`);
  } catch (err) {
    console.error("Lỗi xóa template item:", err);
    redirect("/admin/templates/" + parsed.data.template_id + "?error=item");
  }

  redirect("/admin/templates/" + parsed.data.template_id + "?removed=1");
}

export async function publishTemplate(formData: FormData) {
  await requireRole("hr_admin");
  const id = formData.get("id");
  if (typeof id !== "string") {
    redirect("/admin/templates?error=invalid");
  }

  try {
    const pool = await getSqlPool();
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, id)
      .query(`UPDATE app.Templates SET Status = N'published', UpdatedAt = SYSUTCDATETIME() WHERE Id = @id`);
  } catch (err) {
    console.error("Lỗi xuất bản template:", err);
    redirect("/admin/templates/" + id + "?error=publish");
  }

  redirect("/admin/templates/" + id + "?published=1");
}

export async function reopenTemplateDraft(formData: FormData) {
  await requireRole("hr_admin");
  const id = formData.get("id");
  if (typeof id !== "string") {
    redirect("/admin/templates?error=invalid");
  }

  try {
    const pool = await getSqlPool();
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, id)
      .query(`UPDATE app.Templates SET Status = N'draft', VersionNumber = VersionNumber + 1, UpdatedAt = SYSUTCDATETIME() WHERE Id = @id`);
  } catch (err) {
    console.error("Lỗi mở lại bản nháp template:", err);
    redirect("/admin/templates/" + id + "?error=reopen");
  }

  redirect("/admin/templates/" + id + "?draft=1");
}

export async function applyTemplateUpdate(formData: FormData) {
  const admin = await requireRole("hr_admin");
  const parsed = templateUpdateApplySchema.safeParse({
    template_id: formData.get("template_id"),
    journey_id: formData.get("journey_id"),
    expected_to_version: formData.get("expected_to_version"),
  });
  if (!parsed.success) {
    redirect("/admin/templates?error=invalid");
  }

  try {
    const pool = await getSqlPool();
    const req = pool.request();
    req.input("TemplateId", sql.UniqueIdentifier, parsed.data.template_id);
    req.input("ActorId", sql.UniqueIdentifier, admin.id);
    await req.execute("app.sp_ApplyTemplateJourneyUpdates");
  } catch (err) {
    console.error("Lỗi áp dụng cập nhật template:", err);
    redirect("/admin/templates/" + parsed.data.template_id + "?error=apply");
  }

  const destination = "/admin/templates/" + parsed.data.template_id;
  revalidatePath(destination);
  revalidatePath("/admin/progress");
  revalidatePath("/admin/dashboard");
  revalidatePath("/roadmap");
  redirect(destination + "?applied=1");
}

export async function archiveTemplate(formData: FormData) {
  await requireRole("hr_admin");
  const id = formData.get("id");
  if (typeof id !== "string") {
    redirect("/admin/templates?error=invalid");
  }

  try {
    const pool = await getSqlPool();
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, id)
      .query(`UPDATE app.Templates SET Status = N'archived', UpdatedAt = SYSUTCDATETIME() WHERE Id = @id`);
  } catch (err) {
    console.error("Lỗi lưu trữ template:", err);
    redirect("/admin/templates/" + id + "?error=archive");
  }

  redirect("/admin/templates?archived=1");
}
