import Link from "next/link";
import { requireRole } from "@/features/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  await requireRole("hr_admin");
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <p className="notice">Cần cấu hình Supabase để tải dashboard.</p>;

  const { data: journeys, error: journeyError } = await supabase
    .from("employee_journeys")
    .select("id, employee_id, title_snapshot, status, start_date, assigned_at")
    .order("assigned_at", { ascending: false })
    .limit(100);
  if (journeyError) throw new Error("Không tải được dữ liệu dashboard.");

  const journeyIds = (journeys ?? []).map((journey) => journey.id);
  const [profileResult, activityResult, feedbackResult] = journeyIds.length
    ? await Promise.all([
        supabase.from("profiles").select("id, display_name, email"),
        supabase
          .from("journey_activities")
          .select("id, journey_id, title_snapshot, include_in_progress, status, available_at, due_at")
          .in("journey_id", journeyIds),
        supabase.from("ux_feedback").select("id, employee_id, category, message, submitted_at").order("submitted_at", { ascending: false }).limit(5),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        await supabase.from("ux_feedback").select("id, employee_id, category, message, submitted_at").order("submitted_at", { ascending: false }).limit(5),
      ];
  if (profileResult.error || activityResult.error || feedbackResult.error) {
    throw new Error("Không tải được tiến độ hoặc phản hồi.");
  }

  const profileMap = new Map((profileResult.data ?? []).map((profile) => [profile.id, profile]));
  const activities = activityResult.data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const activeCount = (journeys ?? []).filter((journey) => journey.status === "active").length;
  const overdueCount = activities.filter((activity) =>
    activity.due_at && activity.due_at < today && !["completed", "waived", "removed"].includes(activity.status),
  ).length;
  const employeeCount = new Set((journeys ?? []).map((journey) => journey.employee_id)).size;

  return (
    <section className="stack">
      <header className="card stack">
        <div className="portal-header">
          <div>
            <h2>Dashboard</h2>
            <p className="muted">Tổng quan tối đa 100 hành trình gần nhất.</p>
          </div>
          <Link href="/admin/progress">Mở quản lý tiến độ</Link>
        </div>
        <div className="summary-grid">
          <article className="inset-card"><strong>{employeeCount}</strong><p>Nhân viên có hành trình</p></article>
          <article className="inset-card"><strong>{activeCount}</strong><p>Hành trình đang hoạt động</p></article>
          <article className="inset-card"><strong>{overdueCount}</strong><p>Hoạt động quá hạn</p></article>
          <article className="inset-card"><strong>{(journeys ?? []).length}</strong><p>Hành trình gần nhất</p></article>
        </div>
      </header>

      <article className="card stack">
        <div className="portal-header"><h3>Hành trình gần đây</h3><Link href="/admin/employees">Giao hành trình</Link></div>
        {(journeys ?? []).length === 0 ? <p>Chưa có hành trình được giao.</p> : (
          <div className="table-scroll"><table>
            <thead><tr><th>Nhân viên</th><th>Hành trình</th><th>Trạng thái</th><th>Hoạt động</th><th>Tiến độ</th></tr></thead>
            <tbody>{(journeys ?? []).slice(0, 20).map((journey) => {
              const employee = profileMap.get(journey.employee_id);
              const counted = activities.filter((activity) => activity.journey_id === journey.id && activity.include_in_progress && activity.available_at <= today && activity.status !== "removed");
              const complete = counted.filter((activity) => ["completed", "waived"].includes(activity.status)).length;
              const progress = counted.length ? Math.round((complete / counted.length) * 100) : 0;
              return <tr key={journey.id}>
                <td>{employee?.display_name ?? "Không rõ"}<br /><span className="muted">{employee?.email}</span></td>
                <td>{journey.title_snapshot}<br /><span className="muted">Bắt đầu {journey.start_date}</span></td>
                <td>{journey.status}</td>
                <td>{complete}/{counted.length}</td>
                <td><progress aria-label={`Tiến độ ${employee?.display_name ?? "nhân viên"}`} max={100} value={progress} /> {progress}%</td>
              </tr>;
            })}</tbody>
          </table></div>
        )}
      </article>

      <article className="card stack">
        <h3>Phản hồi sản phẩm mới nhất</h3>
        {(feedbackResult.data ?? []).length === 0 ? <p>Chưa có phản hồi.</p> : (feedbackResult.data ?? []).map((feedback) => (
          <div className="inset-card" key={feedback.id}>
            <p><strong>{feedback.category}</strong> · {profileMap.get(feedback.employee_id)?.display_name ?? "Nhân viên"} · {new Date(feedback.submitted_at).toLocaleDateString("vi-VN")}</p>
            <p>{feedback.message}</p>
          </div>
        ))}
      </article>
      <p className="notice">Prototype chỉ sử dụng tài khoản và dữ liệu giả lập. Dashboard chỉ đọc 100 hành trình gần nhất.</p>
    </section>
  );
}
