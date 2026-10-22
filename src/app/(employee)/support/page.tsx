import { requireRole } from "@/features/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SupportPage() {
  await requireRole("employee");
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return <p className="notice">Cần cấu hình Supabase để tải thông tin hỗ trợ.</p>;
  }

  const { data: contacts, error } = await supabase
    .from("support_contacts")
    .select("id, display_name, support_role, contact_email, contact_phone, contact_url")
    .eq("is_active", true)
    .order("display_name");
  if (error) throw new Error("Không tải được danh bạ hỗ trợ.");

  return (
    <section className="stack">
      <header className="card stack">
        <h2>Support</h2>
        <p className="muted">Hiển thị liên hệ đã được HR cấu hình cho phạm vi hồ sơ của bạn.</p>
      </header>
      {(contacts ?? []).length === 0 ? (
        <div className="card">
          <p>Chưa có liên hệ hỗ trợ được cấu hình cho bạn. Hãy trao đổi với HR qua kênh công ty hiện có.</p>
        </div>
      ) : (contacts ?? []).map((contact) => (
        <article className="card stack" key={contact.id}>
          <div>
            <h3>{contact.display_name}</h3>
            <p className="muted">{contact.support_role}</p>
          </div>
          {contact.contact_email && <p>Email: <a href={`mailto:${contact.contact_email}`}>{contact.contact_email}</a></p>}
          {contact.contact_phone && <p>Điện thoại: {contact.contact_phone}</p>}
          {contact.contact_url && /^https?:\/\//i.test(contact.contact_url) && (
            <p><a href={contact.contact_url} rel="noreferrer" target="_blank">Mở kênh hỗ trợ</a></p>
          )}
        </article>
      ))}
    </section>
  );
}
