"use client";

import Link from "next/link";

const pages = [
  { href: "/visuals/physics", label: "Physics model" },
  { href: "/visuals/architecture", label: "Systems architecture" },
  { href: "/faults", label: "Fault mapping" },
  { href: "/visuals/deployment", label: "Fleet deployment" },
  { href: "/dashboard", label: "Mission dashboard" },
  { href: "/materials", label: "Materials" },
  { href: "/references", label: "References" },
] as const;

export function PageNav({ current }: { current: (typeof pages)[number]["href"] }) {
  return (
    <nav className="flow-nav" aria-label="Pages">
      {pages.map((page) => (
        <Link key={page.href} href={page.href} aria-current={current === page.href ? "page" : undefined}>
          {page.label}
        </Link>
      ))}
    </nav>
  );
}
