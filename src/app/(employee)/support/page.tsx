import { requireRole } from "@/features/auth/session";
import { getSqlPool } from "@/lib/db/sqlserver";

export default async function SupportPage() {
  await requireRole("employee");
  const pool = await getSqlPool();

  const res = await pool.request().query(`
    SELECT 
      Id AS id, 
      DisplayName AS display_name, 
      SupportRole AS support_role, 
      ContactEmail AS contact_email, 
      ContactPhone AS contact_phone, 
      ContactUrl AS contact_url
    FROM app.SupportContacts
    WHERE IsActive = 1
    ORDER BY DisplayName ASC
  `);

  const contacts = res.recordset.map((c) => ({
    ...c,
    id: String(c.id),
  }));

  return (
    <div className="stack" style={{ gap: "1.75rem" }}>
      <header className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <span className="badge badge-accent">Đầu Mối Đồng Hành</span>
          <span className="badge badge-primary">Bee Logistics</span>
        </div>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>Danh Bạ Hỗ Trợ Nội Bộ</h2>
        <p className="muted" style={{ fontSize: "0.9rem" }}>
          Các đầu mối chuyên trách luôn sẵn sàng trợ giúp bạn giải quyết thắc mắc về chế độ, thiết bị, quy trình làm việc và đào tạo.
        </p>
      </header>

      {(contacts ?? []).length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📇</div>
          <h3>Chưa Có Đầu Mối Hỗ Trợ</h3>
          <p className="muted" style={{ maxWidth: "450px", margin: "0 auto" }}>
            Hiện chưa có thông tin liên hệ được cấu hình riêng cho phạm vi tài khoản của bạn. Xin vui lòng trao đổi trực tiếp với bộ phận HR chi nhánh.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
          {(contacts ?? []).map((contact) => (
            <article key={contact.id} className="card card-interactive stack" style={{ justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      backgroundColor: "var(--color-primary-light)",
                      color: "var(--color-primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.25rem",
                      fontWeight: 700,
                    }}
                  >
                    🤝
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", marginBottom: "2px" }}>{contact.display_name}</h3>
                    <span className="badge badge-primary">{contact.support_role}</span>
                  </div>
                </div>

                <div className="stack" style={{ gap: "0.5rem", fontSize: "0.9rem", marginTop: "1rem" }}>
                  {contact.contact_email && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span className="muted">✉️ Email:</span>
                      <a href={`mailto:${contact.contact_email}`} style={{ fontWeight: 600 }}>
                        {contact.contact_email}
                      </a>
                    </div>
                  )}
                  {contact.contact_phone && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span className="muted">📞 Hotline:</span>
                      <strong style={{ color: "var(--color-text-main)" }}>{contact.contact_phone}</strong>
                    </div>
                  )}
                </div>
              </div>

              {contact.contact_url && /^https?:\/\//i.test(contact.contact_url) && (
                <div style={{ marginTop: "1.25rem", paddingTop: "0.75rem", borderTop: "1px dashed var(--color-border)" }}>
                  <a
                    href={contact.contact_url}
                    rel="noreferrer"
                    target="_blank"
                    className="btn btn-secondary"
                    style={{ width: "100%", padding: "0.5rem", fontSize: "0.85rem" }}
                  >
                    Truy cập cổng trợ giúp trực tuyến ↗
                  </a>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
