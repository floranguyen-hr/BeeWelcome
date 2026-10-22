import Link from "next/link";
import { createTemplateDraft } from "@/features/template-builder/actions";
import { requireRole } from "@/features/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SearchParams = { status?: string; error?: string; archived?: string };

export async function TemplateListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole("hr_admin");
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return <p className="notice">Cần cấu hình Supabase để tải template.</p>;
  }

  let query = supabase
    .from("templates")
    .select(
      "id, slug, name, description, scope_type, scope_value, status, version_number, updated_at",
    )
    .order("updated_at", { ascending: false });
  if (["draft", "published", "archived"].includes(params.status ?? "")) {
    query = query.eq("status", params.status!);
  }
  const { data: templates, error } = await query;
  if (error) {
    throw new Error("Không tải được danh sách template.");
  }

  return (
    <section className="stack">
      <div className="card stack">
        <div className="portal-header">
          <div>
            <h2>Template Builder</h2>
            <p className="muted">
              Gom nội dung đã xuất bản thành các milestone và hoạt động có thứ tự.
            </p>
          </div>
          <Link href="/admin/content">Quản lý Content Library</Link>
        </div>
        {params.archived && <p role="status">Đã lưu trữ template.</p>}
        {params.error && (
          <p className="error-text" role="alert">
            Không lưu được thay đổi. Hãy kiểm tra dữ liệu rồi thử lại.
          </p>
        )}
        <form className="portal-links" method="get">
          <label className="field">
            <span>Trạng thái</span>
            <select defaultValue={params.status ?? ""} name="status">
              <option value="">Tất cả</option>
              <option value="draft">Nháp</option>
              <option value="published">Đã xuất bản</option>
              <option value="archived">Đã lưu trữ</option>
            </select>
          </label>
          <button type="submit">Lọc</button>
        </form>
      </div>

      <div className="card stack">
        <h3>Tạo template nháp</h3>
        <form action={createTemplateDraft} className="form-grid">
          <label className="field">
            <span>Slug</span>
            <input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" required />
          </label>
          <label className="field">
            <span>Tên template</span>
            <input maxLength={160} name="name" required />
          </label>
          <label className="field">
            <span>Phạm vi nhân viên</span>
            <select defaultValue="company" name="scope_type">
              <option value="company">Toàn công ty</option>
              <option value="office">Văn phòng</option>
              <option value="department">Phòng ban</option>
              <option value="position">Chức danh</option>
              <option value="group">Nhóm</option>
              <option value="employee">Nhân viên</option>
            </select>
          </label>
          <label className="field">
            <span>Giá trị phạm vi (để trống nếu toàn công ty)</span>
            <input maxLength={160} name="scope_value" />
          </label>
          <label className="field form-wide">
            <span>Mô tả</span>
            <textarea maxLength={2000} name="description" rows={3} />
          </label>
          <button className="form-wide" type="submit">
            Tạo bản nháp
          </button>
        </form>
      </div>

      {(templates ?? []).length === 0 ? (
        <div className="card"><p>Chưa có template phù hợp bộ lọc.</p></div>
      ) : (
        (templates ?? []).map((template) => (
          <article className="card stack" key={template.id}>
            <div className="portal-header">
              <div>
                <h3><Link href={`/admin/templates/${template.id}`}>{template.name}</Link></h3>
                <p className="muted">
                  {template.slug} · {template.status} · v{template.version_number}
                  {" · "}
                  {template.scope_type === "company"
                    ? "Toàn công ty"
                    : `${template.scope_type}: ${template.scope_value}`}
                </p>
              </div>
              <Link href={`/admin/templates/${template.id}`}>Mở template</Link>
            </div>
            {template.description && <p>{template.description}</p>}
          </article>
        ))
      )}
    </section>
  );
}
