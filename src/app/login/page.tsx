import Link from "next/link";
import { LoginForm } from "@/features/auth/login-form";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { BeeMascot } from "@/components/ui/BeeMascot";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{ setup?: string; account?: string; registered?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--color-bg-canvas)",
        padding: "2rem 1rem",
        backgroundImage:
          "radial-gradient(circle at 15% 15%, rgba(255, 90, 0, 0.06) 0%, transparent 45%), radial-gradient(circle at 85% 85%, rgba(255, 201, 40, 0.08) 0%, transparent 45%), linear-gradient(180deg, #FFFFFF 0%, #FAFAF9 100%)",
        position: "relative",
      }}
    >
      <main
        className="card"
        style={{
          width: "min(100%, 560px)",
          padding: "clamp(1.75rem, 4vw, 2.75rem)",
          boxShadow: "0 20px 45px -10px rgba(255, 90, 0, 0.1), 0 4px 16px rgba(37, 37, 37, 0.04)",
          border: "1px solid rgba(255, 90, 0, 0.18)",
          borderRadius: "var(--radius-xl)",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          {/* Logo Bee Logistics Sắc Nét */}
          <div style={{ display: "inline-block", marginBottom: "1rem" }}>
            <BrandLogo size="md" href="/" />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
            <h1 style={{ fontSize: "1.7rem", color: "var(--color-text-main)", margin: 0 }}>
              Đăng nhập cổng Onboarding
            </h1>
            <BeeMascot size="sm" />
          </div>

          <p className="muted" style={{ fontSize: "0.92rem", maxWidth: "420px", margin: "0.25rem auto 0" }}>
            Hệ thống tiếp nhận & quản trị lộ trình nhân sự Bee Logistics
          </p>
        </div>

        {params.registered === "success" && (
          <div className="notice notice-success" role="status" style={{ marginBottom: "1.25rem" }}>
            🎉 <strong>Đăng ký thành công!</strong> Hãy đăng nhập bằng tài khoản nhân viên vừa tạo.
          </div>
        )}

        {params.account === "unavailable" && (
          <div className="notice notice-danger" role="alert" style={{ marginBottom: "1.25rem" }}>
            ⚠️ Tài khoản chưa được kích hoạt hoặc đã bị tạm khóa. Vui lòng liên hệ HR Admin.
          </div>
        )}

        <LoginForm enabled={true} />

        <div
          style={{
            marginTop: "1.75rem",
            textAlign: "center",
            borderTop: "1px solid var(--color-border)",
            paddingTop: "1.25rem",
          }}
        >
          <Link
            href="/"
            className="muted"
            style={{
              fontSize: "0.88rem",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              transition: "color var(--transition-fast)",
            }}
          >
            ← Quay về trang giới thiệu BeeWelcome
          </Link>
        </div>
      </main>
    </div>
  );
}
