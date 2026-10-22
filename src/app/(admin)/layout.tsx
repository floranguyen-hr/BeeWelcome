import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/actions/auth";
import { requireRole } from "@/features/auth/session";
import { BrandLogo } from "@/components/ui/BrandLogo";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const profile = await requireRole("hr_admin");

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--color-bg-canvas)" }}>
      {/* Top Navbar Kính Mờ */}
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
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <BrandLogo size="sm" href="/admin/dashboard" />
            <div style={{ height: "24px", width: "1px", background: "var(--color-border)" }} />
            <span className="badge badge-primary">
              Cổng Quản Trị HR
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ textAlign: "right" }}>
              <strong style={{ fontSize: "0.9rem", display: "block" }}>{profile.display_name}</strong>
              <span className="muted" style={{ fontSize: "0.75rem" }}>Quản trị viên Onboarding</span>
            </div>

            <form action={signOut}>
              <button
                type="submit"
                className="btn btn-secondary"
                style={{
                  minHeight: "36px",
                  padding: "0.4rem 0.85rem",
                  fontSize: "0.85rem",
                }}
              >
                Đăng xuất
              </button>
            </form>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ borderTop: "1px solid var(--color-border-subtle)", background: "rgba(255, 255, 255, 0.7)" }}>
          <div className="portal-container" style={{ paddingBottom: "0.25rem", paddingTop: "0.25rem" }}>
            <nav aria-label="Điều hướng HR Admin">
              <ul className="nav-tab-list" style={{ flexWrap: "wrap" }}>
                <li>
                  <Link href="/admin/dashboard" className="nav-tab-item">
                    📊 Tổng quan (Dashboard)
                  </Link>
                </li>
                <li>
                  <Link href="/admin/content" className="nav-tab-item">
                    📚 Kho nội dung (Content)
                  </Link>
                </li>
                <li>
                  <Link href="/admin/templates" className="nav-tab-item">
                    🛠️ Tạo lộ trình (Templates)
                  </Link>
                </li>
                <li>
                  <Link href="/admin/employees" className="nav-tab-item">
                    👥 Gán hành trình (Employees)
                  </Link>
                </li>
                <li>
                  <Link href="/admin/progress" className="nav-tab-item">
                    📈 Quản lý tiến độ
                  </Link>
                </li>
                <li>
                  <Link href="/admin/users" className="nav-tab-item">
                    👤 Quản lý tài khoản (Users)
                  </Link>
                </li>
                <li>
                  <Link href="/admin/settings/support" className="nav-tab-item">
                    ⚙️ Danh bạ hỗ trợ
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Admin Body */}
      <main className="portal-container" style={{ flex: 1, paddingTop: "1.75rem" }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--color-border)", background: "var(--color-bg-card)", padding: "1.25rem 0", marginTop: "3rem" }}>
        <div className="portal-container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            Hệ thống quản trị đào tạo nhân sự trực tuyến · Bee Logistics Internal HR Portal
          </p>
          <span className="muted" style={{ fontSize: "0.85rem", fontStyle: "italic" }}>
            Be expert in logistics
          </span>
        </div>
      </footer>
    </div>
  );
}
