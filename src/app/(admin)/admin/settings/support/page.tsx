import { archiveSupportContact, saveSupportContact } from "@/features/admin-operations/actions";
import { requireRole } from "@/features/auth/session";
import { getSqlPool } from "@/lib/db/sqlserver";

type Contact = {
  id: string;
  display_name: string;
  support_role: string;
  scope_type: string;
  scope_value: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_url: string | null;
  is_active: boolean;
};

type Props = { searchParams: Promise<{ error?: string; saved?: string; archived?: string }> };

function ContactForm({ contact }: { contact?: Contact }) {
  return (
    <form action={saveSupportContact} className="form-grid">
      {contact && <input name="id" type="hidden" value={contact.id} />}
      <label className="field"><span>Họ & Tên đầu mối hỗ trợ</span><input defaultValue={contact?.display_name} maxLength={120} name="display_name" required placeholder="Ví dụ: Nguyễn Thị Loan" /></label>
      <label className="field"><span>Vai trò hỗ trợ</span><input defaultValue={contact?.support_role} maxLength={120} name="support_role" required placeholder="Ví dụ: Cán bộ Nhân sự phụ trách Hội nhập" /></label>
      <label className="field"><span>Phạm vi áp dụng</span><select defaultValue={contact?.scope_type ?? "company"} name="scope_type">
        <option value="company">Toàn công ty</option><option value="office">Theo văn phòng</option><option value="department">Theo phòng ban</option><option value="position">Theo chức danh</option><option value="group">Theo nhóm</option><option value="employee">Cá nhân nhân viên</option>
      </select></label>
      <label className="field"><span>Giá trị phạm vi (để trống nếu toàn công ty)</span><input defaultValue={contact?.scope_value ?? ""} maxLength={160} name="scope_value" placeholder="Ví dụ: HQ Hanoi hoặc Logistics" /></label>
      <label className="field"><span>Email liên hệ</span><input defaultValue={contact?.contact_email ?? ""} maxLength={320} name="contact_email" type="email" placeholder="hr.support@bee-logistics.com" /></label>
      <label className="field"><span>Số điện thoại</span><input defaultValue={contact?.contact_phone ?? ""} maxLength={80} name="contact_phone" placeholder="024 3822 xxxx" /></label>
      <label className="field form-wide"><span>Đường dẫn hỗ trợ (URL / Ticket link)</span><input defaultValue={contact?.contact_url ?? ""} maxLength={1000} name="contact_url" type="url" placeholder="https://support.bee-logistics.com" /></label>
      <div className="form-wide" style={{ marginTop: "0.5rem" }}>
        <button className="btn btn-primary" type="submit">
          {contact ? "Lưu thay đổi liên hệ ➔" : "+ Thêm liên hệ mới vào danh bạ"}
        </button>
      </div>
    </form>
  );
}

export default async function SupportDirectoryPage({ searchParams }: Props) {
  await requireRole("hr_admin");
  const params = await searchParams;
  const pool = await getSqlPool();

  const result = await pool.request().query(`
    SELECT 
      Id AS id, 
      DisplayName AS display_name, 
      SupportRole AS support_role, 
      ScopeType AS scope_type, 
      ScopeValue AS scope_value, 
      ContactEmail AS contact_email, 
      ContactPhone AS contact_phone, 
      ContactUrl AS contact_url, 
      IsActive AS is_active
    FROM app.SupportContacts
    WHERE IsActive = 1
    ORDER BY DisplayName ASC
  `);

  const contacts = result.recordset.map((c) => ({
    ...c,
    id: String(c.id),
    is_active: Boolean(c.is_active),
  })) as Contact[];

  return (
    <div className="stack" style={{ gap: "2rem" }}>
      <header className="card stack" style={{ gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className="badge badge-primary">Cấu Hình Doanh Nghiệp</span>
          <span className="badge badge-accent">Danh Bạ Hỗ Trợ</span>
        </div>
        <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Quản Lý Danh Bạ Đầu Mối Hỗ Trợ</h1>
        <p className="muted" style={{ margin: 0 }}>
          Nhân viên mới sẽ nhìn thấy các đầu mối hỗ trợ tương ứng với văn phòng và phòng ban trong hồ sơ của mình.
        </p>
        {params.saved && (
          <div className="notice notice-success" role="status">
            ✓ Đã lưu thông tin đầu mối hỗ trợ thành công.
          </div>
        )}
        {params.archived && (
          <div className="notice" role="status">
            Đã ngừng hiển thị đầu mối liên hệ.
          </div>
        )}
        {params.error && (
          <div className="notice notice-danger" role="alert">
            ⚠️ Không lưu được liên hệ. Vui lòng kiểm tra lại phạm vi và thông tin liên lạc.
          </div>
        )}
      </header>

      <article className="card stack" style={{ gap: "1.25rem" }}>
        <h2 style={{ fontSize: "1.25rem", color: "var(--color-primary)", margin: 0 }}>
          ➕ Thêm Đầu Mối Liên Hệ Mới
        </h2>
        <ContactForm />
      </article>

      {contacts.map((contact) => (
        <article className="card stack" key={contact.id} style={{ gap: "1.25rem" }}>
          <div className="flex-between" style={{ flexWrap: "wrap", gap: "1rem", borderBottom: "1px solid var(--color-border-subtle)", paddingBottom: "0.85rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <span className="badge badge-accent">{contact.support_role}</span>
                <span className="badge badge-primary">
                  {contact.scope_type === "company" ? "Toàn công ty" : `${contact.scope_type}: ${contact.scope_value}`}
                </span>
              </div>
              <h3 style={{ fontSize: "1.2rem", margin: 0, color: "var(--color-text-main)" }}>
                {contact.display_name}
              </h3>
            </div>
            {contact.is_active && (
              <form action={archiveSupportContact}>
                <input name="id" type="hidden" value={contact.id} />
                <button type="submit" className="btn btn-secondary" style={{ minHeight: "34px", padding: "0.3rem 0.85rem", fontSize: "0.82rem" }}>
                  Ngừng hiển thị ✕
                </button>
              </form>
            )}
          </div>
          <ContactForm contact={contact} />
        </article>
      ))}
    </div>
  );
}
