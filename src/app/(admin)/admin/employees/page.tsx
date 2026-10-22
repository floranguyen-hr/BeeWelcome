import { assignJourney } from "@/features/admin-operations/actions";
import { requireRole } from "@/features/auth/session";
import { getSqlPool } from "@/lib/db/sqlserver";

type Props = {
  searchParams: Promise<{ error?: string; assigned?: string }>;
};

function audience(profile: {
  office: string | null;
  department: string | null;
  position: string | null;
  audience_group: string | null;
}) {
  return [profile.office, profile.department, profile.position, profile.audience_group]
    .filter(Boolean)
    .join(" · ");
}

export default async function EmployeesPage({ searchParams }: Props) {
  await requireRole("hr_admin");
  const params = await searchParams;
  const pool = await getSqlPool();

  const [employeeRes, templateRes, journeyRes] = await Promise.all([
    pool.request().query(`
      SELECT 
        Id AS id, 
        DisplayName AS display_name, 
        Email AS email, 
        EmployeeCode AS employee_code, 
        Office AS office, 
        Department AS department, 
        Position AS position, 
        AudienceGroup AS audience_group, 
        CONVERT(NVARCHAR(10), StartDate, 23) AS start_date
      FROM app.Profiles
      WHERE Role = N'employee' AND IsActive = 1
      ORDER BY DisplayName ASC
    `),
    pool.request().query(`
      SELECT 
        Id AS id, 
        Name AS name, 
        ScopeType AS scope_type, 
        ScopeValue AS scope_value, 
        VersionNumber AS version_number
      FROM app.Templates
      WHERE Status = N'published'
      ORDER BY Name ASC
    `),
    pool.request().query(`
      SELECT 
        Id AS id, 
        EmployeeId AS employee_id, 
        TitleSnapshot AS title_snapshot, 
        TemplateVersion AS template_version, 
        CONVERT(NVARCHAR(10), StartDate, 23) AS start_date, 
        Status AS status
      FROM app.EmployeeJourneys
      ORDER BY AssignedAt DESC
    `),
  ]);

  const employeeData = employeeRes.recordset.map((e) => ({
    ...e,
    id: String(e.id),
  }));

  const templateData = templateRes.recordset.map((t) => ({
    ...t,
    id: String(t.id),
  }));

  const journeyData = journeyRes.recordset.map((j) => ({
    ...j,
    id: String(j.id),
    employee_id: String(j.employee_id),
  }));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="stack" style={{ gap: "1.75rem" }}>
      <header className="card stack" style={{ gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className="badge badge-primary">Phân Bổ Đào Tạo</span>
          <span className="badge badge-accent">Onboarding Assignment</span>
        </div>
        <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Gán Lộ Trình Cho Nhân Viên</h1>
        <p className="muted" style={{ margin: 0 }}>
          Gán phiên bản template đã xuất bản cho nhân viên đang hoạt động. Quá trình này sẽ tạo một snapshot độc lập và bất biến cho lộ trình của nhân viên.
        </p>
        {params.assigned && (
          <div className="notice notice-success" role="status">
            🎉 Đã gán lộ trình đào tạo thành công cho nhân viên!
          </div>
        )}
        {params.error && (
          <div className="notice notice-danger" role="alert">
            ⚠️ Không thể gán hành trình. Hãy kiểm tra ngày bắt đầu, phiên bản template và phạm vi áp dụng.
          </div>
        )}
      </header>

      {employeeData.length === 0 ? (
        <article className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p className="muted">Chưa có nhân viên nào trong hệ thống. Hãy sang mục Quản lý Tài khoản (Users) để tạo tài khoản.</p>
        </article>
      ) : (
        <div className="stack" style={{ gap: "1.25rem" }}>
          {employeeData.map((employee) => {
            const journeys = journeyData.filter((journey) => journey.employee_id === employee.id);
            return (
              <article className="card stack" key={employee.id} style={{ gap: "1.25rem" }}>
                <div className="flex-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                      <span className="badge badge-primary">{employee.employee_code ?? "Mã NV: N/A"}</span>
                      {journeys.length > 0 ? (
                        <span className="badge badge-success">Đang có {journeys.length} lộ trình</span>
                      ) : (
                        <span className="badge badge-accent">Chưa có lộ trình</span>
                      )}
                    </div>
                    <h3 style={{ fontSize: "1.25rem", margin: "0.2rem 0" }}>{employee.display_name}</h3>
                    <p className="muted" style={{ fontSize: "0.88rem", margin: 0 }}>
                      📧 {employee.email} · 🏢 {audience(employee) || "Chưa cấu hình đơn vị"}
                      {employee.start_date ? ` · 📅 Bắt đầu: ${employee.start_date}` : ""}
                    </p>
                  </div>
                </div>

                {journeys.length > 0 && (
                  <details style={{ background: "var(--color-bg-subtle)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                    <summary style={{ fontWeight: 600, color: "var(--color-text-main)", cursor: "pointer" }}>
                      Xem các lộ trình đã gán ({journeys.length}) ▾
                    </summary>
                    <ul style={{ margin: "0.75rem 0 0.25rem 1.25rem", padding: 0, fontSize: "0.88rem" }}>
                      {journeys.map((journey) => (
                        <li key={journey.id} style={{ marginBottom: "0.35rem" }}>
                          <strong>{journey.title_snapshot}</strong> · Phiên bản v{journey.template_version} · Trạng thái:{" "}
                          <span className={`badge ${journey.status === "in_progress" ? "badge-primary" : "badge-success"}`}>
                            {journey.status}
                          </span>{" "}
                          · Ngày bắt đầu: {journey.start_date}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                <form
                  action={assignJourney}
                  className="form-grid"
                  style={{
                    borderTop: "1px dashed var(--color-border)",
                    paddingTop: "1rem",
                    alignItems: "flex-end",
                  }}
                >
                  <input name="employee_id" type="hidden" value={employee.id} />
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Chọn Template Lộ Trình</label>
                    <select defaultValue="" name="template_id" required className="form-select">
                      <option disabled value="">-- Chọn template muốn gán --</option>
                      {templateData.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name} (v{template.version_number}) · {template.scope_type === "company" ? "Toàn công ty" : `${template.scope_type}: ${template.scope_value}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Ngày bắt đầu hành trình</label>
                    <input defaultValue={today} name="start_date" required type="date" className="form-input" />
                  </div>

                  <div>
                    <button
                      disabled={templateData.length === 0}
                      type="submit"
                      className="btn btn-primary"
                      style={{ minHeight: "42px", width: "100%" }}
                    >
                      + Gán Lộ Trình
                    </button>
                  </div>
                </form>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
