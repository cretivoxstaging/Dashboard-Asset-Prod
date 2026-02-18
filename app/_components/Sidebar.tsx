"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

type NavLeaf = {
  kind: "leaf";
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
};

type NavGroup = {
  kind: "group";
  label: string;
  icon: React.ReactNode;
  children: Array<NavLeaf>;
};

type NavItem = NavLeaf | NavGroup;

function IconChevron(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (pathname === href) return true;
  return pathname.startsWith(href + "/");
}

const NAV: NavItem[] = [
  {
    kind: "leaf",
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <Image
        src="/sidebar/dashboard.svg"
        alt="Dashboard"
        width={20}
        height={20}
        className="h-5 w-5"
      />
    ),
  },
  {
    kind: "leaf",
    href: "/asset",
    label: "Asset",
    icon: (
      <Image
        src="/sidebar/camera.svg"
        alt="Asset"
        width={20}
        height={20}
        className="h-5 w-5"
      />
    ),
  },
  {
    kind: "leaf",
    href: "/report",
    label: "Report",
    icon: (
      <Image
        src="/sidebar/report.svg"
        alt="Report"
        width={20}
        height={20}
        className="h-5 w-5"
      />
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = React.useState(false);
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({
    Audience: true,
  });

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  // Hide sidebar on login page
  if (pathname === "/login") {
    return null;
  }

  const widthClass = collapsed ? "w-[72px]" : "w-[260px]";

  return (
    <aside
      className={[
        widthClass,
        "shrink-0 border-r border-black/10 bg-white",
      ].join(" ")}
    >
      <div className="flex h-16 items-center justify-between px-4">
        <div className={collapsed ? "mx-auto" : ""}>
          <img
            src="https://ik.imagekit.io/df125g9cz/Logo%20CRETIVOX/svgviewer-png-output.png"
            className={collapsed ? "hidden" : "block"}
          />
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className={[
            "grid h-9 w-9 place-items-center rounded-full border border-black/10",
            "bg-white text-black hover:bg-zinc-50 hover:text-black",
            collapsed ? "mx-auto" : "",
          ].join(" ")}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          <IconChevron
            className={[
              "h-5 w-5 transition-transform",
              collapsed ? "rotate-0" : "rotate-180",
            ].join(" ")}
          />
        </button>
      </div>

      <nav className="flex h-[calc(100%-4rem)] flex-col justify-between px-3 pb-6">
        <ul className="space-y-1">
          {NAV.map((item) => {
            if (item.kind === "leaf") {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={[
                      "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-zinc-100 text-black font-bold"
                        : "text-black hover:bg-zinc-100 hover:text-black font-semibold",
                      collapsed ? "justify-center px-2" : "",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "grid h-9 w-9 place-items-center rounded-md",
                        active
                          ? "text-black"
                          : "text-black group-hover:text-black",
                      ].join(" ")}
                    >
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <>
                        <span className="min-w-0 flex-1 truncate">
                          {item.label}
                        </span>
                        {item.badge ? (
                          <span className="grid h-6 min-w-6 place-items-center rounded-md bg-emerald-50 px-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30">
                            {item.badge}
                          </span>
                        ) : null}
                      </>
                    )}
                  </Link>
                </li>
              );
            }

            const groupOpen = !!openGroups[item.label];
            const anyChildActive = item.children.some((c) =>
              isActivePath(pathname, c.href),
            );

            return (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={() => {
                    if (collapsed) {
                      setCollapsed(false);
                      setOpenGroups((prev) => ({
                        ...prev,
                        [item.label]: true,
                      }));
                      return;
                    }
                    setOpenGroups((prev) => ({
                      ...prev,
                      [item.label]: !prev[item.label],
                    }));
                  }}
                  title={collapsed ? item.label : undefined}
                  className={[
                    "group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    anyChildActive
                      ? "bg-zinc-100 text-black"
                      : "text-black hover:bg-zinc-100 hover:text-black",
                    collapsed ? "justify-center px-2" : "",
                  ].join(" ")}
                  aria-expanded={collapsed ? undefined : groupOpen}
                >
                  <span
                    className={[
                      "grid h-9 w-9 place-items-center rounded-md",
                      anyChildActive
                        ? "text-black"
                        : "text-black group-hover:text-black",
                    ].join(" ")}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <>
                      <span className="min-w-0 flex-1 truncate">
                        {item.label}
                      </span>
                      <IconChevron
                        className={[
                          "h-4 w-4 text-black transition-transform",
                          groupOpen ? "rotate-90" : "rotate-0",
                        ].join(" ")}
                      />
                    </>
                  )}
                </button>

                {!collapsed && groupOpen ? (
                  <ul className="mt-1 space-y-1 pl-52px">
                    {item.children.map((child) => {
                      const active = isActivePath(pathname, child.href);
                      return (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className={[
                              "block rounded-md px-3 py-2 text-sm transition-colors",
                              active
                                ? "bg-white text-black ring-1 ring-black/5"
                                : "text-black hover:bg-white hover:text-black hover:ring-1 hover:ring-black/5",
                            ].join(" ")}
                          >
                            {child.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>

        {/* Logout button at the bottom */}
        <div>
          <button
            type="button"
            onClick={handleLogout}
            className={[
              "mt-4 flex w-full items-center gap-3 rounded-md px-3 py-1 text-sm transition-colors",
              "text-white  hover:text-white bg-black hover:bg-gray-500",
              collapsed ? "justify-center px-2" : "",
            ].join(" ")}
          >
            <span
              className={[
                "grid h-9 w-9 place-items-center rounded-md",
                "text-white group-hover:text-red-700",
              ].join(" ")}
            >
              <LogOut className="h-5 w-5" />
            </span>
            {!collapsed && (
              <span className="min-w-0 flex-1 truncate font-medium">
                Logout
              </span>
            )}
          </button>
          {!collapsed && (
            <p className="text-xs text-black text-center mt-3 ">
              Powered by <span className="font-bold italic">CRETECH</span>
            </p>
          )}
        </div>
      </nav>
    </aside>
  );
}
