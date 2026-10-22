import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addTemplateItem,
  addTemplateMilestone,
  applyTemplateUpdate,
  moveTemplateItem,
  moveTemplateMilestone,
  publishTemplate,
  removeTemplateItem,
  removeTemplateMilestone,
  reopenTemplateDraft,
  updateTemplateDraft,
  updateTemplateItem,
  updateTemplateMilestone,
} from "@/features/template-builder/actions";
import { ArchiveTemplateButton } from "@/features/template-builder/archive-template-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SearchParams = {
  error?: string;
  saved?: string;
  published?: string;
  draft?: string;
  removed?: string;
  milestone?: string;
  item?: string;
  applied?: string;
};

type JourneyUpdatePreview = {
  journey_id: string;
  employee_id: string;
  employee_name: string;
  from_version: number;
  to_version: number;
  added_count: number;
  updated_count: number;
  removed_count: number;
  preserved_count: number;
  eligible: boolean;
  reason: string | null;
};

const completionRules = [
  ["manual_self_confirmation", "Nhân viên tự xác nhận"],
  ["form_submission", "Nộp biểu mẫu"],
  ["quiz_participation", "Tham gia quiz"],
  ["quiz_pass_required", "Đạt quiz"],
  ["content_acknowledgement", "Xác nhận đã đọc"],
  ["admin_completion", "HR Admin xác nhận"],
] as const;

export async function TemplateDetailPage({
  templateId,
  searchParams,
}: {
  templateId: string;
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return <p className="notice">Cần cấu hình Supabase để tải template.</p>;
  }

  const { data: template, error: templateError } = await supabase
    .from("templates")
    .select("*")
    .eq("id", templateId)
    .maybeSingle();
  if (templateError) throw new Error("Không tải được template.");
  if (!template) notFound();

  const previewQuery = template.status === "published"
    ? await supabase.rpc("preview_template_journey_updates", {
        p_template_id: template.id,
      })
    : { data: [], error: null };
  if (previewQuery.error) {
    throw new Error("Không tải được bản xem trước thay đổi template.");
  }
  const updatePreviews = (previewQuery.data ?? []) as JourneyUpdatePreview[];

  const { data: milestones, error: milestoneError } = await supabase
    .from("milestones")
    .select("id, name, sequence, available_offset_days, is_active")
    .eq("template_id", templateId)
    .order("sequence");
  if (milestoneError) throw new Error("Không tải được milestone.");

  const milestoneIds = (milestones ?? []).map((milestone) => milestone.id);
  const { data: items, error: itemError } = milestoneIds.length
    ? await supabase
        .from("template_items")
        .select(
          "id, milestone_id, content_id, sequence, is_required, available_offset_days, due_offset_days, completion_rule, include_in_progress, is_active",
        )
        .in("milestone_id", milestoneIds)
        .order("sequence")
    : { data: [], error: null };
  if (itemError) throw new Error("Không tải được hoạt động trong template.");

  const { data: contentRows, error: contentError } = await supabase
    .from("contents")
    .select("id, title, content_type, status")
    .order("title");
  if (contentError) throw new Error("Không tải được danh mục nội dung.");
  const publishedContents = (contentRows ?? []).filter(
    (content) => content.status === "published",
  );
  const itemList = items ?? [];
  const milestoneList = milestones ?? [];
  const editable = template.status === "draft";

  return (
    <section className="stack">
      <div className="card stack">
        <div className="portal-header">
          <div>
            <p><Link href="/admin/templates">← Danh sách template</Link></p>
            <h2>{template.name}</h2>
            <p className="muted">
              {template.slug} · {template.status} · phiên bản {template.version_number}
            </p>
          </div>
          <Link href="/admin/content">Content Library</Link>
        </div>
        {params.saved && <p role="status">Đã lưu thay đổi.</p>}
        {params.published && <p role="status">Đã xuất bản phiên bản template.</p>}
        {params.draft && <p role="status">Đã mở lại bản nháp chỉnh sửa.</p>}
        {params.removed && <p role="status">Đã gỡ mục khỏi bản nháp.</p>}
        {params.milestone && <p role="status">Đã thêm milestone.</p>}
        {params.item && <p role="status">Đã thêm hoạt động.</p>}
        {params.applied && <p role="status">Đã áp dụng phiên bản mới cho hành trình đã chọn.</p>}
        {params.error && (
          <p className="error-text" role="alert">
            Không lưu được thay đổi. Kiểm tra phạm vi, trạng thái và nội dung đã xuất bản.
          </p>
        )}
        {template.status === "published" && (
          <p className="notice">
            Bản đã xuất bản áp dụng cho phân công mới. Các hành trình hiện tại giữ nguyên cho đến khi HR xem trước và áp dụng phiên bản mới cho từng nhân viên.
          </p>
        )}
        <div className="portal-links">
          {editable ? (
            <>
              <form action={publishTemplate}>
                <input name="id" type="hidden" value={template.id} />
                <button type="submit">Xuất bản template</button>
              </form>
              <ArchiveTemplateButton templateId={template.id} />
            </>
          ) : template.status === "published" ? (
            <form action={reopenTemplateDraft}>
              <input name="id" type="hidden" value={template.id} />
              <button type="submit">Mở bản nháp để chỉnh sửa</button>
            </form>
          ) : null}
        </div>
      </div>

      {template.status === "published" && (
        <section className="card stack">
          <h3>Xem trước thay đổi cho hành trình đang chạy</h3>
          <p className="muted">
            Hoàn thành và miễn trừ được giữ nguyên cùng bản chụp cũ. Hoạt động chưa hoàn thành sẽ nhận nội dung, quy tắc và lịch mới; hoạt động đã gỡ sẽ được đánh dấu. Mỗi lần áp dụng chỉ ảnh hưởng một nhân viên.
          </p>
          {updatePreviews.length === 0 ? (
            <p>Không có hành trình đang hoạt động ở phiên bản cũ của template này.</p>
          ) : updatePreviews.map((preview) => (
            <article className="inset-card stack" key={preview.journey_id}>
              <div className="portal-header">
                <div>
                  <h4>{preview.employee_name}</h4>
                  <p className="muted">Phiên bản {preview.from_version} → {preview.to_version}</p>
                </div>
                <strong>{preview.eligible ? "Sẵn sàng áp dụng" : "Không thể áp dụng"}</strong>
              </div>
              <p>
                Thêm {preview.added_count} · cập nhật {preview.updated_count} · gỡ {preview.removed_count} · giữ nguyên đã hoàn thành/miễn trừ {preview.preserved_count}
              </p>
              {!preview.eligible && <p className="error-text" role="alert">{preview.reason ?? "Template hiện không hợp lệ cho nhân viên này."}</p>}
              <form action={applyTemplateUpdate}>
                <input name="template_id" type="hidden" value={template.id} />
                <input name="journey_id" type="hidden" value={preview.journey_id} />
                <input name="expected_to_version" type="hidden" value={preview.to_version} />
                <button disabled={!preview.eligible} type="submit">Áp dụng cho {preview.employee_name}</button>
              </form>
            </article>
          ))}
        </section>
      )}

      {editable && (
        <div className="card stack">
          <h3>Thông tin template</h3>
          <form action={updateTemplateDraft} className="form-grid">
            <input name="id" type="hidden" value={template.id} />
            <label className="field">
              <span>Slug</span>
              <input defaultValue={template.slug} name="slug" readOnly />
            </label>
            <label className="field">
              <span>Tên</span>
              <input defaultValue={template.name} maxLength={160} name="name" required />
            </label>
            <label className="field">
              <span>Phạm vi nhân viên</span>
              <select defaultValue={template.scope_type} name="scope_type">
                <option value="company">Toàn công ty</option>
                <option value="office">Văn phòng</option>
                <option value="department">Phòng ban</option>
                <option value="position">Chức danh</option>
                <option value="group">Nhóm</option>
                <option value="employee">Nhân viên</option>
              </select>
            </label>
            <label className="field">
              <span>Giá trị phạm vi</span>
              <input defaultValue={template.scope_value ?? ""} maxLength={160} name="scope_value" />
            </label>
            <label className="field form-wide">
              <span>Mô tả</span>
              <textarea defaultValue={template.description} maxLength={2000} name="description" rows={3} />
            </label>
            <button className="form-wide" type="submit">Lưu thông tin</button>
          </form>
        </div>
      )}

      {editable && (
        <div className="card stack">
          <h3>Thêm milestone</h3>
          <form action={addTemplateMilestone} className="form-grid">
            <input name="template_id" type="hidden" value={template.id} />
            <input
              name="sequence"
              type="hidden"
              value={Math.max(-1, ...milestoneList.map((milestone) => milestone.sequence)) + 1}
            />
            <label className="field">
              <span>Tên milestone</span>
              <input maxLength={120} name="name" required />
            </label>
            <label className="field">
              <span>Mở sau ngày (tính từ ngày bắt đầu)</span>
              <input defaultValue="0" max="3650" min="0" name="available_offset_days" type="number" />
            </label>
            <button className="form-wide" type="submit">Thêm milestone</button>
          </form>
        </div>
      )}

      {milestoneList.length === 0 && (
        <div className="card"><p>Template chưa có milestone. Thêm ít nhất một hoạt động trước khi xuất bản.</p></div>
      )}

      {milestoneList.map((milestone) => {
        const milestoneItems = itemList.filter((item) => item.milestone_id === milestone.id);
        const activeItems = milestoneItems.filter((item) => item.is_active);
        const nextItemSequence = Math.max(-1, ...milestoneItems.map((item) => item.sequence)) + 1;
        return (
          <article className="card stack" key={milestone.id}>
            <div className="portal-header">
              <div>
                <h3>Milestone {milestone.sequence + 1}: {milestone.name}</h3>
                <p className="muted">
                  Mở sau ngày {milestone.available_offset_days} · {milestone.is_active ? "đang dùng" : "đã gỡ"}
                </p>
              </div>
              {editable && milestone.is_active && (
                <div className="portal-links">
                  <form action={moveTemplateMilestone}>
                    <input name="id" type="hidden" value={milestone.id} />
                    <input name="template_id" type="hidden" value={template.id} />
                    <input name="direction" type="hidden" value="up" />
                    <button aria-label="Chuyển milestone lên" type="submit">↑</button>
                  </form>
                  <form action={moveTemplateMilestone}>
                    <input name="id" type="hidden" value={milestone.id} />
                    <input name="template_id" type="hidden" value={template.id} />
                    <input name="direction" type="hidden" value="down" />
                    <button aria-label="Chuyển milestone xuống" type="submit">↓</button>
                  </form>
                  <form action={removeTemplateMilestone}>
                    <input name="id" type="hidden" value={milestone.id} />
                    <input name="template_id" type="hidden" value={template.id} />
                    <button type="submit">Gỡ milestone</button>
                  </form>
                </div>
              )}
            </div>

            {editable && milestone.is_active && (
              <form action={updateTemplateMilestone} className="form-grid">
                <input name="id" type="hidden" value={milestone.id} />
                <input name="template_id" type="hidden" value={template.id} />
                <label className="field">
                  <span>Tên milestone</span>
                  <input defaultValue={milestone.name} maxLength={120} name="name" required />
                </label>
                <label className="field">
                  <span>Mở sau ngày</span>
                  <input defaultValue={milestone.available_offset_days} max="3650" min="0" name="available_offset_days" type="number" />
                </label>
                <button className="form-wide" type="submit">Lưu milestone</button>
              </form>
            )}

            {milestoneItems.map((item) => {
              const content = publishedContents.find((row) => row.id === item.content_id);
              return (
                <div className="inset-card stack" key={item.id}>
                  <div className="portal-header">
                    <div>
                      <strong>{item.sequence + 1}. {content?.title ?? "Nội dung đã lưu trữ"}</strong>
                      <p className="muted">
                        {content?.content_type ?? "content"} · {item.is_active ? "đang dùng" : "đã gỡ"}
                      </p>
                    </div>
                    {editable && milestone.is_active && item.is_active && (
                      <div className="portal-links">
                        {(["up", "down"] as const).map((direction) => (
                          <form action={moveTemplateItem} key={direction}>
                            <input name="id" type="hidden" value={item.id} />
                            <input name="template_id" type="hidden" value={template.id} />
                            <input name="direction" type="hidden" value={direction} />
                            <button aria-label={direction === "up" ? "Chuyển hoạt động lên" : "Chuyển hoạt động xuống"} type="submit">
                              {direction === "up" ? "↑" : "↓"}
                            </button>
                          </form>
                        ))}
                        <form action={removeTemplateItem}>
                          <input name="id" type="hidden" value={item.id} />
                          <input name="template_id" type="hidden" value={template.id} />
                          <button type="submit">Gỡ hoạt động</button>
                        </form>
                      </div>
                    )}
                  </div>
                  {editable && milestone.is_active && item.is_active && (
                    <form action={updateTemplateItem} className="form-grid">
                      <input name="id" type="hidden" value={item.id} />
                      <input name="template_id" type="hidden" value={template.id} />
                      <label className="field">
                        <span>Hoàn thành theo</span>
                        <select defaultValue={item.completion_rule} name="completion_rule">
                          {completionRules.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </label>
                      <label className="field">
                        <span>Mở sau ngày</span>
                        <input defaultValue={item.available_offset_days} max="3650" min="0" name="available_offset_days" type="number" />
                      </label>
                      <label className="field">
                        <span>Hạn sau ngày (để trống nếu không có)</span>
                        <input defaultValue={item.due_offset_days ?? ""} max="3650" min="0" name="due_offset_days" type="number" />
                      </label>
                      <label className="check-field">
                        <input defaultChecked={item.is_required} name="is_required" type="checkbox" /> Bắt buộc
                      </label>
                      <label className="check-field">
                        <input defaultChecked={item.include_in_progress} name="include_in_progress" type="checkbox" /> Tính vào tiến độ
                      </label>
                      <button className="form-wide" type="submit">Lưu hoạt động</button>
                    </form>
                  )}
                </div>
              );
            })}

            {editable && milestone.is_active && (
              <details>
                <summary>Thêm hoạt động từ nội dung đã xuất bản</summary>
                {publishedContents.length === 0 ? (
                  <p>Hãy xuất bản nội dung trong Content Library trước.</p>
                ) : (
                  <form action={addTemplateItem} className="form-grid">
                    <input name="milestone_id" type="hidden" value={milestone.id} />
                    <input name="sequence" type="hidden" value={nextItemSequence} />
                    <label className="field form-wide">
                      <span>Nội dung</span>
                      <select name="content_id" required>
                        {publishedContents.map((content) => (
                          <option key={content.id} value={content.id}>{content.title} ({content.content_type})</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Hoàn thành theo</span>
                      <select name="completion_rule">
                        {completionRules.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    <label className="field">
                      <span>Mở sau ngày</span>
                      <input defaultValue="0" max="3650" min="0" name="available_offset_days" type="number" />
                    </label>
                    <label className="field">
                      <span>Hạn sau ngày</span>
                      <input max="3650" min="0" name="due_offset_days" type="number" />
                    </label>
                    <label className="check-field">
                      <input defaultChecked name="is_required" type="checkbox" /> Bắt buộc
                    </label>
                    <label className="check-field">
                      <input defaultChecked name="include_in_progress" type="checkbox" /> Tính vào tiến độ
                    </label>
                    <button className="form-wide" type="submit">Thêm hoạt động</button>
                  </form>
                )}
              </details>
            )}
            {milestone.is_active && activeItems.length === 0 && (
              <p className="muted">Chưa có hoạt động còn hiệu lực.</p>
            )}
          </article>
        );
      })}
    </section>
  );
}
