"use server";

import { revalidatePath } from "next/cache";
import crypto from "node:crypto";
import { getSqlPool, sql } from "@/lib/db/sqlserver";
import { requireRole } from "@/features/auth/session";
import { hashPassword } from "@/lib/auth/password";

import type { UserRecord } from "./types";
export type { UserRecord };

/**
 * Lấy danh sách toàn bộ tài khoản trong hệ thống
 */
export async function getAllUsers(): Promise<UserRecord[]> {
  await requireRole("hr_admin");

  try {
    const pool = await getSqlPool();
    const result = await pool.request().query(`
      SELECT 
        p.Id AS id,
        p.Email AS email,
        p.DisplayName AS display_name,
        p.EmployeeCode AS employee_code,
        p.Role AS role,
        p.Office AS office,
        p.Department AS department,
        p.Position AS position,
        p.IsActive AS is_active,
        u.CreatedAt AS created_at
      FROM app.Profiles p
      INNER JOIN auth.Users u ON p.Id = u.Id
      ORDER BY u.CreatedAt DESC
    `);

    return result.recordset.map((row) => ({
      id: String(row.id),
      email: String(row.email),
      display_name: String(row.display_name),
      employee_code: row.employee_code ? String(row.employee_code) : null,
      role: row.role as "hr_admin" | "employee",
      office: row.office ? String(row.office) : null,
      department: row.department ? String(row.department) : null,
      position: row.position ? String(row.position) : null,
      is_active: Boolean(row.is_active),
      created_at: new Date(row.created_at).toLocaleString("vi-VN"),
    }));
  } catch (err) {
    console.error("Lỗi lấy danh sách tài khoản:", err);
    throw new Error("Không thể tải danh sách tài khoản từ SQL Server.");
  }
}

/**
 * Admin tạo tài khoản mới (Hỗ trợ cả HR Admin và Employee)
 */
export async function createUserByAdmin(
  prevState: unknown,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const currentAdmin = await requireRole("hr_admin");

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const displayName = String(formData.get("displayName") || "").trim();
  const rawRole = String(formData.get("role") || "employee");
  const role = rawRole === "hr_admin" ? "hr_admin" : "employee";
  const employeeCode = String(formData.get("employeeCode") || "").trim() || null;
  const office = String(formData.get("office") || "").trim() || "Trụ sở Hà Nội";
  const department = String(formData.get("department") || "").trim() || "Logistics Operations";
  const position = String(formData.get("position") || "").trim() || "Chuyên viên";

  if (!email || !password || !displayName) {
    return { success: false, error: "Vui lòng nhập đầy đủ Email, Mật khẩu và Họ tên." };
  }

  if (password.length < 6) {
    return { success: false, error: "Mật khẩu tối thiểu 6 ký tự." };
  }

  try {
    const pool = await getSqlPool();

    // Kiểm tra trùng email
    const checkRes = await pool
      .request()
      .input("email", sql.NVarChar(256), email)
      .query(`SELECT Id FROM auth.Users WHERE LOWER(Email) = LOWER(@email)`);

    if (checkRes.recordset.length > 0) {
      return { success: false, error: "Email này đã tồn tại trong hệ thống." };
    }

    const newUserId = crypto.randomUUID();
    const hashedPassword = hashPassword(password);
    const code = employeeCode || (role === "hr_admin" ? "HR" : "EMP") + Math.floor(1000 + Math.random() * 9000);

    const tx = new sql.Transaction(pool);
    await tx.begin();

    try {
      const reqAuth = new sql.Request(tx);
      await reqAuth
        .input("id", sql.UniqueIdentifier, newUserId)
        .input("email", sql.NVarChar(256), email)
        .input("passwordHash", sql.NVarChar(256), hashedPassword)
        .query(`
          INSERT INTO auth.Users (Id, Email, PasswordHash, IsEmailConfirmed)
          VALUES (@id, @email, @passwordHash, 1)
        `);

      const reqProfile = new sql.Request(tx);
      await reqProfile
        .input("id", sql.UniqueIdentifier, newUserId)
        .input("email", sql.NVarChar(256), email)
        .input("displayName", sql.NVarChar(160), displayName)
        .input("employeeCode", sql.NVarChar(50), code)
        .input("role", sql.NVarChar(20), role)
        .input("office", sql.NVarChar(120), office)
        .input("department", sql.NVarChar(120), department)
        .input("position", sql.NVarChar(120), position)
        .query(`
          INSERT INTO app.Profiles (Id, Email, DisplayName, EmployeeCode, Role, Office, Department, Position, IsActive)
          VALUES (@id, @email, @displayName, @employeeCode, @role, @office, @department, @position, 1)
        `);

      // Nếu là nhân viên, tự động gán lộ trình Onboarding nếu có template
      if (role === "employee") {
        const tplRes = await new sql.Request(tx).query(`
          SELECT TOP 1 Id FROM app.Templates WHERE Status = N'published' ORDER BY CreatedAt DESC
        `);

        if (tplRes.recordset.length > 0) {
          const defaultTplId = tplRes.recordset[0].Id;
          const assignReq = new sql.Request(tx);
          assignReq.input("TemplateId", sql.UniqueIdentifier, defaultTplId);
          assignReq.input("EmployeeId", sql.UniqueIdentifier, newUserId);
          assignReq.input("StartDate", sql.Date, new Date());
          assignReq.input("ActorId", sql.UniqueIdentifier, currentAdmin.id);
          assignReq.output("JourneyId", sql.UniqueIdentifier);

          try {
            await assignReq.execute("app.sp_AssignTemplateToEmployee");
          } catch (e) {
            console.warn("Chưa thể tự gán lộ trình cho tài khoản mới:", e);
          }
        }
      }

      await tx.commit();
    } catch (txErr) {
      await tx.rollback();
      throw txErr;
    }

    revalidatePath("/admin/users");
    revalidatePath("/admin/employees");
    return { success: true };
  } catch (err) {
    console.error("Lỗi tạo tài khoản từ Admin:", err);
    return { success: false, error: "Không thể tạo tài khoản lúc này." };
  }
}

/**
 * Admin xóa tài khoản khỏi hệ thống (Cả Admin lẫn User)
 */
export async function deleteUserByAdmin(
  targetUserId: string,
): Promise<{ success: boolean; error?: string }> {
  const currentAdmin = await requireRole("hr_admin");

  if (targetUserId.toLowerCase() === currentAdmin.id.toLowerCase()) {
    return { success: false, error: "Bạn không thể tự xóa tài khoản của chính mình." };
  }

  try {
    const pool = await getSqlPool();

    const tx = new sql.Transaction(pool);
    await tx.begin();

    try {
      const req = new sql.Request(tx);
      req.input("targetId", sql.UniqueIdentifier, targetUserId);

      // Xóa các bảng liên kết để tránh lỗi foreign key constraint
      await req.query(`
        DELETE FROM audit.ActivityEvents WHERE ActorId = @targetId;
        DELETE FROM app.JourneyActivities WHERE JourneyId IN (SELECT Id FROM app.EmployeeJourneys WHERE EmployeeId = @targetId);
        DELETE FROM app.EmployeeJourneys WHERE EmployeeId = @targetId;
        DELETE FROM app.EmployeeFeedbacks WHERE EmployeeId = @targetId;
        DELETE FROM app.Profiles WHERE Id = @targetId;
        DELETE FROM auth.Users WHERE Id = @targetId;
      `);

      await tx.commit();
    } catch (txErr) {
      await tx.rollback();
      throw txErr;
    }

    revalidatePath("/admin/users");
    revalidatePath("/admin/employees");
    return { success: true };
  } catch (err) {
    console.error("Lỗi xóa tài khoản:", err);
    return { success: false, error: "Không thể xóa tài khoản này." };
  }
}

/**
 * Bật / Tắt trạng thái kích hoạt tài khoản
 */
export async function toggleUserStatus(
  targetUserId: string,
): Promise<{ success: boolean; error?: string }> {
  const currentAdmin = await requireRole("hr_admin");

  if (targetUserId.toLowerCase() === currentAdmin.id.toLowerCase()) {
    return { success: false, error: "Không thể tự vô hiệu hóa tài khoản của chính mình." };
  }

  try {
    const pool = await getSqlPool();
    await pool
      .request()
      .input("targetId", sql.UniqueIdentifier, targetUserId)
      .query(`
        UPDATE app.Profiles
        SET IsActive = CASE WHEN IsActive = 1 THEN 0 ELSE 1 END,
            UpdatedAt = SYSUTCDATETIME()
        WHERE Id = @targetId
      `);

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err) {
    console.error("Lỗi cập nhật trạng thái tài khoản:", err);
    return { success: false, error: "Không thể cập nhật trạng thái." };
  }
}
