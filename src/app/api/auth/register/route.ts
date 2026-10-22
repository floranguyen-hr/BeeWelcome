import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getSqlPool, sql } from "@/lib/db/sqlserver";
import { hashPassword } from "@/lib/auth/password";
import { signSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let email = "";
    let password = "";
    let confirmPassword = "";
    let displayName = "";
    let department = "Logistics Operations";
    let office = "Chi nhánh Đà Nẵng";
    let position = "Logistics Coordinator";

    if (contentType.includes("application/json")) {
      const json = await request.json();
      email = String(json.email || "").trim().toLowerCase();
      password = String(json.password || "");
      confirmPassword = String(json.confirmPassword || "");
      displayName = String(json.displayName || "").trim();
      department = String(json.department || "").trim() || department;
      office = String(json.office || "").trim() || office;
      position = String(json.position || "").trim() || position;
    } else {
      const formData = await request.formData();
      email = String(formData.get("email") || "").trim().toLowerCase();
      password = String(formData.get("password") || "");
      confirmPassword = String(formData.get("confirmPassword") || "");
      displayName = String(formData.get("displayName") || "").trim();
      department = String(formData.get("department") || "").trim() || department;
      office = String(formData.get("office") || "").trim() || office;
      position = String(formData.get("position") || "").trim() || position;
    }

    if (!email || !password || !displayName) {
      return NextResponse.json(
        { success: false, error: "Vui lòng điền đầy đủ các thông tin bắt buộc (*)." },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Mật khẩu phải có tối thiểu 6 ký tự." },
        { status: 400 },
      );
    }

    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: "Mật khẩu xác nhận không khớp." },
        { status: 400 },
      );
    }

    const pool = await getSqlPool();

    // 1. Kiểm tra email đã tồn tại hay chưa
    const checkRes = await pool
      .request()
      .input("email", sql.NVarChar(256), email)
      .query(`SELECT Id FROM auth.Users WHERE LOWER(Email) = LOWER(@email)`);

    if (checkRes.recordset.length > 0) {
      return NextResponse.json(
        { success: false, error: "Email này đã được đăng ký trong hệ thống." },
        { status: 409 },
      );
    }

    // 2. Tạo User & Profile mới
    const newUserId = crypto.randomUUID();
    const hashedPassword = hashPassword(password);
    const empCode = "EMP" + Math.floor(1000 + Math.random() * 9000);
    const role = "employee"; // BẢO MẬT: Đăng ký luôn là employee

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

      // 3. Tự động gán Template Onboarding mặc định (nếu có)
      const tplRes = await new sql.Request(tx).query(`
        SELECT TOP 1 Id FROM app.Templates WHERE Status = N'published' ORDER BY CreatedAt DESC
      `);

      if (tplRes.recordset.length > 0) {
        const defaultTplId = tplRes.recordset[0].Id;
        const adminId = "11111111-1111-1111-1111-111111111111";

        const assignReq = new sql.Request(tx);
        assignReq.input("TemplateId", sql.UniqueIdentifier, defaultTplId);
        assignReq.input("EmployeeId", sql.UniqueIdentifier, newUserId);
        assignReq.input("StartDate", sql.Date, new Date());
        assignReq.input("ActorId", sql.UniqueIdentifier, adminId);
        assignReq.output("JourneyId", sql.UniqueIdentifier);

        try {
          await assignReq.execute("app.sp_AssignTemplateToEmployee");
        } catch (assignErr) {
          console.warn("Chưa thể tự gán template ngay (sẽ được gán sau):", assignErr);
        }
      }

      await tx.commit();
    } catch (txErr) {
      await tx.rollback();
      throw txErr;
    }

    // 4. Ký token phiên và tạo cookie
    const token = signSessionToken(newUserId);
    const response = NextResponse.json({
      success: true,
      redirectUrl: "/roadmap",
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Lỗi API đăng ký:", err);
    return NextResponse.json(
      { success: false, error: "Đăng ký không thành công. Hãy thử lại hoặc liên hệ quản trị viên." },
      { status: 500 },
    );
  }
}
