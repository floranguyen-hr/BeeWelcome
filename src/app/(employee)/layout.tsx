import type { ReactNode } from "react";
import { signOut } from "@/app/actions/auth";
import { requireRole } from "@/features/auth/session";
import { EmployeeNavigation } from "@/components/employee/EmployeeNavigation";
import "./employee-workspace.css";

export const dynamic = "force-dynamic";

export default async function EmployeeLayout({ children }: Readonly<{ children: ReactNode }>) {
  const profile = await requireRole("employee");
  const initials = profile.display_name.trim().split(/\s+/).slice(-2).map((part) => part[0]?.toUpperCase()).join("");
  return (
    <div className="bw-workspace">
      <a className="bw-skip-link" href="#bw-main">Bỏ qua menu</a>
      <EmployeeNavigation />
      <div className="bw-workspace-body">
        <header className="bw-topbar">
          <div className="bw-topbar-title">BeeWelcome <span>/ Employee Portal</span></div>
          <div className="bw-topbar-user">
            <span className="bw-mini-avatar" aria-hidden="true">{initials || "B"}</span>
            <span className="bw-user-name">{profile.display_name}</span>
            <form action={signOut}><button className="bw-logout" type="submit">Đăng xuất</button></form>
          </div>
        </header>
        <main id="bw-main" className="bw-page">
          {children}
        </main>
        <footer className="bw-copyright">Bee Logistics Corporation · Be expert in logistics</footer>
      </div>
    </div>
  );
}
