import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { getSqlPool, sql } from "@/lib/db/sqlserver";

export type AppRole = "hr_admin" | "employee";

export type Profile = {
  id: string;
  email: string;
  display_name: string;
  employee_code: string | null;
  role: AppRole;
  office: string | null;
  department: string | null;
  position: string | null;
  is_active: boolean;
};

export type SessionProfileResult =
  | { status: "unconfigured" }
  | { status: "anonymous" }
  | { status: "unprovisioned" }
  | { status: "unavailable" }
  | { status: "inactive" }
  | { status: "authenticated"; profile: Profile };

export async function getSessionProfile(): Promise<SessionProfileResult> {
  const userId = await getSessionUserId();

  if (!userId) {
    return { status: "anonymous" };
  }

  try {
    const pool = await getSqlPool();
    const result = await pool
      .request()
      .input("userId", sql.UniqueIdentifier, userId)
      .query(`
        SELECT 
          Id AS id, 
          Email AS email, 
          DisplayName AS display_name, 
          EmployeeCode AS employee_code, 
          Role AS role, 
          Office AS office,
          Department AS department,
          Position AS position,
          IsActive AS is_active
        FROM app.Profiles
        WHERE Id = @userId
      `);

    const data = result.recordset[0];

    if (!data) {
      return { status: "unprovisioned" };
    }

    const profile: Profile = {
      id: String(data.id),
      email: String(data.email),
      display_name: String(data.display_name),
      employee_code: data.employee_code ? String(data.employee_code) : null,
      role: data.role as AppRole,
      office: data.office ? String(data.office) : null,
      department: data.department ? String(data.department) : null,
      position: data.position ? String(data.position) : null,
      is_active: Boolean(data.is_active),
    };

    if (!profile.is_active) {
      return { status: "inactive" };
    }

    return { status: "authenticated", profile };
  } catch (err) {
    console.error("Lỗi truy vấn hồ sơ từ SQL Server:", err);
    return { status: "unavailable" };
  }
}

export async function requireRole(role: AppRole): Promise<Profile> {
  const result = await getSessionProfile();

  if (result.status === "unconfigured") {
    redirect("/login?setup=required");
  }

  if (result.status === "anonymous") {
    redirect("/login");
  }

  if (result.status === "unprovisioned" || result.status === "inactive") {
    redirect("/login?account=unavailable");
  }

  if (result.status === "unavailable") {
    throw new Error("Không thể kết nối đến CSDL SQL Server lúc này. Hãy kiểm tra dịch vụ MSSQLSERVER.");
  }

  if (result.profile.role !== role) {
    redirect("/unauthorized");
  }

  return result.profile;
}
