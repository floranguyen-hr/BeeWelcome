import Link from "next/link";
import { requireRole } from "@/features/auth/session";
import { getSqlPool, sql } from "@/lib/db/sqlserver";

type SearchParams = { q?: string; category?: string; type?: string };

function safeBody(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
}

function bodySummary(body: Record<string, unknown>, contentType: string) {
  const key = contentType === "task" ? "instructions" : contentType === "quiz_form" ? "prompt" : "text";
  return typeof body[key] === "string" ? body[key] : "";
}

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole("employee");
  const params = await searchParams;
  const pool = await getSqlPool();

  const req = pool.request();
  let whereClause = "WHERE Status = N'published'";

  const keyword = params.q?.trim().slice(0, 100);
  if (keyword) {
    req.input("keyword", sql.NVarChar(100), `%${keyword}%`);
    whereClause += " AND Title LIKE @keyword";
  }

  if (params.category) {
    req.input("category", sql.NVarChar(80), params.category.slice(0, 80));
    whereClause += " AND Category = @category";
  }

  if (params.type && ["text", "image", "video", "file_link", "task", "quiz_form"].includes(params.type)) {
    req.input("contentType", sql.NVarChar(30), params.type);
    whereClause += " AND ContentType = @contentType";
  }

  const [contentsRes, versionsRes] = await Promise.all([
    req.query(`
      SELECT 
        Id AS id, 
        Slug AS slug, 
        Title AS title, 
        Description AS description, 
        Category AS category, 
        ContentType AS content_type, 
        CurrentVersion AS current_version
      FROM app.Contents
      ${whereClause}
      ORDER BY Title ASC
    `),
    pool.request().query(`
      SELECT 
        ContentId AS content_id, 
        VersionNumber AS version_number, 
        Body AS body_raw
      FROM app.ContentVersions
      WHERE VersionStatus = N'published'
    `),
  ]);

  const contents = contentsRes.recordset.map((c) => ({
    ...c,
    id: String(c.id),
  }));

  const versions = versionsRes.recordset.map((v) => ({
    content_id: String(v.content_id),
    version_number: v.version_number,
    body: (() => {
      try {
        return typeof v.body_raw === "string" ? JSON.parse(v.body_raw) : v.body_raw || {};
      } catch {
        return {};
      }
    })(),
  }));

  const categories = [...new Set(contents.map((content) => content.category))];

  return (
    <div className="stack" style={{ gap: "1.75rem" }}>
      {/* Header & Filter Card */}
      <header className="card stack" style={{ gap: "1.25rem" }}>
        <div className="flex-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span className="badge badge-primary">Kho Tài Liệu Đào Tạo</span>
              <span className="badge badge-accent">Xuất Bản</span>
            </div>
            <h2 style={{ fontSize: "1.5rem" }}>Thư Viện Tài Nguyên</h2>
            <p className="muted" style={{ fontSize: "0.875rem" }}>
              Tài liệu hướng dẫn, quy chuẩn nghiệp vụ và kiến thức logistics dành riêng cho bạn.
            </p>
          </div>

          <Link href="/roadmap" className="btn btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
            ← Quay lại Roadmap
          </Link>
        </div>

        {/* Form Lọc Thông Minh */}
        <form
          method="get"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr)) auto",
            gap: "0.75rem",
            alignItems: "flex-end",
            paddingTop: "0.75rem",
            borderTop: "1px solid var(--color-border-subtle)",
          }}
        >
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="filter-q">Tìm kiếm từ khóa</label>
            <input
              id="filter-q"
              defaultValue={keyword}
              maxLength={100}
              name="q"
              placeholder="Nhập tên tài liệu..."
              className="form-input"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="filter-category">Danh mục</label>
            <select id="filter-category" defaultValue={params.category ?? ""} name="category" className="form-select">
              <option value="">Tất cả danh mục</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="filter-type">Định dạng</label>
            <select id="filter-type" defaultValue={params.type ?? ""} name="type" className="form-select">
              <option value="">Tất cả định dạng</option>
              <option value="text">Văn bản (Text)</option>
              <option value="image">Hình ảnh (Image)</option>
              <option value="video">Video đào tạo</option>
              <option value="file_link">Tài liệu đính kèm (File / Link)</option>
              <option value="task">Checklist nhiệm vụ</option>
              <option value="quiz_form">Khảo sát / Quiz</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" style={{ minHeight: "44px", padding: "0 1.25rem" }}>
            Tìm Kiếm
          </button>
        </form>
      </header>

      {/* Grid Danh Sách Tài Nguyên */}
      {(contents ?? []).length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔍</div>
          <h3>Không Tìm Thấy Tài Nguyên</h3>
          <p className="muted">Không có tài liệu nào phù hợp với bộ lọc hiện tại của bạn.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
          {(contents ?? []).map((content) => {
            const version = versions.find(
              (candidate) => candidate.content_id === content.id && candidate.version_number === content.current_version,
            );
            const body = safeBody(version?.body);
            const text = bodySummary(body, content.content_type);
            const url = typeof body.url === "string" && /^https?:\/\//i.test(body.url) ? body.url : null;

            return (
              <article key={content.id} className="card card-interactive stack" style={{ justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <h3 style={{ fontSize: "1.1rem" }}>{content.title}</h3>
                    <span className="badge badge-primary">{content.content_type}</span>
                  </div>

                  <span className="badge badge-accent" style={{ marginBottom: "0.75rem" }}>
                    Chuyên mục: {content.category}
                  </span>

                  {content.description && (
                    <p className="muted" style={{ fontSize: "0.875rem", marginBottom: "0.75rem" }}>
                      {content.description}
                    </p>
                  )}

                  {text && (
                    <div
                      style={{
                        backgroundColor: "var(--color-bg-canvas)",
                        padding: "0.75rem",
                        borderRadius: "var(--radius-md)",
                        fontSize: "0.85rem",
                        color: "var(--color-text-main)",
                        borderLeft: "3px solid var(--color-primary)",
                        maxHeight: "120px",
                        overflowY: "auto",
                      }}
                    >
                      {text}
                    </div>
                  )}
                </div>

                {url && (
                  <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px dashed var(--color-border)" }}>
                    <a
                      href={url}
                      rel="noreferrer"
                      target="_blank"
                      className="btn btn-secondary"
                      style={{ width: "100%", padding: "0.5rem", fontSize: "0.85rem" }}
                    >
                      Mở liên kết tài liệu ↗
                    </a>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
