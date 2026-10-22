import Link from "next/link";
import { requireRole } from "@/features/auth/session";
import { getSqlPool } from "@/lib/db/sqlserver";

export default async function AdminDashboardPage() {
  await requireRole("hr_admin");
  const pool = await getSqlPool();

  const [journeysRes, profilesRes, activitiesRes, feedbackRes] = await Promise.all([
    pool.request().query(`
      SELECT 
        Id AS id, 
        EmployeeId AS employee_id, 
        TitleSnapshot AS title_snapshot, 
        Status AS status, 
        CONVERT(NVARCHAR(10), StartDate, 23) AS start_date, 
        AssignedAt AS assigned_at
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
        IncludeInProgress AS include_in_progress, 
        Status AS status, 
        CONVERT(NVARCHAR(10), AvailableAt, 23) AS available_at, 
        CONVERT(NVARCHAR(10), DueAt, 23) AS due_at
      FROM app.JourneyActivities
    `),
    pool.request().query(`
      SELECT TOP 5 
        Id AS id, 
        EmployeeId AS employee_id, 
        Category AS category, 
        Message AS message, 
        SubmittedAt AS submitted_at
      FROM app.UxFeedback
      ORDER BY SubmittedAt DESC
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
    include_in_progress: Boolean(a.include_in_progress),
  }));

  const feedbacks = feedbackRes.recordset.map((f) => ({
    id: String(f.id),
    employee_id: String(f.employee_id),
    category: String(f.category),
    message: String(f.message),
    submitted_at: f.submitted_at,
  }));
  const today = new Date().toISOString().slice(0, 10);
  const activeCount = (journeys ?? []).filter((journey) => journey.status === "active").length;
  const overdueCount = activities.filter((activity) =>
    activity.due_at && activity.due_at < today && !["completed", "waived", "removed"].includes(activity.status),
  ).length;
  const employeeCount = new Set((journeys ?? []).map((journey) => journey.employee_id)).size;

  return (
    <div className="stack" style={{ gap: "2rem" }}>
      {/* Top Metric Section */}
      <section className="stack" style={{ gap: "1.25rem" }}>
        <div className="flex-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
              <span className="badge badge-primary">Trung Tâm Điều Hành HR</span>
              <span className="badge badge-accent">SQL Server Active</span>
            </div>
            <h1 style={{ fontSize: "1.85rem", color: "var(--color-text-main)", margin: 0 }}>
              Bảng Điều Khiển Onboarding
            </h1>
            <p className="muted" style={{ fontSize: "0.92rem", marginTop: "0.25rem" }}>
              Theo dõi trực quan tiến độ hội nhập, chất lượng đào tạo và phản hồi từ nhân viên mới.
            </p>
          </div>

          <Link href="/admin/progress" className="btn btn-primary">
            Quản Lý Chi Tiết Tiến Độ ➔
          </Link>
        </div>

        {/* 4 Thẻ KPI Bento Tinh Tế */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem" }}>
          <div className="card card-interactive" style={{ borderLeft: "4px solid var(--color-primary)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="muted" style={{ fontSize: "0.85rem", fontWeight: 700 }}>NHÂN VIÊN ONBOARDING</span>
              <span style={{ fontSize: "1.25rem" }}>👥</span>
            </div>
            <div style={{ fontSize: "2.25rem", fontWeight: 800, color: "var(--color-primary)", margin: "0.35rem 0" }} className="tabular-numbers">
              {employeeCount}
            </div>
            <span className="muted" style={{ fontSize: "0.78rem" }}>Đã được phân bổ lộ trình</span>
          </div>

          <div className="card card-interactive" style={{ borderLeft: "4px solid var(--status-success)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="muted" style={{ fontSize: "0.85rem", fontWeight: 700 }}>HÀNH TRÌNH ĐANG CHẠY</span>
              <span style={{ fontSize: "1.25rem" }}>🚀</span>
            </div>
            <div style={{ fontSize: "2.25rem", fontWeight: 800, color: "var(--status-success)", margin: "0.35rem 0" }} className="tabular-numbers">
              {activeCount}
            </div>
            <span className="muted" style={{ fontSize: "0.78rem" }}>Đang trong tiến trình học tập</span>
          </div>

          <div className="card card-interactive" style={{ borderLeft: "4px solid var(--status-danger)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="muted" style={{ fontSize: "0.85rem", fontWeight: 700 }}>NHIỆM VỤ QUÁ HẠN</span>
              <span style={{ fontSize: "1.25rem" }}>⚠️</span>
            </div>
            <div style={{ fontSize: "2.25rem", fontWeight: 800, color: overdueCount > 0 ? "var(--status-danger)" : "var(--color-text-main)", margin: "0.35rem 0" }} className="tabular-numbers">
              {overdueCount}
            </div>
            <span className="muted" style={{ fontSize: "0.78rem" }}>Cần nhắc nhở nhân sự</span>
          </div>

          <div className="card card-interactive" style={{ borderLeft: "4px solid var(--color-accent-dark)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="muted" style={{ fontSize: "0.85rem", fontWeight: 700 }}>TỔNG SỐ LỘ TRÌNH</span>
              <span style={{ fontSize: "1.25rem" }}>📋</span>
            </div>
            <div style={{ fontSize: "2.25rem", fontWeight: 800, color: "var(--color-accent-dark)", margin: "0.35rem 0" }} className="tabular-numbers">
              {(journeys ?? []).length}
            </div>
            <span className="muted" style={{ fontSize: "0.78rem" }}>Hành trình lưu vết toàn hệ thống</span>
          </div>
        </div>
      </section>

      {/* Bảng Tiến Độ Nhân Viên Gần Đây */}
      <section className="card stack" style={{ gap: "1.25rem" }}>
        <div className="flex-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.35rem", color: "var(--color-text-main)", margin: 0 }}>
              Tiến Độ Nhân Viên Gần Đây
            </h2>
            <p className="muted" style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
              Danh sách 20 hành trình onboarding gần nhất
            </p>
          </div>
          <Link href="/admin/employees" className="btn btn-secondary">
            + Gán lộ trình mới
          </Link>
        </div>

        {(journeys ?? []).length === 0 ? (
          <div className="inset-card" style={{ textAlign: "center", padding: "3rem" }}>
            <p className="muted">Chưa có hành trình nào được giao cho nhân viên.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Nhân Viên</th>
                  <th>Lộ Trình</th>
                  <th>Trạng Thái</th>
                  <th>Nhiệm Vụ</th>
                  <th>Tiến Độ Hoàn Thành</th>
                </tr>
              </thead>
              <tbody>
                {(journeys ?? []).slice(0, 20).map((journey) => {
                  const employee = profileMap.get(journey.employee_id);
                  const counted = activities.filter(
                    (activity) => activity.journey_id === journey.id && activity.include_in_progress && activity.available_at <= today && activity.status !== "removed",
                  );
                  const complete = counted.filter((activity) => ["completed", "waived"].includes(activity.status)).length;
                  const progress = counted.length ? Math.round((complete / counted.length) * 100) : 0;

                  return (
                    <tr key={journey.id}>
                      <td>
                        <strong style={{ display: "block", color: "var(--color-text-main)" }}>
                          {employee?.display_name ?? "Không rõ"}
                        </strong>
                        <span className="muted" style={{ fontSize: "0.78rem" }}>{employee?.email}</span>
                      </td>

                      <td>
                        <span style={{ fontWeight: 600 }}>{journey.title_snapshot}</span>
                        <span className="muted" style={{ display: "block", fontSize: "0.78rem" }}>Bắt đầu: {journey.start_date}</span>
                      </td>

                      <td>
                        <span className={`badge ${journey.status === "active" ? "badge-primary" : "badge-success"}`}>
                          {journey.status}
                        </span>
                      </td>

                      <td style={{ fontWeight: 700 }} className="tabular-numbers">
                        {complete} / {counted.length}
                      </td>

                      <td style={{ minWidth: "180px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div style={{ flex: 1, height: "8px", backgroundColor: "var(--color-bg-subtle)", borderRadius: "9999px", overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${progress}%`,
                                height: "100%",
                                backgroundColor: progress === 100 ? "var(--status-success)" : "var(--color-primary)",
                                borderRadius: "9999px",
                              }}
                            />
                          </div>
                          <strong className="tabular-numbers" style={{ fontSize: "0.88rem", width: "42px", textAlign: "right" }}>
                            {progress}%
                          </strong>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Phản Hồi Mới Nhất Từ Nhân Viên */}
      <section className="card stack" style={{ gap: "1rem" }}>
        <h3 style={{ fontSize: "1.25rem", color: "var(--color-text-main)", margin: 0 }}>
          💬 Phản Hồi Trải Nghiệm Mới Nhất
        </h3>
        {feedbacks.length === 0 ? (
          <p className="muted" style={{ padding: "1rem 0" }}>Chưa có phản hồi mới nào từ nhân sự.</p>
        ) : (
          <div className="stack" style={{ gap: "0.75rem" }}>
            {feedbacks.map((feedback) => (
              <div key={feedback.id} className="inset-card">
                <div className="flex-between" style={{ marginBottom: "0.4rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span className="badge badge-accent">{feedback.category}</span>
                    <strong style={{ fontSize: "0.92rem" }}>
                      {profileMap.get(feedback.employee_id)?.display_name ?? "Nhân viên"}
                    </strong>
                  </div>
                  <span className="muted" style={{ fontSize: "0.78rem" }}>
                    {new Date(feedback.submitted_at).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                <p style={{ fontSize: "0.92rem", color: "var(--color-text-muted)", margin: 0, lineHeight: 1.5 }}>
                  {feedback.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
