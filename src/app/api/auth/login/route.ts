import { NextResponse } from "next/server";
import { getSqlPool, sql } from "@/lib/db/sqlserver";
import { verifyPassword } from "@/lib/auth/password";
import { signSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let email = "";
    let password = "";

    if (contentType.includes("application/json")) {
      const json = await request.json();
      email = String(json.email || "").trim().toLowerCase();
      password = String(json.password || "");
    } else {
      const formData = await request.formData();
      email = String(formData.get("email") || "").trim().toLowerCase();
      password = String(formData.get("password") || "");
    }

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Vui lòng nhập đầy đủ email và mật khẩu." },
        { status: 400 },
      );
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
      return NextResponse.json(
        { success: false, error: "Email hoặc mật khẩu không chính xác." },
        { status: 401 },
      );
    }

    if (!user.IsActive) {
      return NextResponse.json(
        { success: false, error: "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ HR." },
        { status: 403 },
      );
    }

    // 2. So khớp mật khẩu đã mã hóa scrypt
    const isValid = verifyPassword(password, user.PasswordHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Email hoặc mật khẩu không chính xác." },
        { status: 401 },
      );
    }

    // 3. Khởi tạo session token bảo mật
    const token = signSessionToken(String(user.Id));
    const redirectUrl = user.Role === "hr_admin" ? "/admin/dashboard" : "/roadmap";

    const response = NextResponse.json({
      success: true,
      redirectUrl,
      role: user.Role,
      displayName: user.DisplayName,
    });

    // Thiết lập cookie HTTP-only chuẩn
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 ngày
    });

    return response;
  } catch (err) {
    console.error("Lỗi đăng nhập API:", err);
    return NextResponse.json(
      { success: false, error: "Không thể kết nối đến máy chủ CSDL SQL Server." },
      { status: 500 },
    );
  }
}
