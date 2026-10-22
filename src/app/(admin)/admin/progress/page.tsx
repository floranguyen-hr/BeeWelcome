import { manageJourneyActivity } from "@/features/admin-operations/actions";
import { requireRole } from "@/features/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ error?: string; updated?: string }> };

export default async function ProgressPage({ searchParams }: Props) {
  await requireRole("hr_admin");
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <p className="notice">Cần cấu hình Supabase để tải tiến độ.</p>;

  const { data: journeys, error: journeyError } = await supabase
    .from("employee_journeys")
    .select("id, employee_id, title_snapshot, start_date, status, template_version")
    .order("assigned_at", { ascending: false });
  if (journeyError) throw new Error("Không tải được hành trình.");

  const journeyIds = (journeys ?? []).map((journey) => journey.id);
  const [profileResult, activityResult] = journeyIds.length
    ? await Promise.all([
        supabase.from("profiles").select("id, display_name, email"),
        supabase
          .from("journey_activities")
          .select("id, journey_id, title_snapshot, milestone_name_snapshot, is_required, include_in_progress, status, completion_rule, completion_source, available_at, due_at, completed_at, completion_note")
          .in("journey_id", journeyIds)
          .order("milestone_sequence")
          .order("activity_sequence"),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (profileResult.error || activityResult.error) throw new Error("Không tải được hồ sơ hoặc hoạt động.");

  const profileMap = new Map((profileResult.data ?? []).map((profile) => [profile.id, profile]));
  const activities = activityResult.data ?? [];
  const { data: events, error: eventsError } = activities.length
    ? await supabase
        .from("activity_events")
        .select("id, journey_activity_id, actor_id, event_type, event_data, created_at")
        .in("journey_activity_id", activities.map((activity) => activity.id))
        .order("created_at", { ascending: false })
        .limit(500)
    : { data: [], error: null };
  if (eventsError) throw new Error("Không tải được lịch sử kiểm toán.");
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = (activity: (typeof activities)[number]) =>
    Boolean(activity.due_at && activity.due_at < today && !["completed", "waived", "removed"].includes(activity.status));

  return (
    <section className="stack">
      <header className="card stack">
        <h2>Tiến độ và hoạt động</h2>
        <p className="muted">Mọi thao tác hoàn thành, miễn trừ hoặc mở lại cần ghi chú và được lưu thành sự kiện kiểm toán.</p>
        {params.updated && <p role="status">Đã cập nhật trạng thái hoạt động.</p>}
        {params.error && <p className="error-text" role="alert">Không thể cập nhật hoạt động. Trạng thái hiện tại có thể không cho phép thao tác này.</p>}
      </header>
      {(journeys ?? []).length === 0 ? <article className="card"><p>Chưa có hành trình được giao.</p></article> : (journeys ?? []).map((journey) => {
        const employee = profileMap.get(journey.employee_id);
        const journeyActivities = activities.filter((activity) => activity.journey_id === journey.id);
        const counted = journeyActivities.filter((activity) => activity.include_in_progress && activity.available_at <= today && activity.status !== "removed");
        const completed = counted.filter((activity) => ["completed", "waived"].includes(activity.status)).length;
        const percent = counted.length ? Math.round((completed / counted.length) * 100) : 0;
        const overdue = journeyActivities.filter(isOverdue).length;
        return (
          <article className="card stack" key={journey.id}>
            <div className="portal-header">
              <div>
                <h3>{employee?.display_name ?? "Nhân viên không xác định"} · {journey.title_snapshot}</h3>
                <p className="muted">{employee?.email} · v{journey.template_version} · bắt đầu {journey.start_date} · {journey.status}</p>
              </div>
              <strong>{percent}%</strong>
            </div>
            <progress aria-label={`Tiến độ ${employee?.display_name ?? "nhân viên"}`} max={100} value={percent} />
            <p className="muted">{completed}/{counted.length} hoạt động tính tiến độ · {overdue} quá hạn</p>
            {journeyActivities.map((activity) => {
              const canManage = journey.status === "active" && activity.status !== "removed";
              const history = (events ?? []).filter((event) => event.journey_activity_id === activity.id);
              return (
                <div className="inset-card stack" key={activity.id}>
                  <div className="portal-header">
                    <div>
                      <h4>{activity.title_snapshot}</h4>
                      <p className="muted">{activity.milestone_name_snapshot} · {activity.status}{isOverdue(activity) ? " · Quá hạn" : ""}{activity.is_required ? " · Bắt buộc" : ""}</p>
                    </div>
                    {activity.completion_source && <span>{activity.completion_source.replaceAll("_", " ")}</span>}
                  </div>
                  {activity.completion_note && <p className="muted">Ghi chú: {activity.completion_note}</p>}
                  {history.length > 0 && (
                    <details>
                      <summary>Lịch sử hoạt động ({history.length})</summary>
                      <ul>
                        {history.map((event) => {
                          const actor = profileMap.get(event.actor_id);
                          const eventData = event.event_data && typeof event.event_data === "object" ? event.event_data as Record<string, unknown> : {};
                          return <li key={event.id}>{new Date(event.created_at).toLocaleString("vi-VN")} · {actor?.display_name ?? "Tài khoản"} · {event.event_type}{typeof eventData.note === "string" ? ` · ${eventData.note}` : ""}</li>;
                        })}
                      </ul>
                    </details>
                  )}
                  {canManage && (
                    <form action={manageJourneyActivity} className="form-grid">
                      <input name="activity_id" type="hidden" value={activity.id} />
                      <label className="field">
                        <span>Thao tác</span>
                        <select defaultValue={activity.status === "completed" || activity.status === "waived" ? "reopen" : "complete"} name="action">
                          {activity.status === "completed" || activity.status === "waived" ? (
                            <option value="reopen">Mở lại</option>
                          ) : (
                            <><option value="complete">Đánh dấu hoàn thành</option><option value="waive">Miễn trừ</option></>
                          )}
                        </select>
                      </label>
                      <label className="field">
                        <span>Ghi chú kiểm toán</span>
                        <input maxLength={500} minLength={3} name="note" required />
                      </label>
                      <button type="submit">Lưu trạng thái</button>
                    </form>
                  )}
                </div>
              );
            })}
          </article>
        );
      })}
    </section>
  );
}
