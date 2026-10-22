import Link from "next/link";

export default function Home() {
  return (
    <main className="page-shell">
      <section className="card stack">
        <p className="muted">Bee Logistics · Onboarding prototype</p>
        <h1>Chào mừng đến với hành trình hội nhập</h1>
        <p>
          Bản thử nghiệm dùng tài khoản và dữ liệu giả lập để kiểm chứng luồng
          onboarding.
        </p>
        <p>
          <Link className="button-link" href="/login">
            Đăng nhập
          </Link>
        </p>
      </section>
    </main>
  );
}
