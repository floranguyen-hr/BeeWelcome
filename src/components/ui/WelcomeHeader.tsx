import React from "react";
import { BeeMascot } from "@/components/ui/BeeMascot";

interface WelcomeHeaderProps {
  displayName: string;
  department?: string | null;
  position?: string | null;
  employeeCode?: string | null;
  startDate?: string | null;
}

export function WelcomeHeader({
  displayName,
  department,
  position,
  employeeCode,
}: WelcomeHeaderProps) {
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";

  return (
    <section className="welcome-banner" aria-labelledby="welcome-heading">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.5rem",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div style={{ maxWidth: "700px" }}>
          {/* Status Badges */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.65rem", flexWrap: "wrap" }}>
            <span className="badge badge-primary">
              ⭐ Cổng Tiếp Nhận & Hội Nhập Onboarding
            </span>
            {employeeCode && (
              <span className="badge badge-accent">
                Mã NV: {employeeCode}
              </span>
            )}
            <span className="badge" style={{ backgroundColor: "#F4F4F2", color: "#5A5A58" }}>
              Bee Logistics Group
            </span>
          </div>

          {/* Heading */}
          <h1
            id="welcome-heading"
            style={{
              fontSize: "clamp(1.6rem, 3.2vw, 2.15rem)",
              marginBottom: "0.5rem",
              lineHeight: 1.25,
            }}
          >
            {timeGreeting},{" "}
            <span style={{ color: "var(--color-primary)" }}>
              {displayName}
            </span>!
          </h1>

          {/* Subtitle */}
          <p
            style={{
              color: "var(--color-text-muted)",
              fontSize: "0.98rem",
              lineHeight: 1.6,
              maxWidth: "620px",
            }}
          >
            Chào mừng bạn gia nhập đội ngũ <strong>Bee Logistics</strong>. Hãy từng bước khám phá hành trình hội nhập, làm quen môi trường và bứt phá sự nghiệp tại vị trí{" "}
            <strong style={{ color: "var(--color-text-main)" }}>
              {position || "Thành viên mới"}
            </strong>
            {department ? ` — ${department}` : ""}!
          </p>
        </div>

        {/* Mascot Minh Họa Chính Hãng Có Chiều Sâu */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            padding: "0.75rem 1.25rem",
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(8px)",
            borderRadius: "var(--radius-xl)",
            border: "1px solid rgba(255, 90, 0, 0.2)",
            boxShadow: "0 8px 24px -4px rgba(255, 90, 0, 0.12)",
          }}
        >
          <BeeMascot size="md" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "0.9rem", color: "var(--color-primary)" }}>
              Bee Buddy
            </span>
            <span className="muted" style={{ fontSize: "0.78rem" }}>
              Bạn đồng hành 24/7
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
