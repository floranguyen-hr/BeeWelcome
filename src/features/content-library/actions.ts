"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { requireRole } from "@/features/auth/session";
import { getSqlPool, sql } from "@/lib/db/sqlserver";
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
  const admin = await requireRole("hr_admin");
  const parsed = readContentForm(formData);
  if (!parsed.success) {
    redirect("/admin/content?error=invalid");
  }

  const payload = contentPayload(parsed.data);
  const newContentId = crypto.randomUUID();
  const newVerId = crypto.randomUUID();

  try {
    const pool = await getSqlPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();

    try {
      const reqContent = new sql.Request(tx);
      await reqContent
        .input("id", sql.UniqueIdentifier, newContentId)
        .input("slug", sql.NVarChar(120), parsed.data.slug)
        .input("title", sql.NVarChar(200), parsed.data.title)
        .input("description", sql.NVarChar(1000), parsed.data.description || "")
        .input("category", sql.NVarChar(80), parsed.data.category || "general")
        .input("contentType", sql.NVarChar(30), parsed.data.content_type)
        .input("scopeType", sql.NVarChar(30), parsed.data.scope_type || "company")
        .input("scopeValue", sql.NVarChar(160), parsed.data.scope_value || null)
        .query(`
          INSERT INTO app.Contents (Id, Slug, Title, Description, Category, ContentType, ScopeType, ScopeValue, Status, CurrentVersion)
          VALUES (@id, @slug, @title, @description, @category, @contentType, @scopeType, @scopeValue, N'draft', 1)
        `);

      const reqVer = new sql.Request(tx);
      await reqVer
        .input("id", sql.UniqueIdentifier, newVerId)
        .input("contentId", sql.UniqueIdentifier, newContentId)
        .input("body", sql.NVarChar(sql.MAX), JSON.stringify(payload.body))
        .input("changeNote", sql.NVarChar(1000), "Tạo bản nháp nội dung mới")
        .query(`
          INSERT INTO app.ContentVersions (Id, ContentId, VersionNumber, Body, VersionStatus, ChangeNote)
          VALUES (@id, @contentId, 1, @body, N'draft', @changeNote)
        `);

      await tx.commit();
    } catch (txErr) {
      await tx.rollback();
      throw txErr;
    }
  } catch (err) {
    console.error("Lỗi tạo bản nháp content:", err);
    redirect("/admin/content?error=save");
  }

  redirect("/admin/content?created=1");
}

export async function publishContentVersion(formData: FormData) {
  const admin = await requireRole("hr_admin");
  const parsed = readContentForm(formData);
  if (!parsed.success || !parsed.data.id || !parsed.data.change_note) {
    redirect("/admin/content?error=invalid");
  }

  const payload = contentPayload(parsed.data);

  try {
    const pool = await getSqlPool();
    const req = pool.request();
    req.input("ContentId", sql.UniqueIdentifier, parsed.data.id);
    req.input("Title", sql.NVarChar(200), parsed.data.title);
    req.input("Description", sql.NVarChar(1000), parsed.data.description || "");
    req.input("Category", sql.NVarChar(80), parsed.data.category || "general");
    req.input("ContentType", sql.NVarChar(30), parsed.data.content_type);
    req.input("ScopeType", sql.NVarChar(30), parsed.data.scope_type || "company");
    req.input("ScopeValue", sql.NVarChar(160), parsed.data.scope_value || null);
    req.input("BodyJson", sql.NVarChar(sql.MAX), JSON.stringify(payload.body));
    req.input("ChangeNote", sql.NVarChar(1000), parsed.data.change_note);
    req.input("ActorId", sql.UniqueIdentifier, admin.id);
    req.output("NewVersion", sql.Int);

    await req.execute("app.sp_PublishContent");
  } catch (err) {
    console.error("Lỗi xuất bản nội dung:", err);
    redirect("/admin/content?error=publish");
  }

  redirect("/admin/content?published=1");
}

export async function archiveContent(formData: FormData) {
  await requireRole("hr_admin");
  const id = formData.get("id");
  if (typeof id !== "string") {
    redirect("/admin/content?error=invalid");
  }

  try {
    const pool = await getSqlPool();
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, id)
      .query(`UPDATE app.Contents SET Status = N'archived', UpdatedAt = SYSUTCDATETIME() WHERE Id = @id`);
  } catch (err) {
    console.error("Lỗi lưu trữ content:", err);
    redirect("/admin/content?error=archive");
  }

  redirect("/admin/content?archived=1");
}
