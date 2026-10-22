import { manageJourneyActivity } from "@/features/admin-operations/actions";
import { requireRole } from "@/features/auth/session";
import { getSqlPool } from "@/lib/db/sqlserver";

type Props = { searchParams: Promise<{ error?: string; updated?: string }> };

export default async function ProgressPage({ searchParams }: Props) {
  await requireRole("hr_admin");
  const params = await searchParams;
  const pool = await getSqlPool();

  const [journeysRes, profilesRes, activitiesRes, eventsRes] = await Promise.all([
    pool.request().query(`
      SELECT 
        Id AS id, 
        EmployeeId AS employee_id, 
        TitleSnapshot AS title_snapshot, 
        CONVERT(NVARCHAR(10), StartDate, 23) AS start_date, 
        Status AS status, 
        TemplateVersion AS template_version
      FROM app.EmployeeJourneys
      ORDER BY AssignedAt DESC
    `),
    pool.request().query(`
      SELECT Id AS id, DisplayName AS display_name, Email AS email
      FROM app.Profiles
    `),
    pool.request().query(`
      SELECT 
        Id AS id, 
        JourneyId AS journey_id, 
        TitleSnapshot AS title_snapshot, 
        MilestoneNameSnapshot AS milestone_name_snapshot, 
        IsRequired AS is_required, 
        IncludeInProgress AS include_in_progress, 
        Status AS status, 
        CompletionRule AS completion_rule, 
        CompletionSource AS completion_source, 
        CONVERT(NVARCHAR(10), AvailableAt, 23) AS available_at, 
        CONVERT(NVARCHAR(10), DueAt, 23) AS due_at, 
        CompletedAt AS completed_at, 
        CompletionNote AS completion_note
      FROM app.JourneyActivities
      ORDER BY MilestoneSequence ASC, ActivitySequence ASC
    `),
    pool.request().query(`
      SELECT TOP 500 
        Id AS id, 
        JourneyActivityId AS journey_activity_id, 
        ActorId AS actor_id, 
        EventType AS event_type, 
        EventData AS event_data_raw, 
        CreatedAt AS created_at
      FROM audit.ActivityEvents
      ORDER BY CreatedAt DESC
    `),
  ]);

  const journeys = journeysRes.recordset.map((j) => ({
    ...j,
    id: String(j.id),
    employee_id: String(j.employee_id),
  }));

  const profileMap = new Map(
    profilesRes.recordset.map((p) => [String(p.id), { id: String(p.id), display_name: p.display_name, email: p.email }]),
  );

  const activities = activitiesRes.recordset.map((a) => ({
    ...a,
    id: String(a.id),
    journey_id: String(a.journey_id),
    is_required: Boolean(a.is_required),
    include_in_progress: Boolean(a.include_in_progress),
  }));

  const events = eventsRes.recordset.map((e) => ({
    ...e,
    id: String(e.id),
    journey_activity_id: String(e.journey_activity_id),
    actor_id: String(e.actor_id),
    event_data: (() => {
      try {
        return typeof e.event_data_raw === "string" ? JSON.parse(e.event_data_raw) : e.event_data_raw || {};
      } catch {
        return {};
      }
    })(),
  }));

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = (activity: (typeof activities)[number]) =>
    Boolean(activity.due_at && activity.due_at < today && !["completed", "waived", "removed"].includes(activity.status));

  return (
    <div className="stack" style={{ gap: "2rem" }}>
      <header className="card stack" style={{ gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className="badge badge-primary">Quản Lý Vận Hành</span>
          <span className="badge badge-accent">Audit Trail Ready</span>
        </div>
        <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Tiến Độ Chi Tiết & Phê Duyệt Hoạt Động</h1>
        <p className="muted" style={{ margin: 0 }}>
          Mọi thao tác hoàn thành, miễn trừ hoặc mở lại hoạt động đều được lưu vết đầy đủ trong nhật ký kiểm toán hệ thống.
        </p>
        {params.updated && (
          <div className="notice notice-success" role="status">
            ✓ Đã cập nhật trạng thái hoạt động thành công!
          </div>
        )}
        {params.error && (
          <div className="notice notice-danger" role="alert">
            ⚠️ Không thể cập nhật hoạt động. Trạng thái hiện tại có thể không cho phép thao tác này.
          </div>
        )}
      </header>

      {(journeys ?? []).length === 0 ? (
        <article className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p className="muted">Chưa có hành trình nào được giao cho nhân viên.</p>
        </article>
      ) : (
        (journeys ?? []).map((journey) => {
          const employee = profileMap.get(journey.employee_id);
          const journeyActivities = activities.filter((activity) => activity.journey_id === journey.id);
          const counted = journeyActivities.filter((activity) => activity.include_in_progress && activity.available_at <= today && activity.status !== "removed");
          const completed = counted.filter((activity) => ["completed", "waived"].includes(activity.status)).length;
          const percent = counted.length ? Math.round((completed / counted.length) * 100) : 0;
          const overdue = journeyActivities.filter(isOverdue).length;

          return (
            <article className="card stack" key={journey.id} style={{ gap: "1.5rem" }}>
              <div className="flex-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <span className="badge badge-primary">Hành Trình Nhân Viên</span>
                    <span className="badge badge-accent">v{journey.template_version}</span>
                  </div>
                  <h2 style={{ fontSize: "1.35rem", color: "var(--color-text-main)", margin: 0 }}>
                    {employee?.display_name ?? "Nhân viên không xác định"} · {journey.title_snapshot}
                  </h2>
                  <p className="muted" style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                    {employee?.email} · Bắt đầu ngày <strong>{journey.start_date}</strong> · Trạng thái:{" "}
                    <strong style={{ color: "var(--color-primary)" }}>{journey.status}</strong>
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "2rem", fontWeight: 800, color: percent === 100 ? "var(--status-success)" : "var(--color-primary)" }} className="tabular-numbers">
                    {percent}%
                  </div>
                  <span className="muted" style={{ fontSize: "0.8rem" }}>
                    {completed}/{counted.length} hoạt động {overdue > 0 ? `· ⚠️ ${overdue} quá hạn` : ""}
                  </span>
                </div>
              </div>

              {/* Progress Bar với shimmer */}
              <div style={{ width: "100%", height: "10px", backgroundColor: "var(--color-bg-subtle)", borderRadius: "9999px", overflow: "hidden" }}>
                <div
                  className={percent > 0 ? "progress-bar-animated" : ""}
                  style={{
                    width: `${percent}%`,
                    height: "100%",
                    borderRadius: "9999px",
                    transition: "width 0.4s ease",
                  }}
                />
              </div>

              {/* Danh sách nhiệm vụ của nhân viên */}
              <div className="stack" style={{ gap: "1rem" }}>
                {journeyActivities.map((activity) => {
                  const canManage = journey.status === "active" && activity.status !== "removed";
                  const history = (events ?? []).filter((event) => event.journey_activity_id === activity.id);
                  const isActOverdue = isOverdue(activity);

                  return (
                    <div className="inset-card stack" key={activity.id} style={{ gap: "0.85rem" }}>
                      <div className="flex-between" style={{ flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                            <strong style={{ fontSize: "1rem", color: "var(--color-text-main)" }}>
                              {activity.title_snapshot}
                            </strong>
                            {activity.is_required && (
                              <span style={{ fontSize: "0.72rem", color: "var(--color-primary)", fontWeight: 700 }}>
                                [Bắt buộc]
                              </span>
                            )}
                          </div>
                          <p className="muted" style={{ fontSize: "0.82rem" }}>
                            Chặng: <strong>{activity.milestone_name_snapshot}</strong> · Mở: {activity.available_at}
                            {activity.due_at ? ` · Hạn: ${activity.due_at}` : ""}
                          </p>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          {isActOverdue && <span className="badge badge-danger">⚠️ Quá hạn</span>}
                          <span
                            className={`badge ${
                              activity.status === "completed"
                                ? "badge-success"
                                : activity.status === "waived"
                                  ? "badge-locked"
                                  : "badge-primary"
                            }`}
                          >
                            {activity.status}
                          </span>
                        </div>
                      </div>

                      {activity.completion_note && (
                        <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", backgroundColor: "var(--color-bg-subtle)", padding: "0.5rem 0.85rem", borderRadius: "var(--radius-sm)" }}>
                          💬 <strong>Ghi chú:</strong> {activity.completion_note}
                        </div>
                      )}

                      {history.length > 0 && (
                        <details style={{ fontSize: "0.85rem" }}>
                          <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                            📜 Lịch sử kiểm toán ({history.length} bản ghi)
                          </summary>
                          <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem" }}>
                            {history.map((event) => {
                              const actor = profileMap.get(event.actor_id);
                              const eventData = event.event_data && typeof event.event_data === "object" ? event.event_data as Record<string, unknown> : {};
                              return (
                                <li key={event.id} style={{ marginBottom: "0.35rem" }} className="muted">
                                  <strong>{new Date(event.created_at).toLocaleString("vi-VN")}</strong> · {actor?.display_name ?? "Tài khoản"} · {event.event_type}
                                  {typeof eventData.note === "string" ? ` · Ghi chú: "${eventData.note}"` : ""}
                                </li>
                              );
                            })}
                          </ul>
                        </details>
                      )}

                      {canManage && (
                        <form
                          action={manageJourneyActivity}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                            flexWrap: "wrap",
                            marginTop: "0.5rem",
                            paddingTop: "0.75rem",
                            borderTop: "1px dashed var(--color-border)",
                          }}
                        >
                          <input name="activity_id" type="hidden" value={activity.id} />
                          <div style={{ minWidth: "160px" }}>
                            <select
                              defaultValue={activity.status === "completed" || activity.status === "waived" ? "reopen" : "complete"}
                              name="action"
                              className="form-select"
                              style={{ minHeight: "38px", fontSize: "0.85rem", padding: "0.4rem 0.75rem" }}
                            >
                              {activity.status === "completed" || activity.status === "waived" ? (
                                <option value="reopen">🔄 Mở lại hoạt động</option>
                              ) : (
                                <>
                                  <option value="complete">✓ Duyệt hoàn thành</option>
                                  <option value="waive">Miễn trừ (Waive)</option>
                                </>
                              )}
                            </select>
                          </div>

                          <div style={{ flex: 1, minWidth: "220px" }}>
                            <input
                              maxLength={500}
                              minLength={3}
                              name="note"
                              required
                              placeholder="Nhập lý do kiểm toán bắt buộc..."
                              className="form-input"
                              style={{ minHeight: "38px", fontSize: "0.85rem", padding: "0.4rem 0.75rem" }}
                            />
                          </div>

                          <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ minHeight: "38px", padding: "0.4rem 1.15rem", fontSize: "0.85rem" }}
                          >
                            Lưu trạng thái
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}
