"use server";

import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { getSqlPool, sql } from "@/lib/db/sqlserver";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";

export type AuthActionResult = {
  success: boolean;
  error?: string;
  redirectUrl?: string;
};

export async function loginAction(
  firstArg: unknown,
  secondArg?: unknown,
): Promise<AuthActionResult> {
  try {
    let formData: FormData | null = null;
    if (firstArg instanceof FormData) {
      formData = firstArg;
    } else if (secondArg instanceof FormData) {
      formData = secondArg;
    }

    if (!formData) {
      return { success: false, error: "Dữ liệu biểu mẫu không hợp lệ." };
    }

    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");

    if (!email || !password) {
      return { success: false, error: "Vui lòng nhập đầy đủ email và mật khẩu." };
    }

    const pool = await getSqlPool();

    // 1. Kiểm tra tài khoản trong auth.Users
    const userRes = await pool
      .request()
      .input("email", sql.NVarChar(256), email)
      .query(`
        SELECT u.Id, u.Email, u.PasswordHash, p.Role, p.DisplayName, p.IsActive
        FROM auth.Users u
        INNER JOIN app.Profiles p ON u.Id = p.Id
        WHERE LOWER(u.Email) = LOWER(@email)
      `);

    const user = userRes.recordset[0];

    if (!user) {
      return {
        success: false,
        error: "Email hoặc mật khẩu không chính xác.",
      };
    }

    if (!user.IsActive) {
      return {
        success: false,
        error: "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên HR.",
      };
    }

    // 2. So khớp mật khẩu đã hash
    const isValid = verifyPassword(password, user.PasswordHash);
    if (!isValid) {
      return {
        success: false,
        error: "Email hoặc mật khẩu không chính xác.",
      };
    }

    // 3. Khởi tạo phiên làm việc bảo mật
    await createSession(String(user.Id));

    const redirectUrl =
      user.Role === "hr_admin" ? "/admin/dashboard" : "/roadmap";

    console.log(">> [SERVER ACTION SUCCESS] email:", email, "role:", user.Role, "redirectUrl:", redirectUrl);

    return {
      success: true,
      redirectUrl,
    };
  } catch (err) {
    console.error("Lỗi đăng nhập SQL Server:", err);
    return {
      success: false,
      error: "Không thể kết nối đến máy chủ CSDL SQL Server. Hãy kiểm tra dịch vụ MSSQLSERVER.",
    };
  }
}

/**
 * Đăng ký tài khoản mới cho nhân viên (Quyền mặc định và duy nhất: employee)
 */
export async function registerAction(
  prevState: unknown,
  formData: FormData,
): Promise<AuthActionResult> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  const displayName = String(formData.get("displayName") || "").trim();
  const department = String(formData.get("department") || "").trim() || "Logistics Operations";
  const position = String(formData.get("position") || "").trim() || "Nhân viên mới";
  const office = String(formData.get("office") || "").trim() || "Văn phòng chính";

  // 1. Kiểm tra validation cơ bản
  if (!email || !password || !displayName) {
    return { success: false, error: "Vui lòng điền đầy đủ các thông tin bắt buộc (*)." };
  }

  if (password.length < 6) {
    return { success: false, error: "Mật khẩu phải có tối thiểu 6 ký tự." };
  }

  if (password !== confirmPassword) {
    return { success: false, error: "Mật khẩu xác nhận không khớp." };
  }

  // BẢO MẬT TUYỆT ĐỐI: Bắt buộc role là employee (nhân viên thường)
  const role = "employee";

  try {
    const pool = await getSqlPool();

    // 2. Kiểm tra email đã tồn tại hay chưa
    const checkRes = await pool
      .request()
      .input("email", sql.NVarChar(256), email)
      .query(`SELECT Id FROM auth.Users WHERE LOWER(Email) = LOWER(@email)`);

    if (checkRes.recordset.length > 0) {
      return { success: false, error: "Email này đã được đăng ký trong hệ thống." };
    }

    // 3. Tạo ID ngẫu nhiên và hash mật khẩu
    const newUserId = crypto.randomUUID();
    const hashedPassword = hashPassword(password);
    const empCode = "EMP" + Math.floor(1000 + Math.random() * 9000);

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
        .input("employeeCode", sql.NVarChar(50), empCode)
        .input("role", sql.NVarChar(20), role)
        .input("office", sql.NVarChar(120), office)
        .input("department", sql.NVarChar(120), department)
        .input("position", sql.NVarChar(120), position)
        .query(`
          INSERT INTO app.Profiles (Id, Email, DisplayName, EmployeeCode, Role, Office, Department, Position, IsActive)
          VALUES (@id, @email, @displayName, @employeeCode, @role, @office, @department, @position, 1)
        `);

      // 4. Tự động gán Template Onboarding mặc định (nếu có sẵn template công ty)
      const tplRes = await new sql.Request(tx).query(`
        SELECT TOP 1 Id FROM app.Templates WHERE Status = N'published' ORDER BY CreatedAt DESC
      `);

      if (tplRes.recordset.length > 0) {
        const defaultTplId = tplRes.recordset[0].Id;
        const adminId = "11111111-1111-1111-1111-111111111111"; // Default Admin Actor

        const assignReq = new sql.Request(tx);
        assignReq.input("TemplateId", sql.UniqueIdentifier, defaultTplId);
        assignReq.input("EmployeeId", sql.UniqueIdentifier, newUserId);
        assignReq.input("StartDate", sql.Date, new Date());
        assignReq.input("ActorId", sql.UniqueIdentifier, adminId);
        assignReq.output("JourneyId", sql.UniqueIdentifier);

        try {
          await assignReq.execute("app.sp_AssignTemplateToEmployee");
        } catch (assignErr) {
          console.warn("Chưa thể tự gán lộ trình tự động (có thể gán sau):", assignErr);
        }
      }

      await tx.commit();
    } catch (txErr) {
      await tx.rollback();
      throw txErr;
    }

    // 5. Tự động đăng nhập và chuyển sang trang lộ trình
    await createSession(newUserId);

    return {
      success: true,
      redirectUrl: "/roadmap",
    };
  } catch (err) {
    console.error("Lỗi đăng ký tài khoản:", err);
    return {
      success: false,
      error: "Đăng ký không thành công. Hãy thử lại hoặc liên hệ quản trị viên.",
    };
  }
}

/**
 * Đăng xuất khỏi hệ thống
 */
export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/login");
}
