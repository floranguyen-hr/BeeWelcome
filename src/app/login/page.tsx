import Link from "next/link";
import { LoginForm } from "@/features/auth/login-form";
import { getSupabasePublicConfig } from "@/lib/env";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{ setup?: string; account?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const configured = getSupabasePublicConfig() !== null;

  return (
    <main className="page-shell">
      <section className="card stack" aria-labelledby="login-heading">
        <p className="muted">Bee Logistics · Prototype dùng dữ liệu demo</p>
        <h1 id="login-heading">Đăng nhập onboarding</h1>
        <p className="muted">
          Dùng tài khoản cá nhân do quản trị viên khởi tạo. Không có chức năng
          đăng ký công khai.
        </p>

        {!configured && (
          <div className="notice" role="status">
            Chưa cấu hình Supabase. Hãy thiết lập các biến môi trường trong
            README trước khi đăng nhập.
          </div>
        )}
        {params.setup === "required" && (
          <div className="notice" role="status">
            Cần cấu hình kết nối Supabase trước khi dùng cổng đăng nhập.
          </div>
        )}
        {params.account === "unavailable" && (
          <div className="notice" role="status">
            Tài khoản chưa được cấp hồ sơ hoạt động. Hãy liên hệ quản trị viên
            demo.
          </div>
        )}

        <LoginForm enabled={configured} />
        <p className="muted">
          Đây là prototype. <Link href="/">Về trang giới thiệu</Link>
        </p>
      </section>
    </main>
  );
}
