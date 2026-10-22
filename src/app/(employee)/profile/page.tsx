import { submitUxFeedback } from "@/features/employee-profile/actions";
import { requireRole } from "@/features/auth/session";
import { getSqlPool, sql } from "@/lib/db/sqlserver";

type SearchParams = { feedback?: string };

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const sessionProfile = await requireRole("employee");
  const pool = await getSqlPool();

  const res = await pool
    .request()
    .input("userId", sql.UniqueIdentifier, sessionProfile.id)
    .query(`
      SELECT 
        Id AS id, 
        Email AS email, 
        DisplayName AS display_name, 
        EmployeeCode AS employee_code, 
        Office AS office, 
        Department AS department, 
        Position AS position, 
        CONVERT(NVARCHAR(10), StartDate, 23) AS start_date
      FROM app.Profiles
      WHERE Id = @userId
    `);

  const profile = res.recordset[0];
  if (!profile) return <div className="notice notice-danger">Không tìm thấy hồ sơ của tài khoản.</div>;

  return (
    <div className="stack" style={{ gap: "2rem" }}>
      {/* Thẻ Thông Tin Hồ Sơ Cá Nhân */}
      <section className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <span className="badge badge-primary">Thông Tin Nhân Viên</span>
          <span className="badge badge-accent">Chỉ Đọc</span>
        </div>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Hồ Sơ Của Bạn</h2>
        <p className="muted" style={{ fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          Thông tin được đồng bộ từ phòng Nhân sự. Nếu có sai sót về chức danh hoặc thông tin liên hệ, vui lòng báo lại với HR.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.25rem",
          }}
        >
          <div className="inset-card">
            <span className="muted" style={{ fontSize: "0.8rem", display: "block", marginBottom: "0.25rem" }}>Họ & Tên</span>
            <strong style={{ fontSize: "1.05rem", color: "var(--color-text-main)" }}>{profile.display_name}</strong>
          </div>

          <div className="inset-card">
            <span className="muted" style={{ fontSize: "0.8rem", display: "block", marginBottom: "0.25rem" }}>Email Doanh Nghiệp</span>
            <strong style={{ fontSize: "1rem", color: "var(--color-primary)" }}>{profile.email}</strong>
          </div>

          <div className="inset-card">
            <span className="muted" style={{ fontSize: "0.8rem", display: "block", marginBottom: "0.25rem" }}>Mã Nhân Viên</span>
            <strong style={{ fontSize: "1rem" }}>{profile.employee_code ?? "Chưa cấp"}</strong>
          </div>

          <div className="inset-card">
            <span className="muted" style={{ fontSize: "0.8rem", display: "block", marginBottom: "0.25rem" }}>Văn Phòng / Chi Nhánh</span>
            <strong style={{ fontSize: "1rem" }}>{profile.office ?? "Chưa phân bổ"}</strong>
          </div>

          <div className="inset-card">
            <span className="muted" style={{ fontSize: "0.8rem", display: "block", marginBottom: "0.25rem" }}>Phòng Ban</span>
            <strong style={{ fontSize: "1rem" }}>{profile.department ?? "Chưa cập nhật"}</strong>
          </div>

          <div className="inset-card">
            <span className="muted" style={{ fontSize: "0.8rem", display: "block", marginBottom: "0.25rem" }}>Vị Trí / Chức Danh</span>
            <strong style={{ fontSize: "1rem" }}>{profile.position ?? "Chưa cập nhật"}</strong>
          </div>
        </div>
      </section>

      {/* Thẻ Góp Ý Trải Nghiệm (UX Feedback) */}
      <section className="card">
        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.35rem" }}>Góp Ý Nâng Cao Trải Nghiệm Cổng Onboarding</h3>
        <p className="muted" style={{ fontSize: "0.9rem", marginBottom: "1.25rem" }}>
          Ý kiến của bạn là cơ sở để ban quản trị tối ưu hóa nội dung và giao diện hệ thống. Phản hồi này độc lập và không ảnh hưởng đến tiến độ đào tạo của bạn.
        </p>

        {params.feedback === "sent" && (
          <div className="notice" style={{ borderLeftColor: "var(--status-success)", backgroundColor: "var(--status-success-bg)", color: "var(--status-success)", marginBottom: "1.25rem" }}>
            ✨ <strong>Cảm ơn bạn!</strong> Phản hồi của bạn đã được gửi thành công đến đội ngũ vận hành.
          </div>
        )}
        {params.feedback === "invalid" && (
          <div className="notice notice-danger" role="alert" style={{ marginBottom: "1.25rem" }}>
            Nội dung phản hồi cần có độ dài từ 1 đến 2.000 ký tự.
          </div>
        )}
        {params.feedback === "error" && (
          <div className="notice notice-danger" role="alert" style={{ marginBottom: "1.25rem" }}>
            Không thể gửi phản hồi lúc này. Xin vui lòng thử lại sau.
          </div>
        )}

        <form action={submitUxFeedback} className="stack" style={{ gap: "1rem" }}>
          <div className="form-group" style={{ maxWidth: "360px", marginBottom: 0 }}>
            <label className="form-label" htmlFor="feedback-category">Chủ đề góp ý</label>
            <select id="feedback-category" defaultValue="roadmap" name="category" className="form-select">
              <option value="roadmap">Lộ trình nhiệm vụ (Roadmap)</option>
              <option value="content">Nội dung bài học & Quiz</option>
              <option value="navigation">Điều hướng & Tốc độ tải trang</option>
              <option value="accessibility">Giao diện & Khả năng tiếp cận</option>
              <option value="other">Góp ý khác</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="feedback-message">
              Nội dung góp ý <span style={{ color: "var(--color-primary)" }}>*</span>
            </label>
            <textarea
              id="feedback-message"
              maxLength={2000}
              name="message"
              required
              rows={4}
              className="form-textarea"
              placeholder="Chia sẻ cảm nhận, khó khăn hoặc đề xuất cải tiến của bạn về cổng đào tạo..."
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn btn-primary" style={{ padding: "0.65rem 1.75rem" }}>
              Gửi phản hồi đóng góp ➔
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
