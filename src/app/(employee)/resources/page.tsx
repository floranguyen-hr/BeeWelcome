import Link from "next/link";
import { requireRole } from "@/features/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return <p className="notice">Cần cấu hình Supabase để tải thư viện tài nguyên.</p>;
  }

  let query = supabase
    .from("contents")
    .select("id, slug, title, description, category, content_type, current_version")
    .eq("status", "published")
    .order("title");
  const keyword = params.q?.trim().slice(0, 100);
  if (keyword) query = query.ilike("title", `%${keyword}%`);
  if (params.category) query = query.eq("category", params.category.slice(0, 80));
  if (params.type && ["text", "image", "video", "file_link", "task", "quiz_form"].includes(params.type)) {
    query = query.eq("content_type", params.type);
  }

  const { data: contents, error } = await query;
  if (error) throw new Error("Không tải được thư viện tài nguyên.");
  const ids = (contents ?? []).map((content) => content.id);
  const versionQuery = ids.length
    ? await supabase
        .from("content_versions")
        .select("content_id, version_number, body")
        .in("content_id", ids)
        .eq("version_status", "published")
    : null;
  if (versionQuery?.error) throw new Error("Không tải được nội dung tài nguyên.");
  const versions = versionQuery?.data ?? [];
  const categories = [...new Set((contents ?? []).map((content) => content.category))];

  return (
    <section className="stack">
      <div className="card stack">
        <div className="portal-header">
          <div>
            <h2>My Resources</h2>
            <p className="muted">Chỉ hiển thị nội dung đã xuất bản và được phép xem. Mở tài nguyên không tự hoàn thành hoạt động.</p>
          </div>
          <Link href="/roadmap">Quay lại Roadmap</Link>
        </div>
        <form className="form-grid" method="get">
          <label className="field">
            <span>Tìm theo tiêu đề</span>
            <input defaultValue={keyword} maxLength={100} name="q" />
          </label>
          <label className="field">
            <span>Danh mục</span>
            <select defaultValue={params.category ?? ""} name="category">
              <option value="">Tất cả</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Loại nội dung</span>
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

      {(contents ?? []).length === 0 ? (
        <div className="card"><p>Chưa có tài nguyên phù hợp bộ lọc.</p></div>
      ) : (contents ?? []).map((content) => {
        const version = versions.find(
          (candidate) => candidate.content_id === content.id && candidate.version_number === content.current_version,
        );
        const body = safeBody(version?.body);
        const text = bodySummary(body, content.content_type);
        const url = typeof body.url === "string" && /^https?:\/\//i.test(body.url) ? body.url : null;
        const options = Array.isArray(body.options) ? body.options : [];
        return (
          <article className="card stack" key={content.id}>
            <div>
              <h3>{content.title}</h3>
              <p className="muted">{content.category} · {content.content_type}</p>
            </div>
            {content.description && <p>{content.description}</p>}
            {url ? <p><a href={url} rel="noreferrer" target="_blank">Mở tài nguyên</a></p> : text && <div className="snapshot-content"><p>{text}</p></div>}
            {content.content_type === "quiz_form" && options.length > 0 && (
              <ul>{options.map((option, index) => <li key={index}>{String(option)}</li>)}</ul>
            )}
          </article>
        );
      })}
    </section>
  );
}
