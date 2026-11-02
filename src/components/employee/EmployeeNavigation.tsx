"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { BeeMascot } from "@/components/ui/BeeMascot";
import type { ReactNode } from "react";

type IconName = "home" | "roadmap" | "library" | "support";

function NavIcon({ name }: { name: IconName }) {
  const common = { width: 21, height: 21, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><path d="M9 21v-8h6v8" /></>,
    roadmap: <><circle cx="6" cy="5" r="2" /><circle cx="18" cy="19" r="2" /><path d="M8 5h7a4 4 0 0 1 0 8H9a4 4 0 0 0 0 8h7" /></>,
    library: <><path d="M12 7c-2.5-2-5.5-2-9-1v13c3.5-1 6.5-1 9 1 2.5-2 5.5-2 9-1V6c-3.5-1-6.5-1-9 1z" /><path d="M12 7v13" /></>,
    support: <><path d="M4 12a8 8 0 0 1 16 0" /><rect x="2" y="12" width="4" height="7" rx="2" /><rect x="18" y="12" width="4" height="7" rx="2" /><path d="M20 19a5 5 0 0 1-5 3h-3" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

const items: { href: string; label: string; icon: IconName }[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/roadmap", label: "Roadmap", icon: "roadmap" },
  { href: "/resources", label: "Learning Library", icon: "library" },
  { href: "/support", label: "Support", icon: "support" },
];

export function EmployeeNavigation() {
  const pathname = usePathname();
  return (
    <aside className="bw-sidebar" aria-label="Cổng nhân viên BeeWelcome">
      <div className="bw-sidebar-brand">
        <BrandLogo size="sm" href="/home" showTagline={false} />
        <strong>BeeWelcome</strong>
        <span>Employee Onboarding</span>
      </div>
      <nav className="bw-sidebar-nav" aria-label="Điều hướng nhân viên">
        {items.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link className={active ? "bw-nav-link is-active" : "bw-nav-link"} href={href} key={href} aria-current={active ? "page" : undefined}>
              <NavIcon name={icon} /><span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="bw-sidebar-foot">
        <BeeMascot size="lg" mood="happy" />
        <span>Bee Buddy luôn đồng hành cùng bạn!</span>
      </div>
    </aside>
  );
}
