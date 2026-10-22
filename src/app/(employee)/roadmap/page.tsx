import { completeJourneyActivity, submitJourneyActivity } from "@/features/employee-journey/actions";
import { requireRole } from "@/features/auth/session";
import { getSqlPool, sql } from "@/lib/db/sqlserver";
import { BeeMascot } from "@/components/ui/BeeMascot";

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
  const profile = await requireRole("employee");
  const params = await searchParams;
  const pool = await getSqlPool();

  const journeyRes = await pool
    .request()
    .input("empId", sql.UniqueIdentifier, profile.id)
    .query(`
      SELECT 
        Id AS id, 
        TitleSnapshot AS title_snapshot, 
        CONVERT(NVARCHAR(10), StartDate, 23) AS start_date, 
        Status AS status, 
        TemplateVersion AS template_version, 
        AssignedAt AS assigned_at
      FROM app.EmployeeJourneys
      WHERE EmployeeId = @empId
      ORDER BY StartDate DESC
    `);

  const journeys = journeyRes.recordset;
  const journeyIds = journeys.map((j) => String(j.id));

  let activityList: any[] = [];
  if (journeyIds.length > 0) {
    const actReq = pool.request();
    const inParams = journeyIds
      .map((id, idx) => {
        actReq.input(`jId${idx}`, sql.UniqueIdentifier, id);
        return `@jId${idx}`;
      })
      .join(", ");

    const actRes = await actReq.query(`
      SELECT 
        Id AS id, 
        JourneyId AS journey_id, 
        TitleSnapshot AS title_snapshot, 
        DescriptionSnapshot AS description_snapshot, 
        ContentTypeSnapshot AS content_type_snapshot, 
        ContentBodySnapshot AS content_body_raw, 
        MilestoneNameSnapshot AS milestone_name_snapshot, 
        MilestoneSequence AS milestone_sequence, 
        ActivitySequence AS activity_sequence, 
        IsRequired AS is_required, 
        CONVERT(NVARCHAR(10), AvailableAt, 23) AS available_at, 
        CONVERT(NVARCHAR(10), DueAt, 23) AS due_at, 
        CompletionRule AS completion_rule, 
        IncludeInProgress AS include_in_progress, 
        Status AS status, 
        CompletedAt AS completed_at, 
        CompletionSource AS completion_source
      FROM app.JourneyActivities
      WHERE JourneyId IN (${inParams})
      ORDER BY MilestoneSequence ASC, ActivitySequence ASC
    `);

    activityList = actRes.recordset.map((row) => ({
      ...row,
      id: String(row.id),
      journey_id: String(row.journey_id),
      is_required: Boolean(row.is_required),
      include_in_progress: Boolean(row.include_in_progress),
      content_body_snapshot: (() => {
        try {
          return typeof row.content_body_raw === "string"
            ? JSON.parse(row.content_body_raw)
            : row.content_body_raw || {};
        } catch {
          return {};
        }
      })(),
    }));
  }
  const today = new Date().toISOString().slice(0, 10);

  if ((journeys ?? []).length === 0) {
    return (
      <section className="card stack" style={{ textAlign: "center", padding: "4rem 2rem", alignItems: "center" }}>
        <BeeMascot size="lg" />
        <h2 style={{ marginTop: "1.25rem", fontSize: "1.6rem" }}>Chưa Có Lộ Trình Phân Công</h2>
        <p className="muted" style={{ maxWidth: "480px", margin: "0 auto", lineHeight: 1.6 }}>
          Hiện bạn chưa được gán lộ trình Onboarding nào. Xin vui lòng liên hệ phòng Hành chính Nhân sự Bee Logistics để được hỗ trợ phân công hành trình hội nhập.
        </p>
      </section>
    );
  }

  return (
    <div className="stack" style={{ gap: "2rem" }}>
      {/* Toast / Notification Banner */}
      {params.result === "completed" && (
        <div className="notice notice-success" role="status">
          🎉 <strong>Tuyệt vời!</strong> Bạn đã hoàn thành nhiệm vụ thành công.
        </div>
      )}
      {params.result === "retry" && (
        <div className="notice" role="status">
          💡 <strong>Bài kiểm tra đã được lưu:</strong> Bạn chưa đạt điểm yêu cầu để hoàn thành. Hãy xem lại kiến thức và thử làm lại nhé!
        </div>
      )}
      {params.error && (
        <div className="notice notice-danger" role="alert">
          ⚠️ Không thể ghi nhận phản hồi. Xin vui lòng kiểm tra lại câu trả lời và nộp lại.
        </div>
      )}

      {/* Danh sách hành trình được giao */}
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
          <article key={journey.id} className="stack" style={{ gap: "2rem" }}>
            {/* Hero Progress Banner */}
            <div
              className="card"
              style={{
                background: "linear-gradient(135deg, #FFFFFF 0%, #FFFDF9 60%, #FFF5ED 100%)",
                border: "1px solid rgba(255, 90, 0, 0.22)",
                boxShadow: "0 10px 30px -5px rgba(255, 90, 0, 0.08)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div className="flex-between" style={{ flexWrap: "wrap", gap: "1.25rem", marginBottom: "1.25rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <span className="badge badge-primary">
                      📍 Lộ Trình Đang Hoạt Động
                    </span>
                    <span className="badge badge-accent">
                      Phiên bản {journey.template_version}
                    </span>
                  </div>
                  <h2 style={{ fontSize: "1.55rem", color: "var(--color-text-main)" }}>
                    {journey.title_snapshot}
                  </h2>
                  <p className="muted" style={{ fontSize: "0.88rem", marginTop: "0.25rem" }}>
                    Bắt đầu từ ngày <strong>{displayDate(journey.start_date)}</strong> · Trạng thái:{" "}
                    <span style={{ textTransform: "capitalize", fontWeight: 700, color: "var(--color-primary)" }}>
                      {journey.status}
                    </span>
                  </p>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontSize: "2.75rem",
                      fontWeight: 800,
                      color: progress === 100 ? "var(--status-success)" : "var(--color-primary)",
                      lineHeight: 1,
                    }}
                    className="tabular-numbers"
                  >
                    {progress}%
                  </div>
                  <span className="muted" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                    Tiến độ hoàn thành
                  </span>
                </div>
              </div>

              {/* Shimmer Animated Progress Bar */}
              <div
                style={{
                  width: "100%",
                  height: "12px",
                  backgroundColor: "rgba(232, 232, 229, 0.6)",
                  borderRadius: "9999px",
                  overflow: "hidden",
                  marginBottom: "0.85rem",
                }}
              >
                <div
                  className={progress > 0 ? "progress-bar-animated" : ""}
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    borderRadius: "9999px",
                    transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                />
              </div>

              <div className="flex-between" style={{ fontSize: "0.88rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <span className="muted">
                  Đã hoàn thành <strong>{completedCount}</strong> / {progressActivities.length} nhiệm vụ đã mở khóa
                </span>
                {progress === 100 ? (
                  <span style={{ color: "var(--status-success)", fontWeight: 700 }}>
                    🌟 Bạn đã xuất sắc hoàn thành 100% lộ trình Onboarding!
                  </span>
                ) : (
                  <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                    🚀 Cố lên! Hãy tiếp tục hoàn thành các nhiệm vụ tuần này nhé.
                  </span>
                )}
              </div>
            </div>

            {/* Stepper Timeline Roadmap */}
            <div style={{ position: "relative" }} className="stack">
              {[...milestones.entries()].map(([key, milestoneActivities], mIndex) => {
                const milestoneName = milestoneActivities[0]?.milestone_name_snapshot;
                const allMilestoneCompleted = milestoneActivities.every(
                  (a) => a.status === "completed" || a.status === "waived",
                );

                return (
                  <section
                    key={key}
                    className="card"
                    style={{
                      position: "relative",
                      borderLeft: `4px solid ${allMilestoneCompleted ? "var(--status-success)" : "var(--color-primary)"}`,
                      marginBottom: "1.5rem",
                    }}
                  >
                    {/* Header Giai Đoạn Milestone */}
                    <div
                      className="flex-between"
                      style={{
                        marginBottom: "1.25rem",
                        paddingBottom: "0.85rem",
                        borderBottom: "1px solid var(--color-border-subtle)",
                        flexWrap: "wrap",
                        gap: "0.75rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "12px",
                            backgroundColor: allMilestoneCompleted ? "var(--status-success-bg)" : "var(--color-primary-light)",
                            color: allMilestoneCompleted ? "var(--status-success)" : "var(--color-primary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: "1.05rem",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                          }}
                        >
                          {mIndex + 1}
                        </div>
                        <div>
                          <div style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", color: "var(--color-primary)" }}>
                            Chặng {mIndex + 1}
                          </div>
                          <h3 style={{ fontSize: "1.2rem", color: "var(--color-text-main)" }}>
                            {milestoneName}
                          </h3>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span className="muted" style={{ fontSize: "0.85rem" }}>
                          {milestoneActivities.length} hoạt động
                        </span>
                        {allMilestoneCompleted && (
                          <span className="badge badge-success">✓ Đã hoàn tất chặng</span>
                        )}
                      </div>
                    </div>

                    {/* Danh sách các Activities */}
                    <div className="stack" style={{ gap: "1rem" }}>
                      {milestoneActivities.map((activity) => {
                        const isLocked = activity.available_at > today;
                        const isOverdue =
                          !isLocked &&
                          activity.due_at !== null &&
                          activity.due_at < today &&
                          !["completed", "waived", "removed"].includes(activity.status);

                        const statusBadge = isLocked ? (
                          <span className="badge badge-locked">🔒 Chưa mở</span>
                        ) : isOverdue ? (
                          <span className="badge badge-danger">⚠️ Quá hạn</span>
                        ) : activity.status === "completed" ? (
                          <span className="badge badge-success">✓ Đã hoàn thành</span>
                        ) : activity.status === "waived" ? (
                          <span className="badge badge-locked">Đã miễn trừ</span>
                        ) : activity.status === "in_progress" ? (
                          <span className="badge badge-accent">● Đang học</span>
                        ) : (
                          <span className="badge badge-primary">Sẵn sàng</span>
                        );

                        const body = objectBody(activity.content_body_snapshot);
                        const text = bodyText(body, activity.content_type_snapshot);
                        const canComplete =
                          !isLocked &&
                          !["completed", "waived", "removed"].includes(activity.status) &&
                          journey.status === "active";

                        const contentTypeIcon =
                          activity.content_type_snapshot === "quiz_form"
                            ? "🧩"
                            : activity.content_type_snapshot === "video"
                              ? "🎬"
                              : activity.content_type_snapshot === "file_link"
                                ? "📄"
                                : activity.content_type_snapshot === "image"
                                  ? "🖼️"
                                  : "📋";

                        return (
                          <article
                            key={activity.id}
                            className="inset-card"
                            style={{
                              backgroundColor: activity.status === "completed" ? "#FAFCFA" : "#FFFFFF",
                              border: activity.status === "completed" ? "1px solid #D1E7DD" : "1px solid var(--color-border)",
                              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
                            }}
                          >
                            <div className="flex-between" style={{ alignItems: "flex-start", gap: "1rem", marginBottom: "0.5rem" }}>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
                                  <span style={{ fontSize: "1.1rem" }}>{contentTypeIcon}</span>
                                  <strong style={{ fontSize: "1.02rem", color: "var(--color-text-main)" }}>
                                    {activity.title_snapshot}
                                  </strong>
                                  {activity.is_required && (
                                    <span style={{ fontSize: "0.72rem", color: "var(--color-primary)", fontWeight: 700, backgroundColor: "var(--color-primary-light)", padding: "0.15rem 0.45rem", borderRadius: "4px" }}>
                                      BẮT BUỘC
                                    </span>
                                  )}
                                </div>
                                <p className="muted" style={{ fontSize: "0.82rem" }}>
                                  Mở ngày {displayDate(activity.available_at)}
                                  {activity.due_at ? ` · Hạn chót: ${displayDate(activity.due_at)}` : ""}
                                  {activity.completed_at ? ` · Đã nộp: ${displayDate(activity.completed_at)}` : ""}
                                </p>
                              </div>
                              {statusBadge}
                            </div>

                            {activity.description_snapshot && (
                              <p style={{ fontSize: "0.92rem", color: "var(--color-text-muted)", marginBottom: "0.75rem", lineHeight: 1.55 }}>
                                {activity.description_snapshot}
                              </p>
                            )}

                            {/* Content Display */}
                            {text && activity.content_type_snapshot === "file_link" && /^https?:\/\//i.test(text) ? (
                              <p style={{ margin: "0.65rem 0" }}>
                                <a href={text} rel="noreferrer" target="_blank" className="btn btn-secondary" style={{ display: "inline-flex", minHeight: "36px", padding: "0.45rem 1rem", fontSize: "0.88rem" }}>
                                  📄 Mở xem tài liệu hướng dẫn ↗
                                </a>
                              </p>
                            ) : text && ["image", "video"].includes(activity.content_type_snapshot) && /^https?:\/\//i.test(text) ? (
                              <p style={{ margin: "0.65rem 0" }}>
                                <a href={text} rel="noreferrer" target="_blank" className="btn btn-secondary" style={{ display: "inline-flex", minHeight: "36px", padding: "0.45rem 1rem", fontSize: "0.88rem" }}>
                                  🎬 Mở xem nội dung đa phương tiện ↗
                                </a>
                              </p>
                            ) : text ? (
                              <div
                                style={{
                                  backgroundColor: "var(--color-bg-subtle)",
                                  padding: "0.9rem 1.15rem",
                                  borderRadius: "var(--radius-md)",
                                  borderLeft: "3.5px solid var(--color-primary)",
                                  fontSize: "0.92rem",
                                  margin: "0.75rem 0",
                                  lineHeight: 1.6,
                                }}
                              >
                                {text}
                              </div>
                            ) : null}

                            {/* Hành động hoàn thành: Xác nhận đọc hoặc tự thực hiện */}
                            {canComplete && ["manual_self_confirmation", "content_acknowledgement"].includes(activity.completion_rule) && (
                              <form action={completeJourneyActivity} style={{ marginTop: "1rem", paddingTop: "0.85rem", borderTop: "1px dashed var(--color-border)" }}>
                                <input name="activity_id" type="hidden" value={activity.id} />
                                <input name="completion_rule" type="hidden" value={activity.completion_rule} />
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                                  <label className="check-label-card" style={{ flex: 1, minWidth: "260px" }}>
                                    <input
                                      name={activity.completion_rule === "manual_self_confirmation" ? "confirmed" : "acknowledged"}
                                      required
                                      type="checkbox"
                                    />
                                    <span>
                                      {activity.completion_rule === "manual_self_confirmation"
                                        ? "Tôi xác nhận đã chuẩn bị và hoàn thành đầy đủ nhiệm vụ này"
                                        : "Tôi xác nhận đã đọc kỹ và nắm rõ nội dung tài liệu"}
                                    </span>
                                  </label>
                                  <button type="submit" className="btn btn-primary" style={{ padding: "0.55rem 1.35rem" }}>
                                    Ghi nhận hoàn thành ➔
                                  </button>
                                </div>
                              </form>
                            )}

                            {/* Hành động hoàn thành: Làm bài Quiz trắc nghiệm (BULLETPROOF HOVER) */}
                            {canComplete && ["quiz_participation", "quiz_pass_required"].includes(activity.completion_rule) && (
                              <form action={submitJourneyActivity} style={{ marginTop: "1rem", paddingTop: "0.85rem", borderTop: "1px dashed var(--color-border)" }}>
                                <input name="activity_id" type="hidden" value={activity.id} />
                                <input name="completion_rule" type="hidden" value={activity.completion_rule} />
                                <fieldset style={{ border: "none", padding: 0 }} className="stack">
                                  <legend style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "0.98rem", marginBottom: "0.65rem", color: "var(--color-primary)" }}>
                                    {typeof body.prompt === "string" ? body.prompt : "Hãy chọn một đáp án chính xác:"}
                                  </legend>
                                  <div className="stack" style={{ gap: "0.6rem" }}>
                                    {(Array.isArray(body.options) ? body.options : []).map((option, index) => (
                                      <label key={index} className="check-label-card">
                                        <input name="answer_index" required type="radio" value={index} />
                                        <span>{String(option)}</span>
                                      </label>
                                    ))}
                                  </div>
                                </fieldset>
                                <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "flex-end" }}>
                                  <button type="submit" className="btn btn-primary" style={{ padding: "0.6rem 1.6rem" }}>
                                    Nộp câu trả lời bài Quiz ➔
                                  </button>
                                </div>
                              </form>
                            )}

                            {/* Hành động hoàn thành: Nộp Form khảo sát */}
                            {canComplete && activity.completion_rule === "form_submission" && (
                              <form action={submitJourneyActivity} style={{ marginTop: "1rem", paddingTop: "0.85rem", borderTop: "1px dashed var(--color-border)" }}>
                                <input name="activity_id" type="hidden" value={activity.id} />
                                <input name="completion_rule" type="hidden" value={activity.completion_rule} />
                                {typeof body.prompt === "string" && (
                                  <p style={{ fontWeight: 700, marginBottom: "0.85rem", color: "var(--color-primary)", fontSize: "0.98rem" }}>
                                    {body.prompt}
                                  </p>
                                )}
                                <div className="stack" style={{ gap: "0.85rem" }}>
                                  {formFields(body).map((field) => (
                                    <div key={field.name} className="form-group" style={{ marginBottom: 0 }}>
                                      <label className="form-label" htmlFor={`input_${field.name}`}>
                                        {field.label} {field.required && <span style={{ color: "var(--color-primary)" }}>*</span>}
                                      </label>
                                      {field.type === "choice" ? (
                                        <select id={`input_${field.name}`} defaultValue="" name={`answer_${field.name}`} required={field.required} className="form-select">
                                          <option disabled value="">-- Vui lòng chọn một mục --</option>
                                          {(field.options ?? []).map((opt) => (
                                            <option key={opt} value={opt}>{opt}</option>
                                          ))}
                                        </select>
                                      ) : (
                                        <input id={`input_${field.name}`} maxLength={2000} name={`answer_${field.name}`} required={field.required} className="form-input" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "flex-end" }}>
                                  <button type="submit" className="btn btn-primary" style={{ padding: "0.6rem 1.6rem" }}>
                                    Gửi thông tin biểu mẫu ➔
                                  </button>
                                </div>
                              </form>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </article>
        );
      })}
    </div>
  );
}
