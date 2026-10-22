import { archiveSupportContact, saveSupportContact } from "@/features/admin-operations/actions";
import { requireRole } from "@/features/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
      <label className="field"><span>Tên hiển thị</span><input defaultValue={contact?.display_name} maxLength={120} name="display_name" required /></label>
      <label className="field"><span>Vai trò hỗ trợ</span><input defaultValue={contact?.support_role} maxLength={120} name="support_role" required /></label>
      <label className="field"><span>Phạm vi</span><select defaultValue={contact?.scope_type ?? "company"} name="scope_type">
        <option value="company">Toàn công ty</option><option value="office">Văn phòng</option><option value="department">Phòng ban</option><option value="position">Chức danh</option><option value="group">Nhóm</option><option value="employee">Nhân viên</option>
      </select></label>
      <label className="field"><span>Giá trị phạm vi (để trống nếu toàn công ty)</span><input defaultValue={contact?.scope_value ?? ""} maxLength={160} name="scope_value" /></label>
      <label className="field"><span>Email</span><input defaultValue={contact?.contact_email ?? ""} maxLength={320} name="contact_email" type="email" /></label>
      <label className="field"><span>Điện thoại</span><input defaultValue={contact?.contact_phone ?? ""} maxLength={80} name="contact_phone" /></label>
      <label className="field form-wide"><span>URL hỗ trợ (HTTPS/HTTP)</span><input defaultValue={contact?.contact_url ?? ""} maxLength={1000} name="contact_url" type="url" /></label>
      <button className="form-wide" type="submit">{contact ? "Lưu thay đổi" : "Thêm liên hệ"}</button>
    </form>
  );
}

export default async function SupportDirectoryPage({ searchParams }: Props) {
  await requireRole("hr_admin");
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <p className="notice">Cần cấu hình Supabase để quản lý danh bạ.</p>;

  const { data, error } = await supabase
    .from("support_contacts")
    .select("id, display_name, support_role, scope_type, scope_value, contact_email, contact_phone, contact_url, is_active")
    .eq("is_active", true)
    .order("is_active", { ascending: false })
    .order("display_name");
  if (error) throw new Error("Không tải được danh bạ hỗ trợ.");
  const contacts = (data ?? []) as Contact[];

  return (
    <section className="stack">
      <header className="card stack">
        <h2>Danh bạ hỗ trợ</h2>
        <p className="muted">Nhân viên chỉ đọc liên hệ đang hoạt động trong phạm vi hồ sơ của mình. Dữ liệu danh bạ do HR nhập.</p>
        {params.saved && <p role="status">Đã lưu liên hệ.</p>}
        {params.archived && <p role="status">Đã ngừng hiển thị liên hệ.</p>}
        {params.error && <p className="error-text" role="alert">Không lưu được liên hệ. Kiểm tra phạm vi và thông tin liên lạc.</p>}
      </header>
      <article className="card stack"><h3>Thêm liên hệ</h3><ContactForm /></article>
      {contacts.map((contact) => (
        <article className="card stack" key={contact.id}>
          <div className="portal-header"><div><h3>{contact.display_name}</h3><p className="muted">{contact.scope_type === "company" ? "Toàn công ty" : `${contact.scope_type}: ${contact.scope_value}`} · {contact.is_active ? "Đang hoạt động" : "Đã lưu trữ"}</p></div>
            {contact.is_active && <form action={archiveSupportContact}><input name="id" type="hidden" value={contact.id} /><button type="submit">Ngừng hiển thị</button></form>}
          </div>
          <ContactForm contact={contact} />
        </article>
      ))}
    </section>
  );
}
