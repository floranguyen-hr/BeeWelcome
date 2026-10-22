"use client";

import { useState, useEffect, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginAction } from "@/app/actions/auth";

type LoginFormProps = {
  enabled?: boolean;
};

// 2 Tài khoản demo chính thức đã được seed trong CSDL SQL Server BeeWelcomeDB
const DEMO_ACCOUNTS = [
  {
    role: "Quản trị HR Admin",
    email: "admin@bee-logistics.com",
    password: "Admin@123",
    desc: "HR Administrator · Quản lý toàn bộ hệ thống, lộ trình, tài khoản",
    badge: "badge-primary",
  },
  {
    role: "Nhân viên mới (User)",
    email: "user@bee-logistics.com",
    password: "User@123",
    desc: "Nguyễn Văn An · Logistics Coordinator · Học lộ trình Onboarding",
    badge: "badge-accent",
  },
];

export function LoginForm({ enabled = true }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      const btn = target?.closest(".demo-card") as HTMLElement | null;
      if (btn) {
        const em = btn.getAttribute("data-demo-email") || "";
        const pw = btn.getAttribute("data-demo-pass") || "";
        if (em && pw) {
          setEmail(em);
          setPassword(pw);
          const emailEl = document.getElementById("email-input") as HTMLInputElement;
          const passEl = document.getElementById("password-input") as HTMLInputElement;
          if (emailEl) emailEl.value = em;
          if (passEl) passEl.value = pw;
        }
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const handleQuickSelect = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setMessage("");
    if (typeof document !== "undefined") {
      const emailEl = document.getElementById("email-input") as HTMLInputElement;
      const passEl = document.getElementById("password-input") as HTMLInputElement;
      if (emailEl) emailEl.value = demoEmail;
      if (passEl) passEl.value = demoPass;
    }
  };

  async function handleLogin() {
    setMessage("");

    const emailEl = document.getElementById("email-input") as HTMLInputElement;
    const passEl = document.getElementById("password-input") as HTMLInputElement;
    const formEmail = (email || emailEl?.value || "").trim();
    const formPassword = password || passEl?.value || "";

    if (!formEmail || !formPassword) {
      setMessage("Vui lòng điền đầy đủ email và mật khẩu.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formEmail, password: formPassword }),
      });

      const data = await res.json();

      if (!data.success) {
        setMessage(data.error || "Đăng nhập không thành công.");
        setIsSubmitting(false);
        return;
      }

      window.location.href = data.redirectUrl || "/roadmap";
    } catch (err) {
      console.error("Login fetch error:", err);
      setMessage("Không thể kết nối đến máy chủ đăng nhập.");
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLogin();
    }
  }

  return (
    <div className="stack" style={{ gap: "1.5rem" }}>
      <div className="stack" style={{ gap: "1rem" }} onKeyDown={handleKeyDown}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="email-input">
            Email doanh nghiệp <span style={{ color: "var(--color-primary)" }}>*</span>
          </label>
          <input
            id="email-input"
            className="form-input"
            autoComplete="username"
            disabled={!enabled || isSubmitting}
            name="email"
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@bee-logistics.com hoặc user@bee-logistics.com"
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
            <label className="form-label" htmlFor="password-input" style={{ marginBottom: 0 }}>
              Mật khẩu tài khoản <span style={{ color: "var(--color-primary)" }}>*</span>
            </label>
            <span className="muted" style={{ fontSize: "0.78rem" }}>
              Tối thiểu 6 ký tự
            </span>
          </div>
          <input
            id="password-input"
            className="form-input"
            autoComplete="current-password"
            disabled={!enabled || isSubmitting}
            name="password"
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
          />
        </div>

        {message && (
          <div className="notice notice-danger" role="alert" style={{ fontSize: "0.88rem", padding: "0.75rem 1rem" }}>
            ⚠️ {message}
          </div>
        )}

        <button
          className="btn btn-primary"
          disabled={!enabled || isSubmitting}
          type="button"
          onClick={handleLogin}
          style={{ width: "100%", padding: "0.85rem", fontSize: "1rem", marginTop: "0.35rem" }}
        >
          {isSubmitting ? "Đang xác thực thông tin..." : "Đăng Nhập Cổng Onboarding ➔"}
        </button>

        <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
          <span className="muted" style={{ fontSize: "0.88rem" }}>
            Chưa có tài khoản nhân viên?{" "}
          </span>
          <Link
            href="/register"
            style={{
              color: "var(--color-primary)",
              fontWeight: 700,
              fontSize: "0.88rem",
              textDecoration: "underline",
            }}
          >
            Đăng ký tài khoản mới ngay
          </Link>
        </div>
      </div>

      {/* QUICK DEMO ACCOUNT SWITCHER - 2 TÀI KHOẢN CHÍNH THỨC */}
      <div
        style={{
          borderTop: "1px dashed var(--color-border)",
          paddingTop: "1.25rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <p style={{ fontSize: "0.85rem", fontWeight: 700, margin: 0, color: "var(--color-text-main)" }}>
            ⚡ Bấm để điền nhanh tài khoản kiểm thử:
          </p>
          <span className="badge badge-accent" style={{ fontSize: "0.7rem" }}>
            SQL Server Ready
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {DEMO_ACCOUNTS.map((acc) => {
            const isSelected = email === acc.email;
            return (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleQuickSelect(acc.email, acc.password)}
                className={`demo-card ${isSelected ? "selected" : ""}`}
                data-demo-email={acc.email}
                data-demo-pass={acc.password}
                style={{
                  border: isSelected ? "2px solid var(--color-primary)" : "1.5px solid var(--color-border)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "1.1rem" }}>{acc.role.includes("Admin") ? "👑" : "🐝"}</span>
                    <strong style={{ fontSize: "0.95rem", color: isSelected ? "var(--color-primary)" : "var(--color-text-main)" }}>
                      {acc.role}
                    </strong>
                  </div>
                  <span className={`badge ${isSelected ? "badge-primary" : acc.badge}`} style={{ fontSize: "0.72rem", padding: "0.2rem 0.55rem" }}>
                    {isSelected ? "Đã điền ✓" : "Bấm để chọn"}
                  </span>
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", marginTop: "0.35rem", lineHeight: 1.45 }}>
                  {acc.desc}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "0.45rem", fontSize: "0.78rem" }}>
                  <span style={{ color: "var(--color-text-main)", fontWeight: 600 }}>
                    📧 {acc.email}
                  </span>
                  <span style={{ color: "var(--color-primary)", fontWeight: 700 }}>
                    🔑 Mật khẩu: {acc.password}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
