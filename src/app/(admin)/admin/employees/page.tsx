import { assignJourney } from "@/features/admin-operations/actions";
import { requireRole } from "@/features/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <p className="notice">Cần cấu hình Supabase để tải nhân viên.</p>;

  const [employeeResult, templateResult, journeyResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, email, employee_code, office, department, position, audience_group, start_date")
      .eq("role", "employee")
      .eq("is_active", true)
      .order("display_name"),
    supabase
      .from("templates")
      .select("id, name, scope_type, scope_value, version_number")
      .eq("status", "published")
      .order("name"),
    supabase
      .from("employee_journeys")
      .select("id, employee_id, title_snapshot, template_version, start_date, status")
      .order("assigned_at", { ascending: false }),
  ]);

  if (employeeResult.error || templateResult.error || journeyResult.error) {
    throw new Error("Không tải được danh sách nhân viên hoặc hành trình.");
  }
  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className="stack">
      <header className="card stack">
        <h2>Nhân viên và giao hành trình</h2>
        <p className="muted">Tài khoản được tạo qua quy trình provisioning có kiểm soát. Tại đây, HR Admin gán template đã xuất bản cho nhân viên đang hoạt động.</p>
        {params.assigned && <p role="status">Hành trình đã được gán hoặc đã tồn tại cho phiên bản này.</p>}
        {params.error && <p className="error-text" role="alert">Không thể gán hành trình. Kiểm tra ngày bắt đầu, phiên bản template và phạm vi nhân viên.</p>}
      </header>

      {(employeeResult.data ?? []).length === 0 ? (
        <article className="card"><p>Chưa có nhân viên đang hoạt động. Tạo tài khoản bằng scripts/provision-demo-accounts.ps1.</p></article>
      ) : (employeeResult.data ?? []).map((employee) => {
        const journeys = (journeyResult.data ?? []).filter((journey) => journey.employee_id === employee.id);
        return (
          <article className="card stack" key={employee.id}>
            <div>
              <h3>{employee.display_name}</h3>
              <p className="muted">{employee.employee_code ?? "Chưa có mã nhân viên"} · {employee.email}</p>
              <p className="muted">{audience(employee) || "Chưa cấu hình thuộc tính phạm vi"}{employee.start_date ? ` · Bắt đầu ${employee.start_date}` : ""}</p>
            </div>
            {journeys.length > 0 && (
              <details>
                <summary>Hành trình hiện có ({journeys.length})</summary>
                <ul>
                  {journeys.map((journey) => <li key={journey.id}>{journey.title_snapshot} · v{journey.template_version} · {journey.status} · {journey.start_date}</li>)}
                </ul>
              </details>
            )}
            <form action={assignJourney} className="form-grid">
              <input name="employee_id" type="hidden" value={employee.id} />
              <label className="field">
                <span>Template đã xuất bản</span>
                <select defaultValue="" name="template_id" required>
                  <option disabled value="">Chọn template</option>
                  {(templateResult.data ?? []).map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} · v{template.version_number} · {template.scope_type === "company" ? "Toàn công ty" : `${template.scope_type}: ${template.scope_value}`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Ngày bắt đầu</span>
                <input defaultValue={today} name="start_date" required type="date" />
              </label>
              <button disabled={(templateResult.data ?? []).length === 0} type="submit">Giao hành trình</button>
            </form>
          </article>
        );
      })}
    </section>
  );
}
