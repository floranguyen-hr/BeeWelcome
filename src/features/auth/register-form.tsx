"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function RegisterForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [department, setDepartment] = useState("Logistics Operations");
  const [office, setOffice] = useState("Chi nhánh Đà Nẵng");
  const [position, setPosition] = useState("Logistics Coordinator");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!displayName || !email || !password || !confirmPassword) {
      setMessage("Vui lòng điền đầy đủ tất cả các trường bắt buộc (*).");
      return;
    }

    if (password.length < 6) {
      setMessage("Mật khẩu phải có độ dài từ 6 ký tự trở lên.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          email,
          password,
          confirmPassword,
          department,
          office,
          position,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setMessage(data.error || "Đăng ký không thành công.");
        setIsSubmitting(false);
        return;
      }

      window.location.href = data.redirectUrl || "/roadmap";
    } catch (err) {
      console.error("Register error:", err);
      setMessage("Không thể kết nối đến máy chủ đăng ký.");
      setIsSubmitting(false);
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit} style={{ gap: "1rem" }}>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="name-input">
          Họ và tên nhân viên <span style={{ color: "var(--color-primary)" }}>*</span>
        </label>
        <input
          id="name-input"
          className="form-input"
          disabled={isSubmitting}
          required
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Ví dụ: Hoàng Minh Tuấn"
        />
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="email-input">
          Email liên hệ / doanh nghiệp <span style={{ color: "var(--color-primary)" }}>*</span>
        </label>
        <input
          id="email-input"
          className="form-input"
          autoComplete="email"
          disabled={isSubmitting}
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="hoang.tuan@bee-logistics.com"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="dept-input">
            Phòng ban
          </label>
          <select
            id="dept-input"
            className="form-input"
            disabled={isSubmitting}
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="Logistics Operations">Vận hành Logistics</option>
            <option value="Freight Forwarding">Giao nhận Vận tải</option>
            <option value="Warehousing & Supply">Kho vận & Cung ứng</option>
            <option value="Sales & Customer Service">Kinh doanh & CSKH</option>
            <option value="Finance & Accounting">Tài chính - Kế toán</option>
            <option value="IT & Digital Systems">CNTT & Hệ thống số</option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="office-input">
            Văn phòng làm việc
          </label>
          <select
            id="office-input"
            className="form-input"
            disabled={isSubmitting}
            value={office}
            onChange={(e) => setOffice(e.target.value)}
          >
            <option value="HQ Hanoi">Trụ sở Hà Nội</option>
            <option value="Chi nhánh Đà Nẵng">Chi nhánh Đà Nẵng</option>
            <option value="Chi nhánh TP.HCM">Chi nhánh TP. Hồ Chí Minh</option>
            <option value="Chi nhánh Hải Phòng">Chi nhánh Hải Phòng</option>
            <option value="Chi nhánh Quy Nhơn">Chi nhánh Quy Nhơn</option>
          </select>
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="pos-input">
          Vị trí công tác
        </label>
        <input
          id="pos-input"
          className="form-input"
          disabled={isSubmitting}
          type="text"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          placeholder="Ví dụ: Chuyên viên chứng từ / Logistics Coordinator"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="password-input">
            Mật khẩu <span style={{ color: "var(--color-primary)" }}>*</span>
          </label>
          <input
            id="password-input"
            className="form-input"
            autoComplete="new-password"
            disabled={isSubmitting}
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tối thiểu 6 ký tự"
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="confirm-password-input">
            Xác nhận mật khẩu <span style={{ color: "var(--color-primary)" }}>*</span>
          </label>
          <input
            id="confirm-password-input"
            className="form-input"
            autoComplete="new-password"
            disabled={isSubmitting}
            required
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Nhập lại mật khẩu"
          />
        </div>
      </div>

      {message && (
        <div className="notice notice-danger" role="alert" style={{ fontSize: "0.88rem", padding: "0.75rem 1rem" }}>
          ⚠️ {message}
        </div>
      )}

      <div
        style={{
          backgroundColor: "var(--color-bg-subtle)",
          padding: "0.6rem 0.85rem",
          borderRadius: "var(--radius-md)",
          fontSize: "0.78rem",
          color: "var(--color-text-muted)",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <span>🛡️</span>
        <span>
          Quyền truy cập tài khoản: <strong>Nhân viên Onboarding (User)</strong>. Lộ trình học tập chuẩn sẽ tự động khởi tạo ngay sau khi đăng ký.
        </span>
      </div>

      <button
        className="btn btn-primary"
        disabled={isSubmitting}
        type="submit"
        style={{ width: "100%", padding: "0.85rem", fontSize: "1rem", marginTop: "0.25rem" }}
      >
        {isSubmitting ? "Đang khởi tạo tài khoản..." : "Hoàn Tất Đăng Ký & Vào Onboarding ➔"}
      </button>

      <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
        <span className="muted" style={{ fontSize: "0.88rem" }}>
          Đã có tài khoản nhân viên?{" "}
        </span>
        <Link
          href="/login"
          style={{
            color: "var(--color-primary)",
            fontWeight: 700,
            fontSize: "0.88rem",
            textDecoration: "underline",
          }}
        >
          Đăng nhập ngay
        </Link>
      </div>
    </form>
  );
}
