"use client";

import { useState, useTransition } from "react";
import type { UserRecord } from "./types";
import {
  createUserByAdmin,
  deleteUserByAdmin,
  toggleUserStatus,
} from "./user-actions";

type UserManagementViewProps = {
  initialUsers: UserRecord[];
  currentAdminId: string;
};

export function UserManagementView({
  initialUsers,
  currentAdminId,
}: UserManagementViewProps) {
  const [users, setUsers] = useState<UserRecord[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: "success" | "danger";
    text: string;
  } | null>(null);

  // Form State for Add User
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"hr_admin" | "employee">("employee");
  const [employeeCode, setEmployeeCode] = useState("");
  const [department, setDepartment] = useState("Logistics Operations");
  const [office, setOffice] = useState("HQ Hanoi");
  const [position, setPosition] = useState("Logistics Coordinator");

  // Filtering
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.employee_code &&
        u.employee_code.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const adminCount = users.filter((u) => u.role === "hr_admin").length;
  const employeeCount = users.filter((u) => u.role === "employee").length;

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setFeedbackMessage(null);

    const formData = new FormData();
    formData.set("displayName", displayName);
    formData.set("email", email);
    formData.set("password", password);
    formData.set("role", role);
    formData.set("employeeCode", employeeCode);
    formData.set("department", department);
    formData.set("office", office);
    formData.set("position", position);

    startTransition(async () => {
      const res = await createUserByAdmin(null, formData);
      if (!res.success) {
        setFeedbackMessage({
          type: "danger",
          text: res.error || "Không thể tạo tài khoản.",
        });
        return;
      }

      setFeedbackMessage({
        type: "success",
        text: `Tạo tài khoản "${displayName}" (${email}) thành công!`,
      });
      setShowAddModal(false);
      // Reset form
      setDisplayName("");
      setEmail("");
      setPassword("");
      setEmployeeCode("");
    });
  }

  async function handleDelete(userId: string, userName: string) {
    if (
      !confirm(
        `Bạn có chắc chắn muốn XÓA vĩnh viễn tài khoản "${userName}"? Toàn bộ lộ trình và dữ liệu liên quan sẽ bị xóa!`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await deleteUserByAdmin(userId);
      if (!res.success) {
        setFeedbackMessage({
          type: "danger",
          text: res.error || "Không thể xóa tài khoản.",
        });
        return;
      }

      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setFeedbackMessage({
        type: "success",
        text: `Đã xóa tài khoản "${userName}" thành công!`,
      });
    });
  }

  async function handleToggleStatus(userId: string, currentStatus: boolean) {
    startTransition(async () => {
      const res = await toggleUserStatus(userId);
      if (!res.success) {
        setFeedbackMessage({
          type: "danger",
          text: res.error || "Không thể thay đổi trạng thái.",
        });
        return;
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, is_active: !currentStatus } : u,
        ),
      );
      setFeedbackMessage({
        type: "success",
        text: `Đã ${currentStatus ? "khóa" : "kích hoạt"} tài khoản thành công!`,
      });
    });
  }

  return (
    <div className="stack" style={{ gap: "1.5rem" }}>
      {/* Header & Quick Stats */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>
            Quản Lý Toàn Bộ Tài Khoản Hệ Thống
          </h1>
          <p className="muted" style={{ fontSize: "0.92rem", margin: 0 }}>
            Xem danh sách, thêm mới hoặc xóa tài khoản HR Admin và Nhân viên (CSDL SQL Server)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <span>➕</span>
          <span>Thêm Tài Khoản Mới</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
        }}
      >
        <div className="card" style={{ padding: "1.25rem" }}>
          <div className="muted" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
            TỔNG SỐ TÀI KHOẢN
          </div>
          <div
            style={{
              fontSize: "1.85rem",
              fontWeight: 800,
              color: "var(--color-primary)",
              marginTop: "4px",
            }}
          >
            {users.length}
          </div>
        </div>

        <div className="card" style={{ padding: "1.25rem" }}>
          <div className="muted" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
            QUẢN TRỊ VIÊN (HR ADMIN)
          </div>
          <div
            style={{
              fontSize: "1.85rem",
              fontWeight: 800,
              color: "var(--color-text-main)",
              marginTop: "4px",
            }}
          >
            {adminCount}
          </div>
        </div>

        <div className="card" style={{ padding: "1.25rem" }}>
          <div className="muted" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
            NHÂN VIÊN (USERS)
          </div>
          <div
            style={{
              fontSize: "1.85rem",
              fontWeight: 800,
              color: "#0284c7",
              marginTop: "4px",
            }}
          >
            {employeeCount}
          </div>
        </div>
      </div>

      {feedbackMessage && (
        <div
          className={`notice notice-${feedbackMessage.type}`}
          role="status"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <span>{feedbackMessage.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Modal / Card Form Thêm Tài Khoản Mới */}
      {showAddModal && (
        <div
          className="card"
          style={{
            border: "2px solid var(--color-primary)",
            padding: "1.5rem",
            backgroundColor: "#FFFDF9",
            animation: "fadeIn 0.2s ease-in-out",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.25rem",
            }}
          >
            <h2 style={{ fontSize: "1.25rem", margin: 0, color: "var(--color-primary)" }}>
              ➕ Thêm Tài Khoản Mới Vào Hệ Thống
            </h2>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="btn btn-secondary"
              style={{ minHeight: "32px", padding: "0.2rem 0.6rem" }}
            >
              Đóng ✕
            </button>
          </div>

          <form onSubmit={handleCreateUser} className="stack" style={{ gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Họ và tên <span style={{ color: "var(--color-primary)" }}>*</span>
                </label>
                <input
                  className="form-input"
                  required
                  type="text"
                  placeholder="Ví dụ: Lê Thị Mai"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Email <span style={{ color: "var(--color-primary)" }}>*</span>
                </label>
                <input
                  className="form-input"
                  required
                  type="email"
                  placeholder="mai.le@bee-logistics.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Mật khẩu khởi tạo <span style={{ color: "var(--color-primary)" }}>*</span>
                </label>
                <input
                  className="form-input"
                  required
                  type="password"
                  placeholder="Tối thiểu 6 ký tự"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Vai trò (Role) <span style={{ color: "var(--color-primary)" }}>*</span>
                </label>
                <select
                  className="form-input"
                  value={role}
                  onChange={(e) => setRole(e.target.value as "hr_admin" | "employee")}
                  style={{
                    fontWeight: 700,
                    color: role === "hr_admin" ? "var(--color-primary)" : "#0284c7",
                  }}
                >
                  <option value="employee">Nhân viên (User)</option>
                  <option value="hr_admin">Quản trị viên (HR Admin)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Mã nhân viên (Tùy chọn)</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Ví dụ: EMP102"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Phòng ban</label>
                <select
                  className="form-input"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  <option value="Human Resources">Phòng Nhân sự</option>
                  <option value="Logistics Operations">Vận hành Logistics</option>
                  <option value="Freight Forwarding">Giao nhận Vận tải</option>
                  <option value="Warehousing & Supply">Kho bãi & Cung ứng</option>
                  <option value="Sales & Customer Service">Kinh doanh & CSKH</option>
                  <option value="IT & Digital Systems">CNTT & Kỹ thuật số</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Văn phòng / Chi nhánh</label>
                <select
                  className="form-input"
                  value={office}
                  onChange={(e) => setOffice(e.target.value)}
                >
                  <option value="HQ Hanoi">Trụ sở Hà Nội</option>
                  <option value="Chi nhánh Đà Nẵng">Chi nhánh Đà Nẵng</option>
                  <option value="Chi nhánh TP.HCM">Chi nhánh TP.HCM</option>
                  <option value="Chi nhánh Hải Phòng">Chi nhánh Hải Phòng</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="btn btn-secondary"
                disabled={isPending}
              >
                Hủy bỏ
              </button>
              <button type="submit" className="btn btn-primary" disabled={isPending}>
                {isPending ? "Đang lưu vào SQL Server..." : "Xác Nhận Tạo Tài Khoản ➔"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bộ Lọc & Tìm Kiếm */}
      <div
        className="card"
        style={{
          padding: "1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: "260px" }}>
          <span style={{ fontSize: "1.1rem" }}>🔍</span>
          <input
            className="form-input"
            type="search"
            placeholder="Tìm theo tên, email, mã nhân viên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ margin: 0 }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className="muted" style={{ fontSize: "0.85rem" }}>
            Lọc vai trò:
          </span>
          <select
            className="form-input"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ margin: 0, minWidth: "150px" }}
          >
            <option value="all">Tất cả vai trò</option>
            <option value="hr_admin">Quản trị HR Admin</option>
            <option value="employee">Nhân viên (User)</option>
          </select>
        </div>
      </div>

      {/* Bảng Danh Sách Tài Khoản */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-responsive" style={{ border: "none" }}>
          <table className="table" style={{ margin: 0 }}>
            <thead>
              <tr style={{ background: "var(--color-bg-subtle)", textAlign: "left" }}>
                <th style={{ padding: "0.85rem 1rem" }}>Họ & Tên</th>
                <th style={{ padding: "0.85rem 1rem" }}>Email Doanh Nghiệp</th>
                <th style={{ padding: "0.85rem 1rem" }}>Vai Trò</th>
                <th style={{ padding: "0.85rem 1rem" }}>Phòng Ban & Vị Trí</th>
                <th style={{ padding: "0.85rem 1rem" }}>Văn Phòng</th>
                <th style={{ padding: "0.85rem 1rem" }}>Trạng Thái</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2.5rem" }} className="muted">
                    Không tìm thấy tài khoản nào phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrentAdmin =
                    user.id.toLowerCase() === currentAdminId.toLowerCase();
                  return (
                    <tr
                      key={user.id}
                      style={{
                        borderTop: "1px solid var(--color-border-subtle)",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              background:
                                user.role === "hr_admin"
                                  ? "var(--color-primary-light)"
                                  : "#e0f2fe",
                              color:
                                user.role === "hr_admin"
                                  ? "var(--color-primary)"
                                  : "#0284c7",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800,
                              fontSize: "0.88rem",
                            }}
                          >
                            {user.display_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <strong style={{ fontSize: "0.92rem", display: "block" }}>
                              {user.display_name}
                            </strong>
                            <span className="muted" style={{ fontSize: "0.75rem" }}>
                              {user.employee_code || "Chưa có mã"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.88rem" }}>
                        {user.email}
                      </td>

                      <td style={{ padding: "0.85rem 1rem" }}>
                        {user.role === "hr_admin" ? (
                          <span
                            className="badge badge-primary"
                            style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
                          >
                            ⭐ HR Admin
                          </span>
                        ) : (
                          <span
                            className="badge"
                            style={{
                              fontSize: "0.75rem",
                              padding: "0.25rem 0.6rem",
                              background: "#e0f2fe",
                              color: "#0369a1",
                            }}
                          >
                            👤 Nhân viên (User)
                          </span>
                        )}
                      </td>

                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem" }}>
                        <div>{user.department || "Chưa phân ban"}</div>
                        <span className="muted" style={{ fontSize: "0.78rem" }}>
                          {user.position || "—"}
                        </span>
                      </td>

                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem" }}>
                        {user.office || "HQ Hanoi"}
                      </td>

                      <td style={{ padding: "0.85rem 1rem" }}>
                        {user.is_active ? (
                          <span
                            className="badge badge-success"
                            style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem" }}
                          >
                            ✓ Hoạt động
                          </span>
                        ) : (
                          <span
                            className="badge"
                            style={{
                              fontSize: "0.72rem",
                              padding: "0.2rem 0.5rem",
                              background: "#f1f5f9",
                              color: "#64748b",
                            }}
                          >
                            ✕ Tạm khóa
                          </span>
                        )}
                      </td>

                      <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
                          {!isCurrentAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(user.id, user.is_active)}
                                className="btn btn-secondary"
                                disabled={isPending}
                                style={{
                                  minHeight: "30px",
                                  padding: "0.2rem 0.6rem",
                                  fontSize: "0.78rem",
                                }}
                                title={user.is_active ? "Tạm khóa tài khoản" : "Mở khóa tài khoản"}
                              >
                                {user.is_active ? "Khóa" : "Mở"}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDelete(user.id, user.display_name)}
                                className="btn btn-danger"
                                disabled={isPending}
                                style={{
                                  minHeight: "30px",
                                  padding: "0.2rem 0.6rem",
                                  fontSize: "0.78rem",
                                }}
                                title="Xóa tài khoản vĩnh viễn"
                              >
                                Xóa 🗑️
                              </button>
                            </>
                          )}

                          {isCurrentAdmin && (
                            <span className="muted" style={{ fontSize: "0.75rem", fontStyle: "italic" }}>
                              (Tài khoản hiện tại)
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
