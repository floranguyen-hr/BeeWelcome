import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/actions/auth";
import { requireRole } from "@/features/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const profile = await requireRole("hr_admin");

  return (
    <main className="page-shell">
      <header className="portal-header">
        <div>
          <p className="muted">HR Admin</p>
          <h1>Onboarding</h1>
          <p className="muted">Xin chào, {profile.display_name}</p>
        </div>
        <form action={signOut}>
          <button type="submit">Đăng xuất</button>
        </form>
      </header>
      <nav aria-label="Điều hướng HR Admin">
        <ul className="portal-links">
          <li><Link href="/admin/dashboard">Dashboard</Link></li>
          <li><Link href="/admin/content">Content Library</Link></li>
          <li><Link href="/admin/templates">Template Builder</Link></li>
          <li><Link href="/admin/employees">Nhân viên & giao hành trình</Link></li>
          <li><Link href="/admin/progress">Tiến độ</Link></li>
          <li><Link href="/admin/settings/support">Danh bạ hỗ trợ</Link></li>
        </ul>
      </nav>
      {children}
    </main>
  );
}
