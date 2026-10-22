import { submitUxFeedback } from "@/features/employee-profile/actions";
import { requireRole } from "@/features/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SearchParams = { feedback?: string };

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const sessionProfile = await requireRole("employee");
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return <p className="notice">Cần cấu hình Supabase để tải hồ sơ.</p>;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, employee_code, office, department, position, start_date")
    .eq("id", sessionProfile.id)
    .maybeSingle();
  if (error) throw new Error("Không tải được hồ sơ nhân viên.");
  if (!profile) return <p className="notice">Không tìm thấy hồ sơ của tài khoản.</p>;

  return (
    <section className="stack">
      <div className="card stack">
        <h2>Hồ sơ của tôi</h2>
        <p className="muted">Thông tin hồ sơ hiện chỉ đọc. Liên hệ HR nếu cần chỉnh sửa.</p>
        <dl className="profile-details">
          <div><dt>Họ tên</dt><dd>{profile.display_name}</dd></div>
          <div><dt>Email đăng nhập</dt><dd>{profile.email}</dd></div>
          <div><dt>Mã nhân viên demo</dt><dd>{profile.employee_code ?? "Chưa cập nhật"}</dd></div>
          <div><dt>Văn phòng</dt><dd>{profile.office ?? "Chưa cập nhật"}</dd></div>
          <div><dt>Phòng ban</dt><dd>{profile.department ?? "Chưa cập nhật"}</dd></div>
          <div><dt>Chức danh</dt><dd>{profile.position ?? "Chưa cập nhật"}</dd></div>
          <div><dt>Ngày bắt đầu</dt><dd>{profile.start_date ?? "Chưa cập nhật"}</dd></div>
        </dl>
      </div>

      <div className="card stack">
        <h3>Gửi phản hồi về website</h3>
        <p className="muted">
          Phản hồi này giúp cải thiện trải nghiệm và không phải hoạt động onboarding, không ảnh hưởng tiến độ.
        </p>
        {params.feedback === "sent" && <p role="status">Đã gửi phản hồi.</p>}
        {params.feedback === "invalid" && <p className="error-text" role="alert">Nội dung phản hồi cần có từ 1 đến 2.000 ký tự.</p>}
        {params.feedback === "error" && <p className="error-text" role="alert">Chưa gửi được phản hồi. Hãy thử lại.</p>}
        <form action={submitUxFeedback} className="form-grid">
          <label className="field">
            <span>Chủ đề</span>
            <select defaultValue="roadmap" name="category">
              <option value="roadmap">Roadmap</option>
              <option value="content">Nội dung</option>
              <option value="navigation">Điều hướng</option>
              <option value="accessibility">Khả năng tiếp cận</option>
              <option value="other">Khác</option>
            </select>
          </label>
          <label className="field form-wide">
            <span>Phản hồi</span>
            <textarea maxLength={2000} name="message" required rows={4} />
          </label>
          <button className="form-wide" type="submit">Gửi phản hồi</button>
        </form>
      </div>
    </section>
  );
}
