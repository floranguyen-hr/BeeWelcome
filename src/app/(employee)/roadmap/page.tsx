import { completeJourneyActivity, submitJourneyActivity } from "@/features/employee-journey/actions";
import { requireRole } from "@/features/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type FormField = {
  name: string;
  label: string;
  type: "text" | "choice";
  required: boolean;
  options?: string[];
};

type SearchParams = { result?: string; error?: string };

function displayDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function objectBody(body: unknown): Record<string, unknown> {
  return body && typeof body === "object"
    ? (body as Record<string, unknown>)
    : {};
}

function bodyText(body: Record<string, unknown>, contentType: string) {
  const field =
    contentType === "task"
      ? "instructions"
      : contentType === "quiz_form"
        ? "prompt"
        : contentType === "image" || contentType === "video" || contentType === "file_link"
          ? "url"
          : "text";
  return typeof body[field] === "string" ? body[field] : "";
}

function formFields(body: Record<string, unknown>): FormField[] {
  if (!Array.isArray(body.fields)) return [];
  return body.fields.filter((field): field is FormField => {
    if (!field || typeof field !== "object") return false;
    const value = field as Record<string, unknown>;
    return (
      typeof value.name === "string" &&
      typeof value.label === "string" &&
      (value.type === "text" || value.type === "choice")
    );
  });
}

export default async function RoadmapPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole("employee");
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return <p className="notice">Cần cấu hình Supabase để tải hành trình.</p>;
  }

  const { data: journeys, error: journeyError } = await supabase
    .from("employee_journeys")
    .select("id, title_snapshot, start_date, status, template_version, assigned_at")
    .order("start_date", { ascending: false });
  if (journeyError) throw new Error("Không tải được hành trình onboarding.");

  const journeyIds = (journeys ?? []).map((journey) => journey.id);
  const { data: activities, error: activityError } = journeyIds.length
    ? await supabase
        .from("journey_activities")
        .select(
          "id, journey_id, title_snapshot, description_snapshot, content_type_snapshot, content_body_snapshot, milestone_name_snapshot, milestone_sequence, activity_sequence, is_required, available_at, due_at, completion_rule, include_in_progress, status, completed_at, completion_source",
        )
        .in("journey_id", journeyIds)
        .order("milestone_sequence")
        .order("activity_sequence")
    : { data: [], error: null };
  if (activityError) throw new Error("Không tải được hoạt động trong hành trình.");

  const activityList = activities ?? [];
  const today = new Date().toISOString().slice(0, 10);
  if ((journeys ?? []).length === 0) {
    return (
      <section className="card stack">
        <h2>Roadmap của tôi</h2>
        <p>Chưa có hành trình được phân công. Hãy liên hệ HR để được hỗ trợ.</p>
      </section>
    );
  }

  return (
    <section className="stack">
      <header className="card stack">
        <h2>Roadmap của tôi</h2>
        <p className="muted">
          Tiến độ tính từ hoạt động đã mở và được cấu hình tham gia tiến độ. Mở nội dung không tự hoàn thành hoạt động.
        </p>
        {params.result === "completed" && <p role="status">Đã ghi nhận hoàn thành hoạt động.</p>}
        {params.result === "retry" && (
          <p role="status">Bài kiểm tra đã được lưu. Cần đạt tiêu chí để hoàn thành hoạt động.</p>
        )}
        {params.error && (
          <p className="error-text" role="alert">
            Không ghi nhận được phản hồi. Kiểm tra câu trả lời và thử lại.
          </p>
        )}
      </header>
      {(journeys ?? []).map((journey) => {
        const journeyActivities = activityList.filter(
          (activity) => activity.journey_id === journey.id,
        );
        const progressActivities = journeyActivities.filter(
          (activity) =>
            activity.include_in_progress &&
            activity.available_at <= today &&
            activity.status !== "removed" &&
            journey.status === "active",
        );
        const completedCount = progressActivities.filter(
          (activity) => activity.status === "completed" || activity.status === "waived",
        ).length;
        const progress = progressActivities.length
          ? Math.round((completedCount / progressActivities.length) * 100)
          : 0;
        const milestones = new Map<string, typeof journeyActivities>();
        for (const activity of journeyActivities) {
          const key = `${activity.milestone_sequence}:${activity.milestone_name_snapshot}`;
          milestones.set(key, [...(milestones.get(key) ?? []), activity]);
        }

        return (
          <article className="card stack" key={journey.id}>
            <div className="portal-header">
              <div>
                <h3>{journey.title_snapshot}</h3>
                <p className="muted">
                  Bắt đầu {displayDate(journey.start_date)} · phiên bản {journey.template_version} · {journey.status}
                </p>
              </div>
              <strong>{progress}%</strong>
            </div>
            <progress aria-label="Tiến độ hành trình" max={100} value={progress} />
            {progressActivities.length === 0 ? (
              <p className="muted">Chưa có hoạt động được mở khóa để tính tiến độ.</p>
            ) : (
              <p className="muted">
                {completedCount} / {progressActivities.length} hoạt động tính tiến độ đã hoàn thành
              </p>
            )}
            {[...milestones.entries()].map(([key, milestoneActivities]) => (
              <section className="stack milestone-block" key={key}>
                <h4>{milestoneActivities[0]?.milestone_name_snapshot}</h4>
                {milestoneActivities.map((activity) => {
                  const isLocked = activity.available_at > today;
                  const isOverdue =
                    !isLocked &&
                    activity.due_at !== null &&
                    activity.due_at < today &&
                    !["completed", "waived", "removed"].includes(activity.status);
                  const statusLabel = isLocked
                    ? "Đã khóa"
                    : isOverdue
                      ? "Quá hạn"
                      : activity.status === "not_started"
                        ? "Chưa bắt đầu"
                        : activity.status === "in_progress"
                          ? "Đang thực hiện"
                          : activity.status === "completed"
                            ? "Đã hoàn thành"
                            : activity.status === "waived"
                              ? "Đã miễn trừ"
                              : activity.status;
                  const body = objectBody(activity.content_body_snapshot);
                  const text = bodyText(body, activity.content_type_snapshot);
                  const canComplete =
                    !isLocked &&
                    !["completed", "waived", "removed"].includes(activity.status) &&
                    journey.status === "active";

                  return (
                    <article className="inset-card stack" key={activity.id}>
                      <div className="portal-header">
                        <div>
                          <h5>{activity.title_snapshot}</h5>
                          <p className="muted">
                            {activity.is_required ? "Bắt buộc" : "Không bắt buộc"} · {statusLabel}
                            {" · "}{activity.completion_rule.replaceAll("_", " ")}
                          </p>
                        </div>
                      </div>
                      <p className="muted">
                        Mở từ {displayDate(activity.available_at)}
                        {activity.due_at ? ` · Hạn ${displayDate(activity.due_at)}` : ""}
                        {activity.completed_at
                          ? ` · Hoàn thành ${displayDate(activity.completed_at)}`
                          : ""}
                      </p>
                      {activity.description_snapshot && <p>{activity.description_snapshot}</p>}
                      {text && activity.content_type_snapshot === "file_link" && /^https?:\/\//i.test(text) ? (
                        <p><a href={text} rel="noreferrer" target="_blank">Mở tài liệu</a></p>
                      ) : text && ["image", "video"].includes(activity.content_type_snapshot) && /^https?:\/\//i.test(text) ? (
                        <p><a href={text} rel="noreferrer" target="_blank">Mở nội dung</a></p>
                      ) : text ? (
                        <div className="snapshot-content"><p>{text}</p></div>
                      ) : null}

                      {canComplete && ["manual_self_confirmation", "content_acknowledgement"].includes(activity.completion_rule) && (
                        <form action={completeJourneyActivity} className="stack">
                          <input name="activity_id" type="hidden" value={activity.id} />
                          <input name="completion_rule" type="hidden" value={activity.completion_rule} />
                          <label className="check-field">
                            <input
                              name={activity.completion_rule === "manual_self_confirmation" ? "confirmed" : "acknowledged"}
                              required
                              type="checkbox"
                            />
                            {activity.completion_rule === "manual_self_confirmation"
                              ? "Tôi đã tự thực hiện nhiệm vụ này"
                              : "Tôi xác nhận đã đọc nội dung"}
                          </label>
                          <button type="submit">Ghi nhận hoàn thành</button>
                        </form>
                      )}

                      {canComplete && ["quiz_participation", "quiz_pass_required"].includes(activity.completion_rule) && (
                        <form action={submitJourneyActivity} className="stack">
                          <input name="activity_id" type="hidden" value={activity.id} />
                          <input name="completion_rule" type="hidden" value={activity.completion_rule} />
                          <fieldset className="stack">
                            <legend>{typeof body.prompt === "string" ? body.prompt : "Chọn một câu trả lời"}</legend>
                            {(Array.isArray(body.options) ? body.options : []).map((option, index) => (
                              <label className="check-field" key={index}>
                                <input name="answer_index" required type="radio" value={index} />
                                {String(option)}
                              </label>
                            ))}
                          </fieldset>
                          <button type="submit">Nộp câu trả lời</button>
                        </form>
                      )}

                      {canComplete && activity.completion_rule === "form_submission" && (
                        <form action={submitJourneyActivity} className="form-grid">
                          <input name="activity_id" type="hidden" value={activity.id} />
                          <input name="completion_rule" type="hidden" value={activity.completion_rule} />
                          {typeof body.prompt === "string" && <p className="form-wide">{body.prompt}</p>}
                          {formFields(body).map((field) => (
                            <label className="field form-wide" key={field.name}>
                              <span>{field.label}{field.required ? " *" : ""}</span>
                              {field.type === "choice" ? (
                                <select defaultValue="" name={`answer_${field.name}`} required={field.required}>
                                  <option disabled value="">Chọn một đáp án</option>
                                  {(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
                                </select>
                              ) : (
                                <input maxLength={2000} name={`answer_${field.name}`} required={field.required} />
                              )}
                            </label>
                          ))}
                          <button className="form-wide" type="submit">Nộp biểu mẫu</button>
                        </form>
                      )}

                      {canComplete && activity.completion_rule === "admin_completion" && (
                        <p className="notice">Hoạt động này cần HR Admin xử lý.</p>
                      )}
                      {activity.status === "completed" && activity.completion_source && (
                        <p className="muted">Nguồn hoàn thành: {activity.completion_source.replaceAll("_", " ")}</p>
                      )}
                    </article>
                  );
                })}
              </section>
            ))}
          </article>
        );
      })}
    </section>
  );
}
