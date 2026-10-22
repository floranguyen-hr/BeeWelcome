import Link from "next/link";
import { createTemplateDraft } from "@/features/template-builder/actions";
import { requireRole } from "@/features/auth/session";
import { getSqlPool, sql } from "@/lib/db/sqlserver";

type SearchParams = { status?: string; error?: string; archived?: string };

export async function TemplateListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole("hr_admin");
  const params = await searchParams;

  let templates: Array<{
    id: string;
    slug: string;
    name: string;
    description: string | null;
    scope_type: string;
    scope_value: string | null;
    status: string;
    version_number: number;
    updated_at: string;
  }> = [];

  try {
    const pool = await getSqlPool();
    const req = pool.request();
    let whereClause = "";

    if (["draft", "published", "archived"].includes(params.status ?? "")) {
      req.input("status", sql.NVarChar(20), params.status!);
      whereClause = "WHERE Status = @status";
    }

    const res = await req.query(`
      SELECT 
        Id AS id, 
        Slug AS slug, 
        Name AS name, 
        Description AS description, 
        ScopeType AS scope_type, 
        ScopeValue AS scope_value, 
        Status AS status, 
        VersionNumber AS version_number, 
        CONVERT(NVARCHAR(30), UpdatedAt, 126) AS updated_at
      FROM app.Templates
      ${whereClause}
      ORDER BY UpdatedAt DESC
    `);

    templates = res.recordset.map((t) => ({
      ...t,
      id: String(t.id),
      version_number: Number(t.version_number) || 1,
    }));
  } catch (sqlErr) {
    console.error("SQL Server templates error:", sqlErr);
  }

  return (
    <div className="stack" style={{ gap: "2rem" }}>
      <div className="card stack" style={{ gap: "1.25rem" }}>
        <div className="flex-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span className="badge badge-primary">Thiết Kế Lộ Trình</span>
              <span className="badge badge-accent">Template Builder</span>
            </div>
            <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Xây Dựng Khung Lộ Trình Onboarding</h1>
            <p className="muted" style={{ margin: "0.25rem 0 0 0" }}>
              Tổ chức nội dung tài liệu thành các giai đoạn và nhiệm vụ theo thứ tự đào tạo.
            </p>
          </div>
          <Link href="/admin/content" className="btn btn-secondary">
            📚 Quản lý Thư Viện Nội Dung
          </Link>
        </div>

        {params.archived && (
          <div className="notice" role="status">
            Đã lưu trữ template thành công.
          </div>
        )}
        {params.error && (
          <div className="notice notice-danger" role="alert">
            ⚠️ Không lưu được thay đổi. Hãy kiểm tra dữ liệu rồi thử lại.
          </div>
        )}

        <form className="portal-links" method="get" style={{ borderTop: "1px solid var(--color-border-subtle)", paddingTop: "1rem" }}>
          <label className="field" style={{ minWidth: "180px", maxWidth: "240px", marginBottom: 0 }}>
            <span>Lọc theo trạng thái</span>
            <select defaultValue={params.status ?? ""} name="status" className="form-select">
              <option value="">Tất cả trạng thái</option>
              <option value="draft">Bản nháp (Draft)</option>
              <option value="published">Đã xuất bản (Published)</option>
              <option value="archived">Đã lưu trữ (Archived)</option>
            </select>
          </label>
          <button type="submit" className="btn btn-secondary" style={{ minHeight: "42px" }}>
            Lọc kết quả
          </button>
        </form>
      </div>

      <div className="card stack" style={{ gap: "1.25rem" }}>
        <h2 style={{ fontSize: "1.3rem", color: "var(--color-primary)", margin: 0 }}>
          ➕ Tạo Template Mới (Bản Nháp)
        </h2>
        <form action={createTemplateDraft} className="form-grid">
          <label className="field">
            <span>Mã định danh (Slug) <span style={{ color: "var(--color-primary)" }}>*</span></span>
            <input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" required placeholder="vi-du: onboarding-logistics" />
          </label>
          <label className="field">
            <span>Tên template lộ trình <span style={{ color: "var(--color-primary)" }}>*</span></span>
            <input maxLength={160} name="name" required placeholder="Ví dụ: Lộ Trình Tiếp Nhận Nhân Viên Mới 2026" />
          </label>
          <label className="field">
            <span>Phạm vi đối tượng áp dụng <span style={{ color: "var(--color-primary)" }}>*</span></span>
            <select defaultValue="company" name="scope_type" className="form-select">
              <option value="company">Toàn công ty</option>
              <option value="office">Theo văn phòng</option>
              <option value="department">Theo phòng ban</option>
              <option value="position">Theo chức danh</option>
              <option value="group">Theo nhóm</option>
              <option value="employee">Cá nhân nhân viên</option>
            </select>
          </label>
          <label className="field">
            <span>Giá trị phạm vi (để trống nếu toàn công ty)</span>
            <input maxLength={160} name="scope_value" placeholder="Ví dụ: Logistics Operations" />
          </label>
          <label className="field form-wide">
            <span>Mô tả mục tiêu của lộ trình</span>
            <textarea maxLength={2000} name="description" rows={3} placeholder="Mô tả tóm tắt nội dung và mục tiêu hoàn thành của nhân sự..." />
          </label>
          <div className="form-wide" style={{ marginTop: "0.5rem" }}>
            <button className="btn btn-primary" type="submit">
              + Tạo Bản Nháp Lộ Trình
            </button>
          </div>
        </form>
      </div>

      {(templates ?? []).length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p className="muted">Chưa có template nào phù hợp với bộ lọc hiện tại.</p>
        </div>
      ) : (
        <div className="stack" style={{ gap: "1rem" }}>
          {(templates ?? []).map((template) => (
            <article className="card stack" key={template.id} style={{ gap: "0.75rem" }}>
              <div className="flex-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <span className={`badge ${template.status === "published" ? "badge-success" : template.status === "draft" ? "badge-primary" : "badge-locked"}`}>
                      {template.status === "published" ? "✓ Đã xuất bản" : template.status === "draft" ? "Bản nháp" : "Lưu trữ"}
                    </span>
                    <span className="badge badge-accent">Phiên bản {template.version_number}</span>
                  </div>
                  <h3 style={{ fontSize: "1.25rem", margin: 0 }}>
                    <Link href={`/admin/templates/${template.id}`} style={{ color: "var(--color-text-main)", textDecoration: "none" }}>
                      {template.name}
                    </Link>
                  </h3>
                  <p className="muted" style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                    Slug: <code>{template.slug}</code> · Phạm vi:{" "}
                    <strong>{template.scope_type === "company" ? "Toàn công ty" : `${template.scope_type}: ${template.scope_value}`}</strong>
                  </p>
                </div>
                <Link href={`/admin/templates/${template.id}`} className="btn btn-secondary">
                  Chi tiết lộ trình ➔
                </Link>
              </div>
              {template.description && (
                <p style={{ fontSize: "0.92rem", color: "var(--color-text-muted)", margin: 0, lineHeight: 1.5 }}>
                  {template.description}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
