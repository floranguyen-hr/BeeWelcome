import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/actions/auth";
import { requireRole } from "@/features/auth/session";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { WelcomeHeader } from "@/components/ui/WelcomeHeader";

export const dynamic = "force-dynamic";

export default async function EmployeeLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const sessionProfile = await requireRole("employee");

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--color-bg-canvas)" }}>
      {/* Top Glassmorphism Navigation Bar */}
      <header className="glass-panel" style={{ position: "sticky", top: 0, zIndex: 50 }}>
        <div
          className="portal-container"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "0.6rem",
            paddingBottom: "0.6rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <BrandLogo size="sm" href="/roadmap" />
            <div style={{ height: "24px", width: "1px", background: "var(--color-border)" }} />
            <span className="badge badge-primary">
              Cổng Nhân Viên
            </span>
          </div>

          {/* User Info & Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ textAlign: "right" }}>
              <strong style={{ fontSize: "0.9rem", display: "block", color: "var(--color-text-main)" }}>
                {sessionProfile.display_name}
              </strong>
              <span className="muted" style={{ fontSize: "0.75rem" }}>
                {sessionProfile.position || "Nhân viên mới"}
              </span>
            </div>

            <form action={signOut}>
              <button
                type="submit"
                className="btn btn-secondary"
                style={{
                  minHeight: "36px",
                  padding: "0.4rem 0.85rem",
                  fontSize: "0.85rem",
                  borderRadius: "var(--radius-md)",
                }}
              >
                Đăng xuất
              </button>
            </form>
          </div>
        </div>

        {/* Subnav Tabs */}
        <div style={{ borderTop: "1px solid var(--color-border-subtle)", background: "rgba(255, 255, 255, 0.6)" }}>
          <div className="portal-container" style={{ paddingBottom: "0.25rem", paddingTop: "0.25rem" }}>
            <nav aria-label="Điều hướng cổng nhân viên">
              <ul className="nav-tab-list">
                <li>
                  <Link href="/roadmap" className="nav-tab-item">
                    <span>🗺️</span> Lộ Trình (Roadmap)
                  </Link>
                </li>
                <li>
                  <Link href="/resources" className="nav-tab-item">
                    <span>📚</span> Tài Nguyên (Resources)
                  </Link>
                </li>
                <li>
                  <Link href="/support" className="nav-tab-item">
                    <span>🤝</span> Danh Bạ Hỗ Trợ
                  </Link>
                </li>
                <li>
                  <Link href="/profile" className="nav-tab-item">
                    <span>👤</span> Hồ Sơ & Góp Ý
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="portal-container" style={{ flex: 1, paddingTop: "1.5rem" }}>
        {/* BANNER CHÀO MỪNG NHÂN VIÊN VỚI HÌNH TƯỢNG ONG MẬT LOGISTICS */}
        <WelcomeHeader
          displayName={sessionProfile.display_name}
          department={sessionProfile.department || "Vận hành Logistics"}
          position={sessionProfile.position || "Logistics Coordinator"}
          employeeCode={sessionProfile.employee_code}
        />

        {children}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--color-border)", background: "var(--color-bg-card)", padding: "1.25rem 0", marginTop: "3rem" }}>
        <div className="portal-container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            Bee Logistics Corporation · Hệ thống quản lý đào tạo & hội nhập nhân sự mới
          </p>
          <span className="muted" style={{ fontSize: "0.85rem", fontStyle: "italic" }}>
            Be expert in logistics
          </span>
        </div>
      </footer>
    </div>
  );
}
