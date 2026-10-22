import React from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/ui/BrandLogo";

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top Glassmorphism Navigation */}
      <header className="glass-panel" style={{ position: "sticky", top: 0, zIndex: 50 }}>
        <div
          className="page-container"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "0.75rem",
            paddingBottom: "0.75rem",
          }}
        >
          <BrandLogo size="md" href="/" />

          <nav aria-label="Điều hướng chính">
            <Link href="/login" className="btn btn-primary" style={{ padding: "0.55rem 1.25rem" }}>
              Đăng nhập cổng Onboarding
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Showcase Section */}
      <main className="page-container" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "3rem",
            alignItems: "center",
            padding: "3rem 0",
          }}
        >
          {/* Cột trái: Văn bản & CTA */}
          <div className="stack">
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
              <span className="badge badge-primary">Hệ Thống Hội Nhập Nhân Sự</span>
              <span className="badge badge-accent">Bee Logistics Vietnam</span>
            </div>

            <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.15 }}>
              Khởi đầu hành trình sự nghiệp vững chắc cùng{" "}
              <span style={{ color: "var(--color-primary)" }}>Bee Logistics</span>
            </h1>

            <p style={{ color: "var(--color-text-muted)", fontSize: "1.1rem", lineHeight: 1.6 }}>
              Cổng tiếp nhận và đào tạo trực tuyến dành riêng cho nhân viên mới. Theo dõi lộ trình nhiệm vụ, tiếp cận tài nguyên nghiệp vụ và kết nối với đồng nghiệp từ ngày đầu tiên.
            </p>

            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", paddingTop: "0.5rem" }}>
              <Link href="/login" className="btn btn-primary" style={{ padding: "0.75rem 1.75rem", fontSize: "1.05rem" }}>
                Vào Cổng Hội Nhập ➔
              </Link>
              <a href="#features" className="btn btn-secondary" style={{ padding: "0.75rem 1.5rem" }}>
                Tìm hiểu thêm
              </a>
            </div>

            {/* Micro metrics highlight */}
            <div
              style={{
                display: "flex",
                gap: "2rem",
                paddingTop: "1.5rem",
                borderTop: "1px solid var(--color-border)",
                marginTop: "1rem",
              }}
            >
              <div>
                <strong style={{ fontSize: "1.4rem", color: "var(--color-primary)", display: "block" }}>100%</strong>
                <span className="muted" style={{ fontSize: "0.85rem" }}>Đồng bộ số hóa lộ trình</span>
              </div>
              <div>
                <strong style={{ fontSize: "1.4rem", color: "var(--color-text-main)", display: "block" }}>2 Tuần</strong>
                <span className="muted" style={{ fontSize: "0.85rem" }}>Tiêu chuẩn hội nhập</span>
              </div>
              <div>
                <strong style={{ fontSize: "1.4rem", color: "var(--color-accent-dark)", display: "block" }}>24/7</strong>
                <span className="muted" style={{ fontSize: "0.85rem" }}>Đầu mối hỗ trợ nội bộ</span>
              </div>
            </div>
          </div>

          {/* Cột phải: Visual Card Showcase */}
          <div
            className="card"
            style={{
              padding: "2rem",
              background: "linear-gradient(145deg, #FFFFFF 0%, #FFFBF7 100%)",
              border: "1px solid rgba(255, 90, 0, 0.15)",
              boxShadow: "0 20px 40px -10px rgba(37, 37, 37, 0.08)",
            }}
          >
            <div className="flex-between" style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    background: "var(--color-primary-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-primary)",
                    fontWeight: 800,
                  }}
                >
                  🐝
                </div>
                <div>
                  <h3 style={{ fontSize: "1.05rem" }}>Lộ Trình Mẫu Của Bạn</h3>
                  <p className="muted" style={{ fontSize: "0.8rem" }}>2 Milestones · 5 Nhiệm Vụ</p>
                </div>
              </div>
              <span className="badge badge-success">Sẵn sàng</span>
            </div>

            {/* Mô phỏng Stepper mini */}
            <div className="stack" style={{ gap: "0.85rem" }}>
              <div className="inset-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ color: "var(--status-success)" }}>✓</span>
                  <div>
                    <strong style={{ fontSize: "0.9rem", display: "block" }}>Chào mừng & Văn hóa công ty</strong>
                    <span className="muted" style={{ fontSize: "0.75rem" }}>Tài liệu bài đọc · Đã đọc</span>
                  </div>
                </div>
                <span className="badge badge-success">Xong</span>
              </div>

              <div className="inset-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 1rem", borderColor: "var(--color-primary)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ color: "var(--color-primary)" }}>●</span>
                  <div>
                    <strong style={{ fontSize: "0.9rem", display: "block" }}>Nhận thức An toàn thông tin</strong>
                    <span className="muted" style={{ fontSize: "0.75rem" }}>Quiz trắc nghiệm · Đang diễn ra</span>
                  </div>
                </div>
                <span className="badge badge-primary">Làm ngay</span>
              </div>

              <div className="inset-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 1rem", opacity: 0.75 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ color: "var(--status-locked)" }}>🔒</span>
                  <div>
                    <strong style={{ fontSize: "0.9rem", display: "block" }}>Khảo sát tiếp nhận & Đồng phục</strong>
                    <span className="muted" style={{ fontSize: "0.75rem" }}>Biểu mẫu form · Mở ở tuần 2</span>
                  </div>
                </div>
                <span className="badge badge-locked">Khóa</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3 Trụ Cột Trải Nghiệm */}
        <section id="features" style={{ padding: "3rem 0 2rem" }}>
          <div style={{ textAlign: "center", maxWidth: "600px", margin: "0 auto 2.5rem" }}>
            <h2 style={{ marginBottom: "0.5rem" }}>Trải nghiệm Onboarding chuẩn 5 sao</h2>
            <p className="muted">Được thiết kế nhằm mang lại sự tự tin, hứng khởi và hỗ trợ toàn diện nhất cho thành viên mới.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
            <div className="card card-interactive">
              <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🗺️</div>
              <h3 style={{ marginBottom: "0.5rem" }}>Lộ Trình Minh Bạch</h3>
              <p className="muted" style={{ fontSize: "0.9rem" }}>
                Từng giai đoạn, từng nhiệm vụ và mốc thời hạn được bố trí trực quan theo trục thời gian, giúp bạn luôn chủ động trong công việc.
              </p>
            </div>

            <div className="card card-interactive">
              <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>📚</div>
              <h3 style={{ marginBottom: "0.5rem" }}>Thư Viện Tài Nguyên</h3>
              <p className="muted" style={{ fontSize: "0.9rem" }}>
                Tất cả quy trình, chính sách, tài liệu bảo mật và cẩm nang vận hành logistics luôn sẵn sàng cho bạn tra cứu bất kỳ lúc nào.
              </p>
            </div>

            <div className="card card-interactive">
              <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🤝</div>
              <h3 style={{ marginBottom: "0.5rem" }}>Đồng Hành & Hỗ Trợ</h3>
              <p className="muted" style={{ fontSize: "0.9rem" }}>
                Danh bạ các đầu mối chuyên trách Nhân sự, IT Helpdesk và Quản lý phòng ban giúp bạn được giải đáp thắc mắc ngay lập tức.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--color-border)", background: "var(--color-bg-card)", padding: "1.5rem 0" }}>
        <div className="page-container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            © {new Date().getFullYear()} Bee Logistics Corporation. Bản quyền hệ thống đào tạo nội bộ BeeWelcome.
          </p>
          <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.85rem" }}>
            <Link href="/login" className="muted">Cổng Đăng Nhập</Link>
            <span className="muted">Be expert in logistics</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
