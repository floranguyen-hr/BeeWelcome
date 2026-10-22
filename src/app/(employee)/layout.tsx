import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/actions/auth";
import { requireRole } from "@/features/auth/session";

export const dynamic = "force-dynamic";

export default async function EmployeeLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const profile = await requireRole("employee");

  return (
    <main className="page-shell">
      <header className="portal-header">
        <div>
          <p className="muted">Cổng nhân viên</p>
          <h1>Hành trình onboarding</h1>
          <p className="muted">Xin chào, {profile.display_name}</p>
        </div>
        <form action={signOut}>
          <button type="submit">Đăng xuất</button>
        </form>
      </header>
      <nav aria-label="Điều hướng nhân viên">
        <ul className="portal-links">
          <li><Link href="/roadmap">Roadmap</Link></li>
          <li><Link href="/resources">My Resources</Link></li>
          <li><Link href="/support">Support</Link></li>
          <li><Link href="/profile">My Profile</Link></li>
        </ul>
      </nav>
      {children}
    </main>
  );
}
