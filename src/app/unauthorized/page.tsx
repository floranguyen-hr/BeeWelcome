import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="page-shell">
      <section className="card stack">
        <h1>Không có quyền truy cập</h1>
        <p>Tài khoản hiện tại không được phép mở khu vực này.</p>
        <Link href="/login">Đăng nhập bằng tài khoản khác</Link>
      </section>
    </main>
  );
}
