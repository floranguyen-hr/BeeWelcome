import Link from "next/link";
import {
  createContentDraft,
  publishContentVersion,
} from "@/features/content-library/actions";
import { ArchiveContentButton } from "@/features/content-library/archive-button";
import { requireRole } from "@/features/auth/session";
import { getSqlPool, sql } from "@/lib/db/sqlserver";

type SearchParams = {
  q?: string;
  status?: string;
  type?: string;
  error?: string;
  created?: string;
  published?: string;
  archived?: string;
};

function bodyText(
  body: unknown,
  contentType: string,
  answerConfig?: Record<string, unknown>,
) {
  if (!body || typeof body !== "object") {
    return "";
  }
  const record = body as Record<string, unknown>;
  if (
    contentType === "quiz_form" &&
    (record.kind === "quiz" || record.kind === "form")
  ) {
    return JSON.stringify({ ...record, ...answerConfig }, null, 2);
  }
  const key = ["image", "video", "file_link"].includes(contentType)
    ? "url"
    : contentType === "task"
      ? "instructions"
      : contentType === "quiz_form"
        ? "prompt"
        : "text";
  return typeof record[key] === "string" ? record[key] : "";
}

export async function ContentLibraryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole("hr_admin");
  const params = await searchParams;

  let contents: Array<any> = [];
  let versionList: Array<any> = [];
  let usageList: Array<any> = [];
  let privateConfigs: Array<any> = [];

  try {
    const pool = await getSqlPool();
    const req = pool.request();
    let whereClauses: string[] = [];

    if (params.q) {
      req.input("keyword", sql.NVarChar(100), `%${params.q.trim()}%`);
      whereClauses.push("Title LIKE @keyword");
    }
    if (params.status && ["draft", "published", "archived"].includes(params.status)) {
      req.input("status", sql.NVarChar(20), params.status);
      whereClauses.push("Status = @status");
    }
    if (params.type && ["text", "image", "video", "file_link", "task", "quiz_form"].includes(params.type)) {
      req.input("contentType", sql.NVarChar(30), params.type);
      whereClauses.push("ContentType = @contentType");
    }

    const whereSql = whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";

    const [cRes, vRes, uRes, pRes] = await Promise.all([
      req.query(`
        SELECT 
          Id AS id, 
          Slug AS slug, 
          Title AS title, 
          Description AS description, 
          Category AS category, 
          ContentType AS content_type, 
          ScopeType AS scope_type, 
          ScopeValue AS scope_value, 
          Status AS status, 
          CurrentVersion AS current_version, 
          CONVERT(NVARCHAR(30), CreatedAt, 126) AS created_at
        FROM app.Contents
        ${whereSql}
        ORDER BY CreatedAt DESC
      `),
      pool.request().query(`
        SELECT 
          ContentId AS content_id, 
          VersionNumber AS version_number, 
          Body AS body_raw, 
          VersionStatus AS version_status, 
          ChangeNote AS change_note, 
          CONVERT(NVARCHAR(30), PublishedAt, 126) AS published_at
        FROM app.ContentVersions
        ORDER BY VersionNumber DESC
      `),
      pool.request().query(`
        SELECT DISTINCT ContentId AS content_id FROM app.TemplateItems
      `),
      pool.request().query(`
        SELECT 
          ContentId AS content_id, 
          VersionNumber AS version_number, 
          AnswerConfig AS answer_config_raw
        FROM app.ContentPrivateConfigs
      `),
    ]);

    contents = cRes.recordset.map((c) => ({ ...c, id: String(c.id) }));
    versionList = vRes.recordset.map((v) => ({
      content_id: String(v.content_id),
      version_number: v.version_number,
      version_status: v.version_status,
      change_note: v.change_note,
      published_at: v.published_at,
      body: (() => {
        try {
          return typeof v.body_raw === "string" ? JSON.parse(v.body_raw) : v.body_raw || {};
        } catch {
          return {};
        }
      })(),
    }));
    usageList = uRes.recordset.map((u) => ({ content_id: String(u.content_id) }));
    privateConfigs = pRes.recordset.map((p) => ({
      content_id: String(p.content_id),
      version_number: p.version_number,
      answer_config: (() => {
        try {
          return typeof p.answer_config_raw === "string" ? JSON.parse(p.answer_config_raw) : p.answer_config_raw || {};
        } catch {
          return {};
        }
      })(),
    }));
  } catch (sqlErr) {
    console.error("SQL Server ContentLibrary error:", sqlErr);
  }

  return (
    <section className="stack">
      <div className="card stack">
        <div className="portal-header">
          <div>
            <h2>Content Library</h2>
            <p className="muted">
              Nội dung dùng chung được lưu một lần và liên kết từ template.
            </p>
          </div>
          <Link href="/admin/templates">Mở Template Builder</Link>
        </div>
        {params.created && <p role="status">Đã lưu bản nháp.</p>}
        {params.published && <p role="status">Đã xuất bản phiên bản mới.</p>}
        {params.archived && <p role="status">Đã lưu trữ nội dung.</p>}
        {params.error && (
          <p className="error-text" role="alert">
            Không lưu được thay đổi. Hãy kiểm tra dữ liệu và thử lại.
          </p>
        )}
        <form className="portal-links" method="get">
          <label className="field">
            <span>Tìm theo tiêu đề</span>
            <input defaultValue={params.q} name="q" />
          </label>
          <label className="field">
            <span>Trạng thái</span>
            <select defaultValue={params.status ?? ""} name="status">
              <option value="">Tất cả</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="field">
            <span>Loại</span>
            <select defaultValue={params.type ?? ""} name="type">
              <option value="">Tất cả</option>
              <option value="text">Text</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="file_link">File / link</option>
              <option value="task">Task</option>
              <option value="quiz_form">Quiz / form</option>
            </select>
          </label>
          <button type="submit">Lọc</button>
        </form>
      </div>

      <div className="card stack">
        <h3>Tạo nội dung nháp</h3>
        <form action={createContentDraft} className="form-grid">
          <label className="field">
            <span>Slug</span>
            <input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" required />
          </label>
          <label className="field">
            <span>Tiêu đề</span>
            <input maxLength={200} name="title" required />
          </label>
          <label className="field">
            <span>Loại</span>
            <select name="content_type">
              <option value="text">Text</option>
              <option value="image">Image URL</option>
              <option value="video">Video URL</option>
              <option value="file_link">File / external link</option>
              <option value="task">Task</option>
              <option value="quiz_form">Quiz / form</option>
            </select>
          </label>
          <label className="field">
            <span>Category</span>
            <input defaultValue="general" name="category" required />
          </label>
          <label className="field">
            <span>Audience scope</span>
            <select name="scope_type">
              <option value="company">Company</option>
              <option value="office">Office</option>
              <option value="department">Department</option>
              <option value="position">Position</option>
              <option value="group">Group</option>
              <option value="employee">Employee ID</option>
            </select>
          </label>
          <label className="field">
            <span>Audience value (blank for company)</span>
            <input name="scope_value" />
          </label>
          <label className="field form-wide">
            <span>Description</span>
            <input maxLength={2000} name="description" />
          </label>
          <label className="field form-wide">
            <span>Text, task instructions, URL, quiz prompt, or quiz/form JSON configuration</span>
            <textarea maxLength={20000} name="body_text" required rows={4} />
          </label>
          <button className="form-wide" type="submit">
            Lưu bản nháp
          </button>
        </form>
      </div>

      {(contents ?? []).length === 0 && (
        <div className="card">
          <p>Chưa có nội dung phù hợp bộ lọc.</p>
        </div>
      )}

      {(contents ?? []).map((content) => {
        const currentVersion = versionList.find(
          (version) =>
            version.content_id === content.id &&
            version.version_number === content.current_version,
        );
        const history = versionList.filter(
          (version) => version.content_id === content.id,
        );
        const useCount = usageList.filter(
          (usage) => usage.content_id === content.id,
        ).length;
        const answerConfig = privateConfigs.find(
          (config) =>
            config.content_id === content.id &&
            config.version_number === content.current_version,
        )?.answer_config;
        const body = bodyText(
          currentVersion?.body,
          content.content_type,
          answerConfig as Record<string, unknown> | undefined,
        );
        const scope =
          content.scope_type === "company"
            ? "Company"
            : content.scope_type + ": " + content.scope_value;

        return (
          <article className="card stack" key={content.id}>
            <div className="portal-header">
              <div>
                <h3>{content.title}</h3>
                <p className="muted">
                  {content.content_type} · {scope} · {content.status} · Version{" "}
                  {content.current_version} · Used in {useCount} template item(s)
                </p>
              </div>
              {content.status === "archived" ? (
                <span>Archived</span>
              ) : (
                <ArchiveContentButton contentId={content.id} />
              )}
            </div>
            {content.description && <p>{content.description}</p>}
            <details>
              <summary>Lịch sử phiên bản ({history.length})</summary>
              <ul>
                {history.map((version) => (
                  <li key={version.version_number}>
                    v{version.version_number} · {version.version_status}
                    {version.change_note ? " · " + version.change_note : ""}
                  </li>
                ))}
              </ul>
            </details>
            {content.status !== "archived" && (
              <form action={publishContentVersion} className="form-grid">
                <input name="id" type="hidden" value={content.id} />
                <input name="slug" type="hidden" value={content.slug} />
                <input
                  name="category"
                  type="hidden"
                  value={content.category}
                />
                <input
                  name="scope_type"
                  type="hidden"
                  value={content.scope_type}
                />
                <input
                  name="scope_value"
                  type="hidden"
                  value={content.scope_value ?? ""}
                />
                <label className="field">
                  <span>Edit title</span>
                  <input
                    defaultValue={content.title}
                    maxLength={200}
                    name="title"
                    required
                  />
                </label>
                <label className="field">
                  <span>Type</span>
                  <select
                    defaultValue={content.content_type}
                    name="content_type"
                  >
                    <option value="text">Text</option>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                    <option value="file_link">File / link</option>
                    <option value="task">Task</option>
                    <option value="quiz_form">Quiz / form</option>
                  </select>
                </label>
                <label className="field form-wide">
                  <span>Edit description</span>
                  <input
                    defaultValue={content.description}
                    name="description"
                  />
                </label>
                <label className="field form-wide">
                  <span>Content body</span>
                  <textarea
                    defaultValue={body}
                    maxLength={20000}
                    name="body_text"
                    required
                    rows={4}
                  />
                </label>
                <label className="field form-wide">
                  <span>Change note</span>
                  <input
                    name="change_note"
                    required
                    placeholder="Mô tả thay đổi phiên bản"
                  />
                </label>
                <button className="form-wide" type="submit">
                  {content.status === "draft"
                    ? "Xuất bản nội dung"
                    : "Lưu và xuất bản phiên bản mới"}
                </button>
              </form>
            )}
          </article>
        );
      })}
    </section>
  );
}
