import Link from "next/link";
import {
  createContentDraft,
  publishContentVersion,
} from "@/features/content-library/actions";
import { ArchiveContentButton } from "@/features/content-library/archive-button";
import { requireRole } from "@/features/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return <p className="notice">Cần cấu hình Supabase để tải thư viện.</p>;
  }

  let contentsQuery = supabase
    .from("contents")
    .select(
      "id, slug, title, description, category, content_type, scope_type, scope_value, status, current_version, created_at",
    )
    .order("created_at", { ascending: false });
  if (params.q) {
    contentsQuery = contentsQuery.ilike("title", "%" + params.q + "%");
  }
  if (
    params.status &&
    ["draft", "published", "archived"].includes(params.status)
  ) {
    contentsQuery = contentsQuery.eq("status", params.status);
  }
  if (
    params.type &&
    ["text", "image", "video", "file_link", "task", "quiz_form"].includes(
      params.type,
    )
  ) {
    contentsQuery = contentsQuery.eq("content_type", params.type);
  }

  const { data: contents, error } = await contentsQuery;
  if (error) {
    throw new Error("Không tải được Content Library.");
  }

  const ids = (contents ?? []).map((content) => content.id);
  const { data: versions, error: versionsError } = ids.length
    ? await supabase
        .from("content_versions")
        .select(
          "content_id, version_number, body, version_status, change_note, published_at",
        )
        .in("content_id", ids)
        .order("version_number", { ascending: false })
    : { data: [], error: null };
  if (versionsError) {
    throw new Error("Không tải được lịch sử phiên bản nội dung.");
  }

  const usageQuery = ids.length
    ? await supabase
        .from("template_items")
        .select("content_id")
        .in("content_id", ids)
    : null;
  const privateConfigQuery = ids.length
    ? await supabase
        .from("content_private_configs")
        .select("content_id, version_number, answer_config")
        .in("content_id", ids)
    : null;
  if (privateConfigQuery?.error) {
    throw new Error("Không tải được cấu hình nội dung bảo mật.");
  }
  const versionList = versions ?? [];
  const usageList = usageQuery?.data ?? [];
  const privateConfigs = privateConfigQuery?.data ?? [];

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
